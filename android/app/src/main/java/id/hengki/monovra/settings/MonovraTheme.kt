package id.hengki.monovra.settings

import android.content.res.Configuration
import android.graphics.Color

/**
 * The MONOVRA color themes. Colors mirror the CSS tokens in frontend/src/styles.css
 * and are used natively for the window/system bars so there is no flash of a
 * wrong color before the WebView paints.
 */
enum class MonovraTheme(val id: String, val background: Int, val lightSurface: Boolean) {
    BLACK("black", Color.parseColor("#000000"), lightSurface = false),
    WHITE("white", Color.parseColor("#FFFFFF"), lightSurface = true);
}

/**
 * What the driver chose: a fixed theme, or AUTO to follow Android's dark mode
 * (night mode of the head unit). Unknown stored ids (e.g. the removed "gray"
 * theme) fall back to [DEFAULT].
 */
enum class ThemePreference(val id: String) {
    AUTO("auto"),
    BLACK("black"),
    WHITE("white");

    /** The color theme to paint with, given the current system configuration. */
    fun resolve(config: Configuration): MonovraTheme = when (this) {
        BLACK -> MonovraTheme.BLACK
        WHITE -> MonovraTheme.WHITE
        AUTO -> if (config.isNight()) MonovraTheme.BLACK else MonovraTheme.WHITE
    }

    companion object {
        val DEFAULT = BLACK
        fun fromId(id: String?): ThemePreference? = entries.firstOrNull { it.id == id }
    }
}

fun Configuration.isNight(): Boolean =
    (uiMode and Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES
