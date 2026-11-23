package id.hengki.monovra.navigation

import android.app.Notification
import android.content.Context
import android.graphics.Bitmap
import android.graphics.drawable.Icon
import android.os.Bundle
import android.service.notification.StatusBarNotification
import android.util.Log
import androidx.core.graphics.drawable.toBitmap
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.util.concurrent.atomic.AtomicLong

/** The next manoeuvre shown by a navigation app, serialised for the WebView. */
data class NavigationState(
    val active: Boolean = false,
    val sourcePackage: String? = null,
    val sourceLabel: String? = null,
    val distance: String? = null,
    val instruction: String? = null,
    val eta: String? = null,
    val arrowUrl: String? = null,
) {
    fun toJson(): JSONObject = JSONObject()
        .put("active", active)
        .put("source", if (sourcePackage == null) JSONObject.NULL else
            JSONObject().put("packageName", sourcePackage).put("label", sourceLabel ?: sourcePackage))
        .put("distance", distance ?: JSONObject.NULL)
        .put("instruction", instruction ?: JSONObject.NULL)
        .put("eta", eta ?: JSONObject.NULL)
        .put("arrow", arrowUrl ?: JSONObject.NULL)
}

/**
 * Reads the ongoing turn-by-turn notification of Google Maps or Waze.
 *
 * Only notifications from [SOURCES] are looked at; everything else is ignored
 * without being read. Nothing is stored on disk: the latest manoeuvre and its
 * arrow live in memory and are dropped when navigation ends.
 *
 * The notification layout is not a public API. Parsing is defensive: when the
 * distance cannot be recognised, the text is shown as it is.
 */
class NavigationRepository(
    private val context: Context,
    private val scope: CoroutineScope,
    private val labelOf: (String) -> String,
) {
    private val _state = MutableStateFlow(NavigationState())
    val state: StateFlow<NavigationState> = _state

    private val arrowCounter = AtomicLong(0)
    @Volatile private var arrow: Pair<Long, ByteArray>? = null
    private var arrowKey: String? = null
    private var activeKey: String? = null
    private var job: Job? = null

    fun arrowBytes(token: Long): ByteArray? = arrow?.takeIf { it.first == token }?.second

    /** Called by the listener service (main thread). */
    fun onPosted(sbn: StatusBarNotification) {
        if (!isNavigation(sbn)) return
        val n = sbn.notification
        val extras = n.extras ?: Bundle.EMPTY
        val title = extras.text(Notification.EXTRA_TITLE)
        val text = extras.text(Notification.EXTRA_TEXT) ?: extras.text(Notification.EXTRA_BIG_TEXT)
        val sub = extras.text(Notification.EXTRA_SUB_TEXT)
        if (title == null && text == null) return

        val parsed = parse(title, text)
        // Maps and Waze also post ongoing notifications that are not turn-by-turn
        // (location sharing, "running in background"). Only accept a notification
        // that carries a distance or is explicitly categorised as navigation.
        if (parsed.first == null && n.category != Notification.CATEGORY_NAVIGATION) {
            if (sbn.key == activeKey) clear()
            return
        }
        val pkg = sbn.packageName
        activeKey = sbn.key
        val iconKey = "$pkg:${n.getLargeIcon()?.let(::iconKey)}:${n.`when`}:$title"
        job?.cancel()
        job = scope.launch {
            val url = if (iconKey == arrowKey) arrow?.let { urlOf(it.first) } else withContext(Dispatchers.IO) {
                loadArrow(n)?.let { bytes ->
                    val token = arrowCounter.incrementAndGet()
                    arrow = token to bytes
                    urlOf(token)
                }
            }.also { arrowKey = iconKey; if (it == null) arrow = null }
            _state.value = NavigationState(
                active = true,
                sourcePackage = pkg,
                sourceLabel = labelOf(pkg),
                distance = parsed.first,
                instruction = parsed.second,
                eta = sub,
                arrowUrl = url,
            )
        }
    }

    fun onRemoved(sbn: StatusBarNotification) {
        if (sbn.key == activeKey) clear()
    }

    /** Listener reconnected: rebuild from what is on screen now. */
    fun resync(active: Array<StatusBarNotification>?) {
        clear()
        active.orEmpty().filter(::isNavigation).forEach(::onPosted)
    }

    fun clear() {
        job?.cancel()
        activeKey = null
        arrowKey = null
        arrow = null
        if (_state.value.active) _state.value = NavigationState()
    }

    private fun isNavigation(sbn: StatusBarNotification): Boolean =
        sbn.packageName in SOURCES && sbn.notification.flags and Notification.FLAG_ONGOING_EVENT != 0

    private fun iconKey(icon: Icon): String = when (icon.type) {
        Icon.TYPE_RESOURCE -> "res:${icon.resId}"
        else -> "obj:${System.identityHashCode(icon)}"
    }

    private fun loadArrow(n: Notification): ByteArray? = try {
        val bitmap = n.getLargeIcon()?.loadDrawable(context)?.toBitmap(ARROW_PX, ARROW_PX)
            ?: @Suppress("DEPRECATION") (n.extras?.getParcelable(Notification.EXTRA_LARGE_ICON) as? Bitmap)
        bitmap?.let { bmp ->
            ByteArrayOutputStream(16 * 1024).use { out ->
                bmp.compress(Bitmap.CompressFormat.PNG, 100, out)
                out.toByteArray()
            }
        }
    } catch (e: Exception) {
        Log.i(TAG, "Navigation arrow unavailable: ${e.javaClass.simpleName}")
        null
    }

    private fun urlOf(token: Long) = "/nav/$token.png"

    private fun Bundle.text(key: String): String? =
        getCharSequence(key)?.toString()?.trim()?.take(MAX_TEXT)?.takeIf { it.isNotEmpty() }

    companion object {
        private const val TAG = "Monovra"
        private const val ARROW_PX = 192
        private const val MAX_TEXT = 160
        val SOURCES = setOf("com.google.android.apps.maps", "com.waze")

        private val DISTANCE = Regex("""(?i)(\d+(?:[.,]\d+)?\s?(?:km|m|mi|ft|yd))\b""")

        /**
         * Splits a notification into (distance, instruction).
         * Google Maps puts the distance in the title and the step in the text;
         * Waze often joins both. Whatever is not the distance is the instruction.
         */
        fun parse(title: String?, text: String?): Pair<String?, String?> {
            val titleDistance = title?.let { DISTANCE.find(it) }
            if (titleDistance != null && titleDistance.value.length >= title.length - 3) {
                return titleDistance.value to text
            }
            val joined = listOfNotNull(title, text).joinToString(" · ")
            val match = DISTANCE.find(joined) ?: return null to joined
            val rest = joined.removeRange(match.range)
                .replace(Regex("""(?i)\b(dalam|in)\s*(·\s*)?$"""), "")
                .replace(Regex("""^[\s·,\-]+|[\s·,\-]+$"""), "")
                .replace(Regex("""\s{2,}"""), " ")
            return match.value to rest.ifEmpty { null }
        }
    }
}
