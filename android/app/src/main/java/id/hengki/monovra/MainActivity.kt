package id.hengki.monovra

import android.annotation.SuppressLint
import android.app.AlertDialog
import android.content.Intent
import android.content.res.Configuration
import android.graphics.drawable.ColorDrawable
import android.net.Uri
import android.os.Bundle
import android.util.Log
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.webkit.RenderProcessGoneDetail
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.TextView
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import androidx.webkit.JavaScriptReplyProxy
import androidx.webkit.WebViewAssetLoader
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import id.hengki.monovra.bridge.LegacyJsInterface
import id.hengki.monovra.bridge.NativeBridge
import id.hengki.monovra.bridge.isHomeIntent
import id.hengki.monovra.settings.MonovraSettings
import id.hengki.monovra.settings.MonovraTheme
import id.hengki.monovra.settings.ThemePreference
import id.hengki.monovra.system.SystemActions
import id.hengki.monovra.web.ArtworkPathHandler
import id.hengki.monovra.web.NavArrowPathHandler
import id.hengki.monovra.web.IconPathHandler
import id.hengki.monovra.web.notFound
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeoutOrNull
import org.json.JSONObject

/**
 * The launcher activity: one WebView rendering the bundled UI from
 * https://appassets.androidplatform.net (served locally by WebViewAssetLoader).
 */
class MainActivity : ComponentActivity() {

    private val app get() = application as MonovraApp
    private lateinit var root: FrameLayout
    private var webView: WebView? = null
    private lateinit var system: SystemActions
    private lateinit var bridge: NativeBridge
    private var replyProxy: JavaScriptReplyProxy? = null
    private var useLegacyBridge = false
    @Volatile private var trustedPageLoaded = false
    private var themePreference = ThemePreference.DEFAULT
    private var currentTheme = MonovraTheme.BLACK

