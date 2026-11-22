package id.hengki.monovra.settings

import android.graphics.Color

/**
 * The MONOVRA themes. Colors mirror the CSS tokens in frontend/src/styles.css
 * and are used natively for the window/system bars so there is no flash of a
 * wrong color before the WebView paints. Unknown stored ids (e.g. the removed
 * "gray" theme) fall back to [DEFAULT].
 */
enum class MonovraTheme(val id: String, val background: Int, val lightSurface: Boolean) {
    BLACK("black", Color.parseColor("#000000"), lightSurface = false),
    WHITE("white", Color.parseColor("#FFFFFF"), lightSurface = true);

    companion object {
        val DEFAULT = BLACK
        fun fromId(id: String?): MonovraTheme? = entries.firstOrNull { it.id == id }
    }
}
