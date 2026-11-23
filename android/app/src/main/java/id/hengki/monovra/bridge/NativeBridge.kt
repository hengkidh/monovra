package id.hengki.monovra.bridge

import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.webkit.WebViewCompat
import id.hengki.monovra.BuildConfig
import id.hengki.monovra.MonovraApp
import id.hengki.monovra.apps.KnownApps
import id.hengki.monovra.settings.ThemePreference
import id.hengki.monovra.settings.isNight
import id.hengki.monovra.system.SystemActions
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject

/**
 * The restricted Kotlin ↔ JavaScript protocol.
 *
 * Request  (JS → native):  { "id": 7, "method": "launchApp", "params": { "packageName": "com.waze" } }
 * Response (native → JS):  { "type": "response", "id": 7, "ok": true, "result": {...} }
 *                          { "type": "response", "id": 7, "ok": false, "error": { "code": "NOT_INSTALLED", "message": "..." } }
 * Event    (native → JS):  { "type": "event", "event": "music", "data": {...} }
 *
 * Events: music, apps, settings, system, back, home.
 * Only methods in [dispatch] exist. Every argument is validated.
 */
class NativeBridge(
    private val app: MonovraApp,
    private val system: SystemActions,
    private val scope: CoroutineScope,
    private val requestHomeRole: () -> Boolean,
    private val send: (String) -> Unit,
) {
    /** True once the page asked for its bootstrap; events before that are dropped. */
    var pageReady = false
        private set

    fun onPageStarted() { pageReady = false }

    private suspend fun dispatch(method: String, p: JSONObject): Any? = when (method) {
        "getBootstrap" -> { pageReady = true; bootstrap() }
        "getDeviceInfo" -> deviceInfo()
        "getInstalledApps" -> appsJson()
        "getMusicState" -> app.media.state.value.toJson()
        "getSystemStatus" -> systemStatus()
        "launchApp" -> launchApp(requirePackage(p))
        "playPause" -> control { app.media.playPause() }
        "nextTrack" -> control { app.media.next() }
        "previousTrack" -> control { app.media.previous() }
        "openMusicApp" -> openMusicApp(optionalPackage(p))
        "setTheme" -> setTheme(p)
        "setFavorites" -> setFavorites(p)
        "setPreferredMusicApp" -> setPreferredMusicApp(optionalPackage(p))
        "requestHomeRole" -> JSONObject().put("requested", requestHomeRole())
        "openHomeSettings" -> opened(system.openHomeSettings())
        "openNotificationAccessSettings" -> opened(system.openNotificationAccessSettings())
        "openAppInfo" -> opened(system.openOwnAppInfo())
        else -> throw BridgeException(BridgeError.UNKNOWN_METHOD, "Unknown method: $method")
    }

    /** Called on the main thread with a raw message from the trusted page. */
    fun onMessage(raw: String) {
        if (raw.length > Validation.MAX_MESSAGE_CHARS) return
        val request = try { JSONObject(raw) } catch (_: JSONException) { return }
        val id = request.optLong("id", -1)
        val method = request.optString("method")
        if (id < 0) return
        if (!Validation.isMethodName(method)) return reply(id, error(BridgeError.BAD_REQUEST, "Invalid method"))
        val params = request.optJSONObject("params") ?: JSONObject()

        scope.launch {
            val response = try {
                JSONObject().put("ok", true).put("result", dispatch(method, params) ?: JSONObject.NULL)
            } catch (e: BridgeException) {
                error(e.code, e.message ?: e.code)
            } catch (e: Exception) {
                Log.e(TAG, "Bridge method $method failed", e)
                error(BridgeError.INTERNAL, "Internal error")
            }
            reply(id, response)
        }
    }

    fun pushEvent(event: String, data: Any? = null) {
        if (!pageReady) return
        send(JSONObject().put("type", "event").put("event", event).put("data", data ?: JSONObject.NULL).toString())
    }

    private fun reply(id: Long, body: JSONObject) {
        send(body.put("type", "response").put("id", id).toString())
    }

    private fun error(code: String, message: String) = JSONObject()
        .put("ok", false)
        .put("error", JSONObject().put("code", code).put("message", message))

    // ---- Payloads ----------------------------------------------------------

    private fun bootstrap() = JSONObject()
        .put("device", deviceInfo())
        .put("settings", app.settingsState.value.toJson())
        .put("apps", appsJson())
        .put("music", app.media.state.value.toJson())
        .put("system", systemStatus())

    fun deviceInfo(): JSONObject = JSONObject()
        .put("manufacturer", Build.MANUFACTURER)
        .put("model", Build.MODEL)
        .put("androidVersion", Build.VERSION.RELEASE)
        .put("sdkInt", Build.VERSION.SDK_INT)
        // Android dark mode, used by the page to resolve the "auto" theme.
        .put("nightMode", app.resources.configuration.isNight())
        .put("appVersion", BuildConfig.VERSION_NAME)
        .put("appVersionCode", BuildConfig.VERSION_CODE)
        .put("webViewVersion", WebViewCompat.getCurrentWebViewPackage(app)?.versionName ?: JSONObject.NULL)

    fun appsJson(): JSONArray = JSONArray().apply { app.apps.apps.value.forEach { put(it.toJson()) } }

    fun systemStatus(): JSONObject = JSONObject()
        .put("isDefaultLauncher", system.isDefaultLauncher())
        .put("homeRoleAvailable", system.homeRoleAvailable)
        .put("notificationAccess", app.media.hasAccess())
        .put("sdkInt", Build.VERSION.SDK_INT)

    // ---- Actions -----------------------------------------------------------

    private fun launchApp(pkg: String): JSONObject {
        val intent = app.apps.launchIntent(pkg) ?: throw BridgeException(BridgeError.NOT_INSTALLED, "App is not installed")
        if (!system.start(intent)) throw BridgeException(BridgeError.LAUNCH_FAILED, "App could not be opened")
        return JSONObject().put("launched", pkg)
    }

    private fun openMusicApp(pkg: String?): JSONObject {
        if (pkg != null) return launchApp(pkg)
        app.media.sessionActivity()?.let { if (system.send(it)) return JSONObject().put("launched", app.media.selectedPackage()) }
        app.media.selectedPackage()?.let { if (app.apps.isInstalled(it)) return launchApp(it) }
        val fallback = listOfNotNull(app.settingsState.value.preferredMusicApp, KnownApps.YOUTUBE_MUSIC, KnownApps.SPOTIFY)
            .firstOrNull { app.apps.isInstalled(it) }
            ?: app.apps.apps.value.firstOrNull { it.isMusic }?.packageName
            ?: throw BridgeException(BridgeError.NOT_INSTALLED, "No music app installed")
        return launchApp(fallback)
    }

    private fun control(action: () -> Boolean): JSONObject {
        if (!app.media.hasAccess()) throw BridgeException(BridgeError.PERMISSION_DENIED, "Notification access required")
        if (!app.media.state.value.hasSession) throw BridgeException(BridgeError.NO_SESSION, "No active media session")
        if (!action()) throw BridgeException(BridgeError.UNSUPPORTED, "Not supported by the current player")
        return JSONObject().put("done", true)
    }

    private suspend fun setTheme(p: JSONObject): JSONObject {
        val theme = ThemePreference.fromId(p.optString("theme"))
            ?: throw BridgeException(BridgeError.INVALID_ARGUMENT, "Unknown theme")
        app.settings.setTheme(theme)
        return JSONObject().put("theme", theme.id)
    }

    private suspend fun setFavorites(p: JSONObject): JSONObject {
        val array = p.optJSONArray("packages") ?: throw BridgeException(BridgeError.INVALID_ARGUMENT, "packages[] required")
        if (array.length() > Validation.MAX_FAVORITES) throw BridgeException(BridgeError.INVALID_ARGUMENT, "Too many favorites")
        val list = LinkedHashSet<String>()
        for (i in 0 until array.length()) {
            val pkg = array.optString(i)
            if (!Validation.isPackageName(pkg)) throw BridgeException(BridgeError.INVALID_ARGUMENT, "Invalid package name")
            if (app.apps.isInstalled(pkg)) list += pkg
        }
        app.settings.setFavorites(list.toList())
        return JSONObject().put("favorites", JSONArray(list.toList()))
    }

    private suspend fun setPreferredMusicApp(pkg: String?): JSONObject {
        if (pkg != null && !app.apps.isInstalled(pkg)) throw BridgeException(BridgeError.NOT_INSTALLED, "App is not installed")
        app.settings.setPreferredMusicApp(pkg)
        app.media.refreshSelection()
        return JSONObject().put("preferredMusicApp", pkg ?: JSONObject.NULL)
    }

    private fun opened(ok: Boolean): JSONObject {
        if (!ok) throw BridgeException(BridgeError.UNSUPPORTED, "This screen is not available on this device")
        return JSONObject().put("opened", true)
    }

    // ---- Argument helpers --------------------------------------------------

    private fun requirePackage(p: JSONObject): String {
        val pkg = p.optString("packageName")
        if (!Validation.isPackageName(pkg)) throw BridgeException(BridgeError.INVALID_ARGUMENT, "Invalid package name")
        return pkg
    }

    private fun optionalPackage(p: JSONObject): String? {
        if (!p.has("packageName") || p.isNull("packageName")) return null
        return requirePackage(p)
    }

    companion object { private const val TAG = "Monovra" }
}

/** Convenience used by the activity for HOME intents. */
fun Intent.isHomeIntent(): Boolean = action == Intent.ACTION_MAIN && hasCategory(Intent.CATEGORY_HOME)