    private val homeRoleLauncher = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) {
        pushSystemStatus()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        system = SystemActions(this)

        // Read the saved theme synchronously (DataStore, a few ms) so the very
        // first frame already has the right background: no wrong-theme flash.
        val initial = runBlocking { withTimeoutOrNull(600) { app.settings.current() } } ?: MonovraSettings()
        themePreference = initial.theme
        currentTheme = themePreference.resolve(resources.configuration)

        WindowCompat.setDecorFitsSystemWindows(window, false)
        root = FrameLayout(this)
        ViewCompat.setOnApplyWindowInsetsListener(root) { v, insets ->
            val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout())
            v.setPadding(bars.left, bars.top, bars.right, bars.bottom)
            WindowInsetsCompat.CONSUMED
        }
        setContentView(root)
        applyWindowTheme(currentTheme)

        bridge = NativeBridge(app, system, lifecycleScope, ::requestHomeRole, ::sendToPage)

        if (!checkWebView()) return
        createWebView()

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            // A launcher never finishes on Back; the UI closes its own panels.
            override fun handleOnBackPressed() = bridge.pushEvent("back")
        })

        observeState()
    }

    // ---- WebView -----------------------------------------------------------

    @SuppressLint("SetJavaScriptEnabled")
    private fun createWebView() {
        val assetLoader = WebViewAssetLoader.Builder()
            .setDomain(TRUSTED_HOST)
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .addPathHandler("/icon/", IconPathHandler(app.icons))
            .addPathHandler("/art/", ArtworkPathHandler(app.media))
            .addPathHandler("/nav/", NavArrowPathHandler(app.navigation))
            .build()

        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG) // chrome://inspect in debug builds only
        val wv = WebView(this)
        wv.setBackgroundColor(currentTheme.background)
        wv.overScrollMode = View.OVER_SCROLL_NEVER
        wv.isVerticalScrollBarEnabled = false
        wv.isHorizontalScrollBarEnabled = false
        wv.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true // only for per-view UI conveniences
            allowFileAccess = false
            allowContentAccess = false
            blockNetworkLoads = true // no INTERNET permission; everything is local
            mediaPlaybackRequiresUserGesture = true
            setSupportMultipleWindows(false)
            javaScriptCanOpenWindowsAutomatically = false
            setGeolocationEnabled(false)
            cacheMode = WebSettings.LOAD_NO_CACHE
            textZoom = 100
            safeBrowsingEnabled = false // local bundled content only
        }

        if (WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
            WebViewCompat.addWebMessageListener(wv, JS_OBJECT, setOf(TRUSTED_ORIGIN)) { _, message, sourceOrigin, isMainFrame, proxy ->
                if (!isMainFrame || sourceOrigin.toString().trimEnd('/') != TRUSTED_ORIGIN) return@addWebMessageListener
                replyProxy = proxy
                message.data?.let(bridge::onMessage)
            }
        } else {
            useLegacyBridge = true
            wv.addJavascriptInterface(LegacyJsInterface({ trustedPageLoaded }, bridge::onMessage), JS_OBJECT_LEGACY)
        }

        wv.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? {
                if (request.url.host != TRUSTED_HOST) return notFound() // never reach the network
                return assetLoader.shouldInterceptRequest(request.url) ?: notFound()
            }

            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                // The launcher UI is a single page: block every navigation.
                return !(request.isForMainFrame && request.url.toString().startsWith("$TRUSTED_ORIGIN/assets/web/"))
            }

            override fun onPageStarted(view: WebView, url: String?, favicon: android.graphics.Bitmap?) {
                trustedPageLoaded = url?.startsWith("$TRUSTED_ORIGIN/") == true
                replyProxy = null
                bridge.onPageStarted()
            }

            override fun onRenderProcessGone(view: WebView, detail: RenderProcessGoneDetail): Boolean {
                // Low-memory head units may kill the renderer. Rebuild instead of crashing.
                Log.w(TAG, "WebView renderer gone (crash=${detail.didCrash()}), recreating")
                destroyWebView()
                createWebView()
                return true
            }
        }
        wv.webChromeClient = null

        root.addView(wv, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
        webView = wv
        wv.loadUrl("$TRUSTED_ORIGIN/assets/web/index.html?theme=${currentTheme.id}")
    }

    private fun destroyWebView() {
        webView?.let {
            root.removeView(it)
            it.destroy()
        }
        webView = null
        replyProxy = null
    }

    private fun sendToPage(json: String) {
        val wv = webView ?: return
        if (useLegacyBridge) {
            if (trustedPageLoaded) wv.evaluateJavascript("window.__monovraReceive&&window.__monovraReceive(${JSONObject.quote(json)})", null)
        } else {
            try { replyProxy?.postMessage(json) } catch (e: IllegalStateException) { replyProxy = null }
        }
    }

    /** Shows a warning when the system WebView is too old for the compiled CSS. */
    private fun checkWebView(): Boolean {
        val pkg = WebViewCompat.getCurrentWebViewPackage(this)
        if (pkg == null) {
            root.addView(TextView(this).apply {
                text = getString(R.string.webview_missing)
                setTextColor(if (currentTheme.lightSurface) 0xFF111111.toInt() else 0xFFFFFFFF.toInt())
                textSize = 20f
                gravity = Gravity.CENTER
                setPadding(48, 48, 48, 48)
            })
            return false
        }
        val major = pkg.versionName?.substringBefore('.')?.toIntOrNull() ?: return true
        if (major < MIN_WEBVIEW_MAJOR && !warnedAboutWebView) {
            warnedAboutWebView = true
            AlertDialog.Builder(this)
                .setTitle(R.string.webview_outdated_title)
                .setMessage(getString(R.string.webview_outdated_message, MIN_WEBVIEW_MAJOR, pkg.versionName))
                .setPositiveButton(R.string.webview_outdated_update) { _, _ ->
                    val market = Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=${pkg.packageName}"))
                    if (!system.start(market.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))) {
                        system.start(Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                            Uri.fromParts("package", pkg.packageName, null)))
                    }
                }
                .setNegativeButton(R.string.webview_outdated_continue, null)
                .show()
        }
        return true
    }

    // ---- State → page ------------------------------------------------------

    private fun observeState() {
        lifecycleScope.launch {
            repeatOnLifecycle(Lifecycle.State.STARTED) {
                launch { app.media.state.collect { bridge.pushEvent("music", it.toJson()) } }
                launch { app.navigation.state.collect { bridge.pushEvent("navigation", it.toJson()) } }
                launch { app.apps.apps.collect { bridge.pushEvent("apps", bridge.appsJson()) } }
                launch {
                    app.settingsState.collect { s ->
                        themePreference = s.theme
                        refreshWindowTheme()
                        bridge.pushEvent("settings", s.toJson())
                    }
                }
            }
        }
        // First run: pick default shortcuts once installed apps are known.
        lifecycleScope.launch {
            combine(app.apps.apps, app.settingsState) { apps, s -> apps.isNotEmpty() && !s.favoritesInitialized }
                .distinctUntilChanged()
                .map { needed -> if (needed) app.settings.setFavorites(app.apps.defaultFavorites()) }
                .collect { }
        }
    }

    private fun pushSystemStatus() = bridge.pushEvent("system", bridge.systemStatus())

    /** Re-resolves the theme (e.g. "auto" after a day/night switch) and repaints the window. */
    private fun refreshWindowTheme() {
        val resolved = themePreference.resolve(resources.configuration)
        if (resolved != currentTheme) {
            currentTheme = resolved
            applyWindowTheme(resolved)
        }
    }

    // uiMode is in configChanges, so a day/night switch lands here instead of recreating.
    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)
        refreshWindowTheme()
        pushSystemStatus() // the page resolves "auto" from system.nightMode
    }

    private fun applyWindowTheme(theme: MonovraTheme) {
        window.setBackgroundDrawable(ColorDrawable(theme.background))
        root.setBackgroundColor(theme.background)
        webView?.setBackgroundColor(theme.background)
        @Suppress("DEPRECATION")
        run {
            window.statusBarColor = theme.background
            window.navigationBarColor = theme.background
        }
        WindowInsetsControllerCompat(window, window.decorView).apply {
            isAppearanceLightStatusBars = theme.lightSurface
            isAppearanceLightNavigationBars = theme.lightSurface
        }
    }

    private fun requestHomeRole(): Boolean {
        val intent = system.homeRoleRequestIntent()
        if (intent != null && !system.isDefaultLauncher()) {
            try {
                homeRoleLauncher.launch(intent)
                return true
            } catch (e: RuntimeException) {
                Log.w(TAG, "Role request failed, falling back to settings", e)
            }
        }
        return system.openHomeSettings()
    }

    // ---- Lifecycle ---------------------------------------------------------

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        // Pressing Home while MONOVRA is already in front returns to the dashboard.
        if (intent.isHomeIntent()) bridge.pushEvent("home")
    }

    override fun onStart() {
        super.onStart()
        webView?.resumeTimers()
        app.media.start()
    }

    override fun onResume() {
        super.onResume()
        webView?.onResume()
        // The user may come back from Settings after granting access or changing Home app.
        app.media.checkAccess()
        pushSystemStatus()
    }

    override fun onPause() {
        webView?.onPause()
        super.onPause()
    }

    override fun onStop() {
        app.media.stop()
        webView?.pauseTimers() // stops JS timers while hidden or the head unit sleeps
        super.onStop()
    }

    override fun onDestroy() {
        destroyWebView()
        super.onDestroy()
    }

    companion object {
        private const val TAG = "Monovra"
        const val TRUSTED_HOST = "appassets.androidplatform.net"
        const val TRUSTED_ORIGIN = "https://$TRUSTED_HOST"
        private const val JS_OBJECT = "MonovraNative"
        private const val JS_OBJECT_LEGACY = "MonovraNativeLegacy"
        private const val MIN_WEBVIEW_MAJOR = 111
        private var warnedAboutWebView = false
    }
}
