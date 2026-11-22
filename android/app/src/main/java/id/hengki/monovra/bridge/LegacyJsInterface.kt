package id.hengki.monovra.bridge

import android.os.Handler
import android.os.Looper
import android.webkit.JavascriptInterface

/**
 * Fallback transport for old WebView builds without WebMessageListener.
 *
 * The page is locked to the trusted origin (navigation elsewhere is blocked),
 * and each call is additionally rejected unless the last committed main-frame
 * URL is the trusted origin.
 */
class LegacyJsInterface(
    private val isTrusted: () -> Boolean,
    private val onMessage: (String) -> Unit,
) {
    private val main = Handler(Looper.getMainLooper())

    @JavascriptInterface
    fun postMessage(message: String?) {
        if (message == null || !isTrusted()) return
        main.post { onMessage(message) }
    }
}
