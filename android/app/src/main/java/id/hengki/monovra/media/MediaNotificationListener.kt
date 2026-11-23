package id.hengki.monovra.media

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import id.hengki.monovra.MonovraApp

/**
 * Bound by Android after the user grants Notification Access. It serves two
 * purposes:
 *  1. it lets MediaSessionManager.getActiveSessions() work for MONOVRA;
 *  2. it forwards the ongoing turn-by-turn notification of Google Maps or Waze
 *     to [id.hengki.monovra.navigation.NavigationRepository].
 * Notifications from any other app are ignored without being read, and
 * nothing is stored on disk.
 */
class MediaNotificationListener : NotificationListenerService() {
    private val app get() = application as? MonovraApp

    override fun onListenerConnected() {
        app?.media?.onAccessChanged()
        app?.navigation?.resync(try { activeNotifications } catch (_: SecurityException) { null })
    }

    override fun onListenerDisconnected() {
        app?.media?.onAccessChanged()
        app?.navigation?.clear()
    }

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        app?.navigation?.onPosted(sbn)
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification) {
        app?.navigation?.onRemoved(sbn)
    }
}
