package id.hengki.monovra.apps

import android.content.ComponentName
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.util.LruCache
import java.io.ByteArrayOutputStream

/**
 * Renders app icons to small PNGs for the WebView and caches the bytes.
 * Icons keep their original colors and transparency; grayscale is applied in
 * CSS so the same bytes work in every theme.
 */
class IconProvider(private val pm: PackageManager, private val apps: AppRepository) {

    private val cache = object : LruCache<String, ByteArray>(CACHE_BYTES) {
        override fun sizeOf(key: String, value: ByteArray) = value.size
    }

    /** PNG bytes for an installed package, or null (caller returns 404). */
    fun iconPng(packageName: String): ByteArray? {
        val entry = apps.find(packageName) ?: return null
        val key = "${entry.packageName}@${entry.updatedAt}"
        cache.get(key)?.let { return it }

        val drawable = try {
            pm.getActivityIcon(ComponentName(entry.packageName, entry.activityName))
        } catch (_: PackageManager.NameNotFoundException) {
            try { pm.getApplicationIcon(entry.packageName) } catch (_: PackageManager.NameNotFoundException) { return null }
        } catch (_: RuntimeException) {
            return null
        }

        val bitmap = Bitmap.createBitmap(ICON_PX, ICON_PX, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        drawable.setBounds(0, 0, ICON_PX, ICON_PX)
        drawable.draw(canvas)
        val bytes = ByteArrayOutputStream(16 * 1024).use { out ->
            bitmap.compress(Bitmap.CompressFormat.PNG, 100, out)
            out.toByteArray()
        }
        bitmap.recycle()
        cache.put(key, bytes)
        return bytes
    }

    fun trim() = cache.evictAll()

    companion object {
        private const val ICON_PX = 144
        private const val CACHE_BYTES = 3 * 1024 * 1024
    }
}
