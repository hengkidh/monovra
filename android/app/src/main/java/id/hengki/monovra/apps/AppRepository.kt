package id.hengki.monovra.apps

import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.util.Log
import androidx.core.content.ContextCompat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.text.Collator

data class AppEntry(
    val packageName: String,
    val activityName: String,
    val label: String,
    val updatedAt: Long,
    val isMusic: Boolean,
    val isNavigation: Boolean,
) {
    val iconUrl: String get() = "/icon/$packageName.png?v=$updatedAt"

    fun toJson(): JSONObject = JSONObject()
        .put("packageName", packageName)
        .put("label", label)
        .put("icon", iconUrl)
        .put("isMusic", isMusic)
        .put("isNavigation", isNavigation)
}

/**
 * Discovers launchable apps with PackageManager and keeps the list current
 * through package broadcasts (event-driven, no polling).
 */
class AppRepository(private val context: Context, private val scope: CoroutineScope) {

    private val pm: PackageManager = context.packageManager
    private val mutex = Mutex()
    private val _apps = MutableStateFlow<List<AppEntry>>(emptyList())
    val apps: StateFlow<List<AppEntry>> = _apps
    @Volatile private var byPackage: Map<String, AppEntry> = emptyMap()
    private var pendingRefresh: Job? = null

    fun find(packageName: String): AppEntry? = byPackage[packageName]
    fun isInstalled(packageName: String): Boolean = byPackage.containsKey(packageName)

    private val packageReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            // Installs often fire several broadcasts in a row; coalesce them.
            pendingRefresh?.cancel()
            pendingRefresh = scope.launch {
                delay(400)
                refresh()
            }
        }
    }

    fun start() {
        val filter = IntentFilter().apply {
            addAction(Intent.ACTION_PACKAGE_ADDED)
            addAction(Intent.ACTION_PACKAGE_REMOVED)
            addAction(Intent.ACTION_PACKAGE_CHANGED)
            addAction(Intent.ACTION_PACKAGE_REPLACED)
            addDataScheme("package")
        }
        ContextCompat.registerReceiver(context, packageReceiver, filter, ContextCompat.RECEIVER_NOT_EXPORTED)
        val external = IntentFilter().apply {
            addAction(Intent.ACTION_EXTERNAL_APPLICATIONS_AVAILABLE)
            addAction(Intent.ACTION_EXTERNAL_APPLICATIONS_UNAVAILABLE)
        }
        ContextCompat.registerReceiver(context, packageReceiver, external, ContextCompat.RECEIVER_NOT_EXPORTED)
        scope.launch { refresh() }
    }

    suspend fun refresh() = mutex.withLock {
        val list = withContext(Dispatchers.IO) { loadApps() }
        byPackage = list.associateBy { it.packageName }
        _apps.value = list
    }

    private fun loadApps(): List<AppEntry> {
        val self = context.packageName
        val launcherIntent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
        val resolved = try {
            pm.queryIntentActivities(launcherIntent, 0)
        } catch (e: RuntimeException) {
            Log.w(TAG, "queryIntentActivities failed", e)
            return emptyList()
        }

        val musicPackages = KnownApps.MUSIC.toMutableSet().apply {
            addAll(packagesFor(Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_APP_MUSIC)))
            try {
                pm.queryIntentServices(Intent("android.media.browse.MediaBrowserService"), 0)
                    .forEach { add(it.serviceInfo.packageName) }
            } catch (_: RuntimeException) { }
        }
        val navPackages = KnownApps.NAVIGATION.toMutableSet().apply {
            addAll(packagesFor(Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_APP_MAPS)))
        }

        val collator = Collator.getInstance()
        return resolved.asSequence()
            .mapNotNull { it.activityInfo }
            .filter { it.packageName != self && it.isEnabled && it.applicationInfo.enabled }
            .distinctBy { it.packageName } // one shortcut per app
            .map { info ->
                val updated = try {
                    pm.getPackageInfo(info.packageName, 0).lastUpdateTime
                } catch (_: PackageManager.NameNotFoundException) { 0L }
                AppEntry(
                    packageName = info.packageName,
                    activityName = info.name,
                    label = info.loadLabel(pm)?.toString()?.trim().orEmpty().ifEmpty { info.packageName },
                    updatedAt = updated,
                    isMusic = info.packageName in musicPackages,
                    isNavigation = info.packageName in navPackages,
                )
            }
            .sortedWith { a, b -> collator.compare(a.label, b.label) }
            .toList()
    }

    private fun packagesFor(intent: Intent): List<String> = try {
        pm.queryIntentActivities(intent, 0).mapNotNull { it.activityInfo?.packageName }
    } catch (_: RuntimeException) { emptyList() }

    /** Launch intent for an installed app, or null if it cannot be launched. */
    fun launchIntent(packageName: String): Intent? {
        val entry = find(packageName) ?: return null
        val intent = pm.getLaunchIntentForPackage(packageName)
            ?: Intent(Intent.ACTION_MAIN)
                .addCategory(Intent.CATEGORY_LAUNCHER)
                .setComponent(ComponentName(entry.packageName, entry.activityName))
        return intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED)
    }

    /** First-run shortcuts: car-relevant apps that are actually installed. */
    fun defaultFavorites(): List<String> {
        val installed = byPackage
        val picks = KnownApps.DEFAULT_FAVORITES.filter { it in installed }.toMutableList()
        if (picks.size < 4) {
            installed.values.asSequence()
                .map { it.packageName }
                .filter { it !in picks }
                .take(4 - picks.size)
                .forEach { picks += it }
        }
        return picks
    }

    companion object { private const val TAG = "Monovra" }
}

object KnownApps {
    const val YOUTUBE_MUSIC = "com.google.android.apps.youtube.music"
    const val SPOTIFY = "com.spotify.music"
    const val GOOGLE_MAPS = "com.google.android.apps.maps"
    const val WAZE = "com.waze"
    const val SETTINGS = "com.android.settings"

    /** Order matters: this is the priority for shortcuts and media sessions. */
    val DEFAULT_FAVORITES = listOf(YOUTUBE_MUSIC, GOOGLE_MAPS, WAZE, SETTINGS, SPOTIFY)

    val MUSIC = listOf(
        YOUTUBE_MUSIC, SPOTIFY,
        "com.apple.android.music", "deezer.android.app", "com.amazon.mp3",
        "com.soundcloud.android", "com.aspiro.tidal", "com.joox.music", "com.maxmpz.audioplayer",
        "com.google.android.youtube", "au.com.shiftyjelly.pocketcasts",
    )
    val NAVIGATION = listOf(
        GOOGLE_MAPS, WAZE,
        "com.here.app.maps", "net.osmand", "net.osmand.plus", "com.sygic.aura",
        "app.organicmaps", "com.mapswithme.maps.pro", "ru.yandex.yandexnavi",
    )
}
