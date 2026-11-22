package id.hengki.monovra.media

import android.content.ContentResolver
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.media.MediaMetadata
import android.net.Uri
import android.util.Log
import android.util.Size
import java.io.ByteArrayOutputStream
import java.util.concurrent.atomic.AtomicLong

/**
 * Holds the artwork of the current track as a resized JPEG.
 *
 * JavaScript only ever sees an opaque URL like `/art/42.jpg`. The original
 * bitmap or content URI is never exposed, and only the current token resolves.
 */
class ArtworkStore(private val resolver: ContentResolver) {

    private class Entry(val token: Long, val sourceKey: String, val bytes: ByteArray)

    private val counter = AtomicLong(0)
    @Volatile private var current: Entry? = null

    /** Bytes for `/art/<token>.jpg`, only if it is still the current artwork. */
    fun bytesFor(token: Long): ByteArray? = current?.takeIf { it.token == token }?.bytes

    fun clear() { current = null }

    /**
     * Updates the stored artwork from metadata and returns its URL (or null).
     * Must be called off the main thread: may decode a content URI.
     */
    fun update(metadata: MediaMetadata?, packageName: String?): String? {
        if (metadata == null) { current = null; return null }

        val bitmap = metadata.getBitmap(MediaMetadata.METADATA_KEY_ALBUM_ART)
            ?: metadata.getBitmap(MediaMetadata.METADATA_KEY_ART)
            ?: metadata.getBitmap(MediaMetadata.METADATA_KEY_DISPLAY_ICON)
        val uri = if (bitmap == null) {
            listOf(
                MediaMetadata.METADATA_KEY_ALBUM_ART_URI,
                MediaMetadata.METADATA_KEY_ART_URI,
                MediaMetadata.METADATA_KEY_DISPLAY_ICON_URI,
            ).firstNotNullOfOrNull { metadata.getString(it)?.takeIf { s -> s.isNotBlank() } }
        } else null

        val sourceKey = when {
            bitmap != null -> "bmp:$packageName:${bitmap.generationId}:${bitmap.width}x${bitmap.height}:" +
                metadata.getString(MediaMetadata.METADATA_KEY_TITLE)
            uri != null -> "uri:$packageName:$uri"
            else -> { current = null; return null }
        }
        current?.let { if (it.sourceKey == sourceKey) return urlOf(it.token) }

        val scaled = when {
            bitmap != null -> scale(bitmap)
            uri != null -> loadUri(uri)
            else -> null
        } ?: run { current = null; return null }

        val bytes = ByteArrayOutputStream(64 * 1024).use { out ->
            scaled.compress(Bitmap.CompressFormat.JPEG, 88, out)
            out.toByteArray()
        }
        if (scaled !== bitmap) scaled.recycle() // never recycle the session's own bitmap
        val entry = Entry(counter.incrementAndGet(), sourceKey, bytes)
        current = entry
        return urlOf(entry.token)
    }

    private fun urlOf(token: Long) = "/art/$token.jpg"

    private fun scale(src: Bitmap): Bitmap {
        val longest = maxOf(src.width, src.height)
        if (longest <= MAX_PX) return src
        val ratio = MAX_PX.toFloat() / longest
        return Bitmap.createScaledBitmap(
            src, (src.width * ratio).toInt().coerceAtLeast(1), (src.height * ratio).toInt().coerceAtLeast(1), true,
        )
    }

    /** Only local schemes are resolved; MONOVRA has no network access. */
    private fun loadUri(raw: String): Bitmap? {
        val uri = Uri.parse(raw)
        if (uri.scheme !in setOf(ContentResolver.SCHEME_CONTENT, ContentResolver.SCHEME_ANDROID_RESOURCE)) return null
        return try {
            if (uri.scheme == ContentResolver.SCHEME_CONTENT) {
                resolver.loadThumbnail(uri, Size(MAX_PX, MAX_PX), null)
            } else {
                resolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it) }?.let { scale(it) }
            }
        } catch (e: SecurityException) {
            Log.i(TAG, "Artwork URI not readable (permission revoked or not granted)")
            null
        } catch (e: Exception) {
            Log.i(TAG, "Artwork URI could not be decoded: ${e.javaClass.simpleName}")
            null
        }
    }

    companion object {
        private const val TAG = "Monovra"
        private const val MAX_PX = 512
    }
}
