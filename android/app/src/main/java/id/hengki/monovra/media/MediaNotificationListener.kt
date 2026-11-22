package id.hengki.monovra.media

import android.service.notification.NotificationListenerService
import id.hengki.monovra.MonovraApp

/**
 * Exists only so Android allows MediaSessionManager.getActiveSessions() for
 * MONOVRA after the user grants Notification Access. Notifications are never
 * read or stored. The system binds/unbinds this service; it does no work.
 */
class MediaNotificationListener : NotificationListenerService() {
    override fun onListenerConnected() {
        (application as? MonovraApp)?.media?.onAccessChanged()
    }

    override fun onListenerDisconnected() {
        (application as? MonovraApp)?.media?.onAccessChanged()
    }
}
