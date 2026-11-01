package com.ficmanagerapp

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.soloader.SoLoader

class MainApplication : Application(), ReactApplication {

  override val reactNativeHost: ReactNativeHost =
      object : DefaultReactNativeHost(this) {
        override fun getPackages(): List<ReactPackage> =
            PackageList(this).packages.apply {
              add(NativeImagePickerPackage())
              add(NativeAudioPackage())
              add(NativeReportExportPackage())
            }

        override fun getJSMainModuleName(): String = "index"

        override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

        override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
        override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
      }

  override val reactHost: ReactHost
    get() = getDefaultReactHost(applicationContext, reactNativeHost)

  override fun onCreate() {
    super.onCreate()
    SoLoader.init(this, false)
    createNotificationChannels()
    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      load()
    }
  }
  private fun createNotificationChannels() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val notificationManager = getSystemService(NotificationManager::class.java)
      val channel1 = NotificationChannel(
        "fic_notifications_channel",
        "Manager Notifications",
        NotificationManager.IMPORTANCE_HIGH
      ).apply {
        description = "High priority manager alerts and task updates"
        enableVibration(true)
      }
      val channel2 = NotificationChannel(
        "manager_alerts_channel",
        "Manager Urgent Alerts",
        NotificationManager.IMPORTANCE_HIGH
      ).apply {
        description = "Urgent manager notifications and critical alerts"
        enableVibration(true)
      }
      val channel3 = NotificationChannel(
        "manager_routine_channel",
        "Manager Routine Updates",
        NotificationManager.IMPORTANCE_DEFAULT
      ).apply {
        description = "Routine operations and sync updates"
      }
      notificationManager?.createNotificationChannel(channel1)
      notificationManager?.createNotificationChannel(channel2)
      notificationManager?.createNotificationChannel(channel3)
    }
  }

}
