package id.hengki.monovra.system

import android.app.Activity
import android.app.ActivityOptions
import android.app.PendingIntent
import android.app.role.RoleManager
import android.content.ActivityNotFoundException
import android.content.ComponentName
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.util.Log
import id.hengki.monovra.media.MediaNotificationListener

/** Wrappers around Android system screens. Never bypasses user consent. */
class SystemActions(private val activity: Activity) {

    private val roleManager: RoleManager? = activity.getSystemService(RoleManager::class.java)

    val homeRoleAvailable: Boolean
        get() = roleManager?.isRoleAvailable(RoleManager.ROLE_HOME) == true

    fun isDefaultLauncher(): Boolean {
        if (homeRoleAvailable && roleManager?.isRoleHeld(RoleManager.ROLE_HOME) == true) return true
        val home = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME)
        val resolved = activity.packageManager.resolveActivity(home, 0)
        return resolved?.activityInfo?.packageName == activity.packageName
    }

    /** Intent for the system "choose Home app" dialog, or null if unsupported. */
    fun homeRoleRequestIntent(): Intent? =
        if (homeRoleAvailable) roleManager?.createRequestRoleIntent(RoleManager.ROLE_HOME) else null

    fun openHomeSettings(): Boolean = startFirst(
        Intent(Settings.ACTION_HOME_SETTINGS),
        Intent(Settings.ACTION_MANAGE_DEFAULT_APPS_SETTINGS),
        Intent(Settings.ACTION_SETTINGS),
    )

    fun openNotificationAccessSettings(): Boolean {
        val component = ComponentName(activity, MediaNotificationListener::class.java)
        val detail = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            Intent(Settings.ACTION_NOTIFICATION_LISTENER_DETAIL_SETTINGS)
                .putExtra(Settings.EXTRA_NOTIFICATION_LISTENER_COMPONENT_NAME, component.flattenToString())
        } else null
        return startFirst(
            *listOfNotNull(
                detail,
                Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS),
                Intent(Settings.ACTION_SETTINGS),
            ).toTypedArray()
        )
    }

    /** MONOVRA's own App Info page (needed for "Allow restricted settings" on Android 13+). */
    fun openOwnAppInfo(): Boolean = startFirst(
        Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.fromParts("package", activity.packageName, null)),
    )

    fun start(intent: Intent): Boolean = try {
        activity.startActivity(intent)
        true
    } catch (e: ActivityNotFoundException) {
        Log.w(TAG, "No activity for $intent")
        false
    } catch (e: SecurityException) {
        Log.w(TAG, "Not allowed to start $intent", e)
        false
    }

    fun send(pendingIntent: PendingIntent): Boolean = try {
        val options = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            @Suppress("DEPRECATION")
            ActivityOptions.makeBasic()
                .setPendingIntentBackgroundActivityStartMode(ActivityOptions.MODE_BACKGROUND_ACTIVITY_START_ALLOWED)
                .toBundle()
        } else null
        pendingIntent.send(activity, 0, null, null, null, null, options)
        true
    } catch (e: PendingIntent.CanceledException) {
        false
    } catch (e: RuntimeException) {
        Log.w(TAG, "Session activity failed", e)
        false
    }

    private fun startFirst(vararg intents: Intent): Boolean =
        intents.any { start(it.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) }

    companion object { private const val TAG = "Monovra" }
}
