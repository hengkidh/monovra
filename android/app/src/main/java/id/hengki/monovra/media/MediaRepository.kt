package id.hengki.monovra.media

import android.app.PendingIntent
import android.content.ComponentName
import android.content.Context
import android.content.pm.PackageManager
import android.media.MediaMetadata
import android.media.session.MediaController
import android.media.session.MediaSessionManager
import android.media.session.PlaybackState
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.util.Log
import androidx.core.app.NotificationManagerCompat
import id.hengki.monovra.apps.AppRepository
import id.hengki.monovra.apps.KnownApps
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject

/** Snapshot of the selected media session, serialised for the WebView. */
data class MusicState(
    val permissionGranted: Boolean,
    val hasSession: Boolean = false,
    val sourcePackage: String? = null,
    val sourceLabel: String? = null,
    val title: String? = null,
    val artist: String? = null,
    val album: String? = null,
    val artworkUrl: String? = null,
    val playback: String = "none",
    val positionMs: Long = 0,
    val durationMs: Long = -1,
    val speed: Float = 1f,
    val capturedAt: Long = System.currentTimeMillis(),
    val canPlayPause: Boolean = false,
    val canNext: Boolean = false,
    val canPrevious: Boolean = false,
) {
    fun toJson(): JSONObject = JSONObject()
        .put("permission", if (permissionGranted) "granted" else "denied")
        .put("hasSession", hasSession)
        .put("source", if (sourcePackage == null) JSONObject.NULL else
            JSONObject().put("packageName", sourcePackage).put("label", sourceLabel ?: sourcePackage))
        .put("title", title ?: JSONObject.NULL)
        .put("artist", artist ?: JSONObject.NULL)
        .put("album", album ?: JSONObject.NULL)
        .put("artwork", artworkUrl ?: JSONObject.NULL)
        .put("playback", playback)
        .put("positionMs", positionMs)
        .put("durationMs", durationMs)
        .put("speed", speed.toDouble())
        .put("capturedAt", capturedAt)
        .put("actions", JSONObject()
            .put("playPause", canPlayPause)
            .put("next", canNext)
            .put("previous", canPrevious))
}

/**
 * Event-driven media session integration.
 *
 * Uses MediaSessionManager (requires Notification Access) and MediaController
 * callbacks. There is no polling: state is pushed when sessions, metadata or
 * playback state change. Listening only happens while MONOVRA is visible.
 */
