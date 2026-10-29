package com.ficmanagerapp

import android.app.DownloadManager
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.media.MediaScannerConnection
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.util.Base64
import android.util.Log
import androidx.core.content.FileProvider
import com.facebook.react.bridge.*
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL

class NativeReportExportModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "NativeReportExport"
        private const val TAG = "NativeReportExport"
    }

    override fun getName(): String = NAME

    /**
     * Download and save a real binary file to the device's public Downloads directory.
     * Uses MediaStore on Android 10+ and direct public Downloads file storage.
     */
    @ReactMethod
    fun downloadAndSaveFile(options: ReadableMap, promise: Promise) {
        Thread {
            try {
                val fileName = options.getString("fileName") ?: "FIC_Report_${System.currentTimeMillis()}.csv"
                val mimeType = options.getString("mimeType") ?: "text/csv"
                val downloadUrl = if (options.hasKey("downloadUrl")) options.getString("downloadUrl") else null
                val base64Data = if (options.hasKey("base64Data")) options.getString("base64Data") else null

                var rawBytes: ByteArray? = null

                if (!base64Data.isNullOrEmpty()) {
                    rawBytes = Base64.decode(base64Data, Base64.DEFAULT)
                } else if (!downloadUrl.isNullOrEmpty()) {
                    val url = URL(downloadUrl)
                    val conn = url.openConnection() as HttpURLConnection
                    conn.connectTimeout = 15000
                    conn.readTimeout = 30000
                    conn.requestMethod = "GET"
                    conn.connect()

                    if (conn.responseCode in 200..299) {
                        conn.inputStream.use { input ->
                            rawBytes = input.readBytes()
                        }
                    } else {
                        throw Exception("Server returned HTTP ${conn.responseCode} while downloading report")
                    }
                    conn.disconnect()
                }

                if (rawBytes == null || rawBytes!!.isEmpty()) {
                    throw Exception("No valid report file bytes received")
                }

                val bytes = rawBytes!!

                // 1. Save to app's external files directory for FileProvider (reliable open/share)
                val appDownloadsDir = reactContext.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS) ?: reactContext.filesDir
                if (!appDownloadsDir.exists()) {
                    appDownloadsDir.mkdirs()
                }
                val localBackingFile = File(appDownloadsDir, fileName)
                if (localBackingFile.exists()) {
                    localBackingFile.delete()
                }
                FileOutputStream(localBackingFile).use { fos ->
                    fos.write(bytes)
                    fos.flush()
                }

                // 2. Save directly to public Downloads folder: /storage/emulated/0/Download/
                var publicFilePath = "/storage/emulated/0/Download/$fileName"
                var publicFileSaved = false
                try {
                    val publicDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
                    if (!publicDir.exists()) {
                        publicDir.mkdirs()
                    }
                    val pubFile = File(publicDir, fileName)
                    if (pubFile.exists()) {
                        pubFile.delete()
                    }
                    FileOutputStream(pubFile).use { fos ->
                        fos.write(bytes)
                        fos.flush()
                    }
                    publicFilePath = pubFile.absolutePath
                    publicFileSaved = pubFile.exists() && pubFile.length() > 0L
                } catch (e: Exception) {
                    Log.w(TAG, "Direct public download write fallback: ${e.message}")
                }

                // 3. Register with MediaStore.Downloads (official Android 10+ standard)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    try {
                        val values = ContentValues().apply {
                            put(MediaStore.MediaColumns.DISPLAY_NAME, fileName)
                            put(MediaStore.MediaColumns.MIME_TYPE, mimeType)
                            put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
                        }
                        val uri = reactContext.contentResolver.insert(
                            MediaStore.Downloads.EXTERNAL_CONTENT_URI,
                            values
                        )
                        if (uri != null) {
                            reactContext.contentResolver.openOutputStream(uri)?.use { os ->
                                os.write(bytes)
                                os.flush()
                            }
                            publicFileSaved = true
                        }
                    } catch (e: Exception) {
                        Log.w(TAG, "MediaStore insert warning: ${e.message}")
                    }
                }

                // 4. Trigger MediaScanner so file appears immediately in Files & Downloads app
                try {
                    MediaScannerConnection.scanFile(
                        reactContext,
                        arrayOf(publicFilePath, localBackingFile.absolutePath),
                        arrayOf(mimeType, mimeType),
                        null
                    )
                } catch (e: Exception) {
                    Log.w(TAG, "MediaScanner notification warning: ${e.message}")
                }

                // 5. Verification
                val verified = localBackingFile.exists() && localBackingFile.length() > 0L
                if (!verified) {
                    throw Exception("File was not saved to device storage")
                }

                // Return public path for display and local path for FileProvider operations
                val displayPath = if (publicFileSaved) publicFilePath else localBackingFile.absolutePath

                val result = Arguments.createMap().apply {
                    putBoolean("success", true)
                    putString("filePath", localBackingFile.absolutePath)
                    putString("displayPath", displayPath)
                    putString("fileName", fileName)
                    putDouble("fileSize", bytes.size.toDouble())
                    putString("mimeType", mimeType)
                }

                Log.d(TAG, "Report saved successfully: $displayPath (${bytes.size} bytes)")
                promise.resolve(result)
            } catch (e: Exception) {
                Log.e(TAG, "Download and save report failed: ${e.message}", e)
                promise.reject("SAVE_FAILED", e.message, e)
            }
        }.start()
    }

    /**
     * Verify whether the downloaded file actually exists on device storage.
     */
    @ReactMethod
    fun verifyFileExists(filePath: String, promise: Promise) {
        try {
            val file = File(filePath)
            val exists = file.exists() && file.isFile && file.length() > 0L
            promise.resolve(exists)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    /**
     * Open the downloaded file with the appropriate Android viewer application
     * (PDF viewer, spreadsheet app for CSV/XLSX).
     * If no compatible application exists, returns { success: false, message: "No compatible app found to open this file." }
     */
    @ReactMethod
    fun openFile(filePath: String, mimeType: String, promise: Promise) {
        try {
            var file = File(filePath)
            if (!file.exists() || file.length() == 0L) {
                // Try checking app's external files directory
                val altFile = File(reactContext.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), file.name)
                // Try checking public Downloads directory
                val pubDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
                val pubFile = File(pubDir, file.name)

                if (altFile.exists() && altFile.length() > 0L) {
                    file = altFile
                } else if (pubFile.exists() && pubFile.length() > 0L) {
                    file = pubFile
                } else {
                    val result = Arguments.createMap().apply {
                        putBoolean("success", false)
                        putString("message", "File does not exist on device.")
                    }
                    promise.resolve(result)
                    return
                }
            }

            val uri: Uri = FileProvider.getUriForFile(
                reactContext,
                "${reactContext.packageName}.fileprovider",
                file
            )

            val intent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(uri, mimeType)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }

            val chooser = Intent.createChooser(intent, "Open report with").apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }

            try {
                reactContext.startActivity(chooser)
                val result = Arguments.createMap().apply {
                    putBoolean("success", true)
                    putString("message", "File opened successfully.")
                }
                promise.resolve(result)
            } catch (e: android.content.ActivityNotFoundException) {
                val result = Arguments.createMap().apply {
                    putBoolean("success", false)
                    putString("message", "No compatible application found to open this file.")
                }
                promise.resolve(result)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Open file failed: ${e.message}", e)
            val result = Arguments.createMap().apply {
                putBoolean("success", false)
                putString("message", e.message ?: "Failed to open file.")
            }
            promise.resolve(result)
        }
    }

    /**
     * Open the native Android share sheet with the REAL downloaded file attachment.
     */
    @ReactMethod
    fun shareFile(filePath: String, mimeType: String, title: String, promise: Promise) {
        try {
            var file = File(filePath)
            if (!file.exists() || file.length() == 0L) {
                val altFile = File(reactContext.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), file.name)
                val pubDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
                val pubFile = File(pubDir, file.name)

                if (altFile.exists() && altFile.length() > 0L) {
                    file = altFile
                } else if (pubFile.exists() && pubFile.length() > 0L) {
                    file = pubFile
                } else {
                    promise.reject("FILE_NOT_FOUND", "File does not exist on device to share.")
                    return
                }
            }

            val uri: Uri = FileProvider.getUriForFile(
                reactContext,
                "${reactContext.packageName}.fileprovider",
                file
            )

            val shareIntent = Intent(Intent.ACTION_SEND).apply {
                type = mimeType
                putExtra(Intent.EXTRA_STREAM, uri)
                putExtra(Intent.EXTRA_SUBJECT, title)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }

            val chooser = Intent.createChooser(shareIntent, title).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }

            reactContext.startActivity(chooser)
            val result = Arguments.createMap().apply {
                putBoolean("success", true)
            }
            promise.resolve(result)
        } catch (e: Exception) {
            Log.e(TAG, "Share file failed: ${e.message}", e)
            promise.reject("SHARE_FAILED", e.message, e)
        }
    }
}
