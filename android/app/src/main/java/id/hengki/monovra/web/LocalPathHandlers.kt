package id.hengki.monovra.web

import android.webkit.WebResourceResponse
import androidx.webkit.WebViewAssetLoader
import id.hengki.monovra.apps.IconProvider
import id.hengki.monovra.bridge.Validation
import id.hengki.monovra.media.MediaRepository
import java.io.ByteArrayInputStream

/**
 * Application-controlled image endpoints on the trusted origin:
 *
 *   https://appassets.androidplatform.net/icon/<packageName>.png
 *   https://appassets.androidplatform.net/art/<token>.jpg
 *
 * Inputs are validated; nothing maps to arbitrary files or content URIs.
 */
class IconPathHandler(private val icons: IconProvider) : WebViewAssetLoader.PathHandler {
    override fun handle(path: String): WebResourceResponse? {
        val pkg = path.removeSuffix(".png")
        if (!path.endsWith(".png") || !Validation.isPackageName(pkg)) return notFound()
        val bytes = icons.iconPng(pkg) ?: return notFound()
        return ok("image/png", bytes, immutable = true)
    }
}

class ArtworkPathHandler(private val media: MediaRepository) : WebViewAssetLoader.PathHandler {
    private val pattern = Regex("^(\\d{1,18})\\.jpg$")
    override fun handle(path: String): WebResourceResponse? {
        val token = pattern.matchEntire(path)?.groupValues?.get(1)?.toLongOrNull() ?: return notFound()
        val bytes = media.artworkBytes(token) ?: return notFound()
        return ok("image/jpeg", bytes, immutable = true)
    }
}

internal fun ok(mime: String, bytes: ByteArray, immutable: Boolean) =
    WebResourceResponse(mime, null, 200, "OK", buildMap {
        put("Cache-Control", if (immutable) "max-age=31536000, immutable" else "no-store")
        put("X-Content-Type-Options", "nosniff")
    }, ByteArrayInputStream(bytes))

internal fun notFound() =
    WebResourceResponse("text/plain", "utf-8", 404, "Not Found", emptyMap(), ByteArrayInputStream(ByteArray(0)))