class MediaRepository(
    private val context: Context,
    private val scope: CoroutineScope,
    private val apps: AppRepository,
    private val preferredPackage: () -> String?,
) {
    private val main = Handler(Looper.getMainLooper())
    private val sessionManager = context.getSystemService(MediaSessionManager::class.java)
    private val listenerComponent = ComponentName(context, MediaNotificationListener::class.java)
    private val artwork = ArtworkStore(context.contentResolver)

    private val _state = MutableStateFlow(MusicState(permissionGranted = hasAccess()))
    val state: StateFlow<MusicState> = _state

    private var started = false
    private var sessionsListenerRegistered = false
    private val callbacks = mutableMapOf<MediaController, MediaController.Callback>()
    private var selected: MediaController? = null
    private var artworkJob: Job? = null
    private var artworkUrl: String? = null

    fun artworkBytes(token: Long): ByteArray? = artwork.bytesFor(token)

    fun hasAccess(): Boolean =
        NotificationManagerCompat.getEnabledListenerPackages(context).contains(context.packageName)

    private val sessionsListener = MediaSessionManager.OnActiveSessionsChangedListener { list ->
        updateControllers(list.orEmpty())
    }

    /** Call from Activity.onStart. */
    fun start() {
        started = true
        attach()
    }

    /** Call from Activity.onStop (also covers head-unit sleep). */
    fun stop() {
        started = false
        detach()
    }

    /** Notification Access was granted or revoked. */
    fun onAccessChanged() = main.post {
        if (!started) return@post
        detach()
        attach()
    }

    private var lastAccess: Boolean? = null

    /** Re-attaches only if Notification Access changed (e.g. back from Settings). */
    fun checkAccess() {
        val now = hasAccess()
        if (now != lastAccess) onAccessChanged()
    }

    fun refreshSelection() = main.post { if (started) reselect() }

    private fun attach() {
        lastAccess = hasAccess()
        if (lastAccess != true) {
            publish(MusicState(permissionGranted = false))
            return
        }
        try {
            if (!sessionsListenerRegistered) {
                sessionManager.addOnActiveSessionsChangedListener(sessionsListener, listenerComponent, main)
                sessionsListenerRegistered = true
            }
            updateControllers(sessionManager.getActiveSessions(listenerComponent))
        } catch (e: SecurityException) {
            Log.w(TAG, "Media session access denied", e)
            detach()
            publish(MusicState(permissionGranted = false))
        }
    }

    private fun detach() {
        if (sessionsListenerRegistered) {
            try { sessionManager.removeOnActiveSessionsChangedListener(sessionsListener) } catch (_: Exception) { }
            sessionsListenerRegistered = false
        }
        callbacks.forEach { (c, cb) -> c.unregisterCallback(cb) }
        callbacks.clear()
        selected = null
        artworkJob?.cancel()
    }

    private fun updateControllers(list: List<MediaController>) {
        val incoming = list.associateBy { it.sessionToken }
        // Unregister sessions that went away.
        callbacks.keys.filter { it.sessionToken !in incoming }.forEach { c ->
            callbacks.remove(c)?.let { c.unregisterCallback(it) }
        }
        // Register new ones.
        val known = callbacks.keys.map { it.sessionToken }.toSet()
        list.filter { it.sessionToken !in known }.forEach { c ->
            val cb = object : MediaController.Callback() {
                override fun onPlaybackStateChanged(state: PlaybackState?) = reselect()
                override fun onMetadataChanged(metadata: MediaMetadata?) {
                    if (c.sessionToken == selected?.sessionToken) loadArtwork(c)
                    reselect()
                }
                override fun onSessionDestroyed() {
                    callbacks.remove(c)?.let { c.unregisterCallback(it) }
                    reselect()
                }
            }
            c.registerCallback(cb, main)
            callbacks[c] = cb
        }
        reselect()
    }

    /**
     * Selection rule:
     *  1. sessions that are currently playing win over paused ones;
     *  2. within a group: user-preferred app, then YouTube Music, then the
     *     previously selected session, then the first reported by Android.
     */
    private fun reselect() {
        val controllers = callbacks.keys.toList()
        val preferred = preferredPackage()
        fun rank(list: List<MediaController>): MediaController? =
            list.firstOrNull { it.packageName == preferred }
                ?: list.firstOrNull { it.packageName == KnownApps.YOUTUBE_MUSIC }
                ?: list.firstOrNull { it.sessionToken == selected?.sessionToken }
                ?: list.firstOrNull()

        val playing = controllers.filter { it.playbackState?.state.isActivePlayback() }
        val next = rank(playing) ?: rank(controllers)

        if (next?.sessionToken != selected?.sessionToken) {
            selected = next
            artworkUrl = null
            artwork.clear()
            if (next != null) loadArtwork(next)
        }
        publish(buildState(next))
    }

    private fun loadArtwork(controller: MediaController) {
        artworkJob?.cancel()
        val metadata = controller.metadata
        val pkg = controller.packageName
        artworkJob = scope.launch {
            val url = withContext(Dispatchers.IO) { artwork.update(metadata, pkg) }
            if (selected?.sessionToken == controller.sessionToken && url != artworkUrl) {
                artworkUrl = url
                publish(buildState(controller))
            }
        }
    }

    private fun buildState(c: MediaController?): MusicState {
        if (c == null) return MusicState(permissionGranted = true)
        val md = c.metadata
        val ps = c.playbackState
        val actions = ps?.actions ?: 0L
        val playback = when (ps?.state) {
            PlaybackState.STATE_PLAYING, PlaybackState.STATE_FAST_FORWARDING,
            PlaybackState.STATE_REWINDING -> "playing"
            PlaybackState.STATE_BUFFERING, PlaybackState.STATE_CONNECTING,
            PlaybackState.STATE_SKIPPING_TO_NEXT, PlaybackState.STATE_SKIPPING_TO_PREVIOUS,
            PlaybackState.STATE_SKIPPING_TO_QUEUE_ITEM -> "buffering"
            PlaybackState.STATE_PAUSED -> "paused"
            PlaybackState.STATE_STOPPED, PlaybackState.STATE_ERROR -> "stopped"
            else -> "none"
        }
        val isPlaying = playback == "playing"
        val speed = if (isPlaying) (ps?.playbackSpeed ?: 1f).takeIf { it > 0f } ?: 1f else 0f
        val position = ps?.let {
            if (it.position < 0) 0L
            else if (isPlaying) it.position + ((SystemClock.elapsedRealtime() - it.lastPositionUpdateTime) * speed).toLong()
            else it.position
        } ?: 0L
        val duration = md?.getLong(MediaMetadata.METADATA_KEY_DURATION)?.takeIf { it > 0 } ?: -1L

        val canPlay = actions and (PlaybackState.ACTION_PLAY or PlaybackState.ACTION_PLAY_PAUSE) != 0L
        val canPause = actions and (PlaybackState.ACTION_PAUSE or PlaybackState.ACTION_PLAY_PAUSE) != 0L

        return MusicState(
            permissionGranted = true,
            hasSession = true,
            sourcePackage = c.packageName,
            sourceLabel = labelOf(c.packageName),
            title = md.text(MediaMetadata.METADATA_KEY_TITLE) ?: md.text(MediaMetadata.METADATA_KEY_DISPLAY_TITLE),
            artist = md.text(MediaMetadata.METADATA_KEY_ARTIST)
                ?: md.text(MediaMetadata.METADATA_KEY_ALBUM_ARTIST)
                ?: md.text(MediaMetadata.METADATA_KEY_DISPLAY_SUBTITLE),
            album = md.text(MediaMetadata.METADATA_KEY_ALBUM),
            artworkUrl = artworkUrl,
            playback = playback,
            positionMs = duration.takeIf { it > 0 }?.let { position.coerceAtMost(it) } ?: position,
            durationMs = duration,
            speed = speed,
            capturedAt = System.currentTimeMillis(),
            canPlayPause = if (isPlaying || playback == "buffering") canPause else canPlay,
            canNext = actions and PlaybackState.ACTION_SKIP_TO_NEXT != 0L,
            canPrevious = actions and PlaybackState.ACTION_SKIP_TO_PREVIOUS != 0L,
        )
    }

    private fun MediaMetadata?.text(key: String): String? =
        this?.getText(key)?.toString()?.trim()?.takeIf { it.isNotEmpty() }

    private fun Int?.isActivePlayback() = this == PlaybackState.STATE_PLAYING ||
        this == PlaybackState.STATE_BUFFERING || this == PlaybackState.STATE_FAST_FORWARDING ||
        this == PlaybackState.STATE_REWINDING

    private fun labelOf(pkg: String): String = apps.find(pkg)?.label ?: try {
        val pm = context.packageManager
        pm.getApplicationLabel(pm.getApplicationInfo(pkg, 0)).toString()
    } catch (_: PackageManager.NameNotFoundException) { pkg }

    private fun publish(s: MusicState) { _state.value = s }

    // ---- Controls ----------------------------------------------------------

    fun playPause(): Boolean {
        val c = selected ?: return false
        val s = _state.value
        if (!s.canPlayPause) return false
        if (s.playback == "playing" || s.playback == "buffering") c.transportControls.pause()
        else c.transportControls.play()
        return true
    }

    fun next(): Boolean {
        val c = selected ?: return false
        if (!_state.value.canNext) return false
        c.transportControls.skipToNext()
        return true
    }

    fun previous(): Boolean {
        val c = selected ?: return false
        if (!_state.value.canPrevious) return false
        c.transportControls.skipToPrevious()
        return true
    }

    /** The "now playing" screen of the active app, if it provides one. */
    fun sessionActivity(): PendingIntent? = selected?.sessionActivity
    fun selectedPackage(): String? = selected?.packageName

    fun trim() {
        if (!started) artwork.clear()
    }

    companion object { private const val TAG = "Monovra" }
}
