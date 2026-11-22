package id.hengki.monovra

import android.app.Application
import android.content.ComponentCallbacks2
import id.hengki.monovra.apps.AppRepository
import id.hengki.monovra.apps.IconProvider
import id.hengki.monovra.media.MediaRepository
import id.hengki.monovra.settings.MonovraSettings
import id.hengki.monovra.settings.SettingsRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn

/** Process-wide singletons. Kept deliberately small: no DI framework. */
class MonovraApp : Application() {

    val appScope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)

    lateinit var settings: SettingsRepository
        private set
    lateinit var settingsState: StateFlow<MonovraSettings>
        private set
    lateinit var apps: AppRepository
        private set
    lateinit var icons: IconProvider
        private set
    lateinit var media: MediaRepository
        private set

    override fun onCreate() {
        super.onCreate()
        settings = SettingsRepository(this)
        settingsState = settings.settings.stateIn(appScope, SharingStarted.Eagerly, MonovraSettings())
        apps = AppRepository(this, appScope).also { it.start() }
        icons = IconProvider(packageManager, apps)
        media = MediaRepository(this, appScope, apps) { settingsState.value.preferredMusicApp }
    }

    @Suppress("DEPRECATION")
    override fun onTrimMemory(level: Int) {
        super.onTrimMemory(level)
        if (level >= ComponentCallbacks2.TRIM_MEMORY_UI_HIDDEN) {
            icons.trim()
            media.trim()
        }
    }
}
