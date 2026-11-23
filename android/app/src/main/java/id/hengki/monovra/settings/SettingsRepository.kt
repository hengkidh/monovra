package id.hengki.monovra.settings

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.emptyPreferences
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "monovra_settings")

data class MonovraSettings(
    val theme: ThemePreference = ThemePreference.DEFAULT,
    /** Ordered list of pinned package names. */
    val favorites: List<String> = emptyList(),
    /** False until the first-run default shortcuts have been chosen. */
    val favoritesInitialized: Boolean = false,
    val preferredMusicApp: String? = null,
) {
    fun toJson(): JSONObject = JSONObject()
        .put("theme", theme.id)
        .put("favorites", JSONArray(favorites))
        .put("preferredMusicApp", preferredMusicApp ?: JSONObject.NULL)
}

/** Persists user preferences with Jetpack DataStore. */
class SettingsRepository(private val context: Context) {

    private object Keys {
        val THEME = stringPreferencesKey("theme")
        val FAVORITES = stringPreferencesKey("favorites")
        val FAVORITES_INITIALIZED = booleanPreferencesKey("favorites_initialized")
        val PREFERRED_MUSIC = stringPreferencesKey("preferred_music_app")
    }

    val settings: Flow<MonovraSettings> = context.dataStore.data
        .catch { e -> if (e is IOException) emit(emptyPreferences()) else throw e }
        .map { p ->
            MonovraSettings(
                theme = ThemePreference.fromId(p[Keys.THEME]) ?: ThemePreference.DEFAULT,
                favorites = p[Keys.FAVORITES]?.split(',')?.filter { it.isNotBlank() } ?: emptyList(),
                favoritesInitialized = p[Keys.FAVORITES_INITIALIZED] ?: false,
                preferredMusicApp = p[Keys.PREFERRED_MUSIC]?.takeIf { it.isNotBlank() },
            )
        }
        .distinctUntilChanged()

    suspend fun current(): MonovraSettings = settings.first()

    suspend fun setTheme(theme: ThemePreference) {
        context.dataStore.edit { it[Keys.THEME] = theme.id }
    }

    suspend fun setFavorites(packages: List<String>) {
        context.dataStore.edit {
            it[Keys.FAVORITES] = packages.joinToString(",")
            it[Keys.FAVORITES_INITIALIZED] = true
        }
    }

    suspend fun setPreferredMusicApp(packageName: String?) {
        context.dataStore.edit {
            if (packageName == null) it.remove(Keys.PREFERRED_MUSIC) else it[Keys.PREFERRED_MUSIC] = packageName
        }
    }
}
