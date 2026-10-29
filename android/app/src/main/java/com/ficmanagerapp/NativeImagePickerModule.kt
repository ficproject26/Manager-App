package com.ficmanagerapp

import android.app.Activity
import android.content.ClipData
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Environment
import android.provider.MediaStore
import androidx.core.content.FileProvider
import com.facebook.react.bridge.*
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream

class NativeImagePickerModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), ActivityEventListener {

    companion object {
        const val NAME = "NativeImagePicker"
        private const val REQUEST_CAMERA = 1001
        private const val REQUEST_GALLERY = 1002
    }

    private var pendingPromise: Promise? = null
    private var currentPhotoPath: String? = null

    init {
        reactContext.addActivityEventListener(this)
    }

    override fun getName(): String = NAME

    @Synchronized
    private fun resolvePendingPromise(result: WritableMap?) {
        val promise = pendingPromise ?: return
        pendingPromise = null
        currentPhotoPath = null
        try {
            promise.resolve(result)
        } catch (e: Exception) {
            // Ignore if promise was already resolved
        }
    }

    @Synchronized
    private fun rejectPendingPromise(code: String, message: String?, throwable: Throwable? = null) {
        val promise = pendingPromise ?: return
        pendingPromise = null
        currentPhotoPath = null
        try {
            promise.reject(code, message, throwable)
        } catch (e: Exception) {
            // Ignore if promise was already rejected
        }
    }

    @ReactMethod
    fun launchCamera(promise: Promise) {
        val activity = currentActivity
        if (activity == null) {
            promise.reject("ACTIVITY_NOT_FOUND", "Activity doesn't exist")
            return
        }

        try {
            // Clear any stale promise
            pendingPromise?.let {
                try { it.resolve(null) } catch (ignored: Exception) {}
            }
            pendingPromise = promise

            // Use cache dir which is always configured in FileProvider
            val storageDir = File(activity.cacheDir, "camera_photos")
            if (!storageDir.exists()) {
                storageDir.mkdirs()
            }

            val photoFile = File(storageDir, "FIC_CAM_${System.currentTimeMillis()}.jpg")
            if (!photoFile.exists()) {
                photoFile.createNewFile()
            }
            currentPhotoPath = photoFile.absolutePath

            val authority = "${activity.packageName}.fileprovider"
            val photoUri: Uri = FileProvider.getUriForFile(
                activity,
                authority,
                photoFile
            )

            val intent = Intent(MediaStore.ACTION_IMAGE_CAPTURE).apply {
                putExtra(MediaStore.EXTRA_OUTPUT, photoUri)
                clipData = ClipData.newRawUri("photo", photoUri)
                addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION or Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }

            // Explicitly grant URI permission to all camera packages
            try {
                val resInfoList = activity.packageManager.queryIntentActivities(
                    intent,
                    PackageManager.MATCH_DEFAULT_ONLY
                )
                for (resolveInfo in resInfoList) {
                    val packageName = resolveInfo.activityInfo.packageName
                    activity.grantUriPermission(
                        packageName,
                        photoUri,
                        Intent.FLAG_GRANT_WRITE_URI_PERMISSION or Intent.FLAG_GRANT_READ_URI_PERMISSION
                    )
                }
            } catch (permEx: Exception) {
                // Ignore permission grant query issue
            }

            activity.startActivityForResult(intent, REQUEST_CAMERA)
        } catch (e: Exception) {
            rejectPendingPromise("CAMERA_LAUNCH_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun launchGallery(promise: Promise) {
        val activity = currentActivity
        if (activity == null) {
            promise.reject("ACTIVITY_NOT_FOUND", "Activity doesn't exist")
            return
        }

        try {
            // Clear any stale promise
            pendingPromise?.let {
                try { it.resolve(null) } catch (ignored: Exception) {}
            }
            pendingPromise = promise

            val intent = Intent(Intent.ACTION_PICK, MediaStore.Images.Media.EXTERNAL_CONTENT_URI).apply {
                type = "image/*"
            }
            if (intent.resolveActivity(activity.packageManager) == null) {
                val fallbackIntent = Intent(Intent.ACTION_GET_CONTENT).apply {
                    type = "image/*"
                    addCategory(Intent.CATEGORY_OPENABLE)
                }
                activity.startActivityForResult(Intent.createChooser(fallbackIntent, "Select Image"), REQUEST_GALLERY)
            } else {
                activity.startActivityForResult(intent, REQUEST_GALLERY)
            }
        } catch (e: Exception) {
            rejectPendingPromise("GALLERY_LAUNCH_ERROR", e.message, e)
        }
    }

    override fun onActivityResult(activity: Activity?, requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode != REQUEST_CAMERA && requestCode != REQUEST_GALLERY) {
            return
        }

        if (resultCode != Activity.RESULT_OK) {
            resolvePendingPromise(null)
            return
        }

        try {
            when (requestCode) {
                REQUEST_CAMERA -> {
                    val path = currentPhotoPath
                    if (path != null && File(path).exists() && File(path).length() > 0) {
                        val result = Arguments.createMap().apply {
                            putString("uri", "file://$path")
                            putString("fileName", File(path).name)
                            putBoolean("didCancel", false)
                        }
                        resolvePendingPromise(result)
                        return
                    }

                    // If file is empty or camera returned data via intent
                    if (data?.data != null) {
                        val destFile = File(
                            reactContext.cacheDir,
                            "FIC_CAM_INTENT_${System.currentTimeMillis()}.jpg"
                        )
                        reactContext.contentResolver.openInputStream(data.data!!)?.use { input ->
                            destFile.outputStream().use { output ->
                                input.copyTo(output)
                            }
                        }
                        val result = Arguments.createMap().apply {
                            putString("uri", "file://${destFile.absolutePath}")
                            putString("fileName", destFile.name)
                            putBoolean("didCancel", false)
                        }
                        resolvePendingPromise(result)
                        return
                    }

                    // Fallback to thumbnail bitmap if available in extras
                    val extras = data?.extras
                    val thumbObj = extras?.get("data")
                    if (thumbObj is Bitmap) {
                        val destFile = File(
                            reactContext.cacheDir,
                            "FIC_CAM_THUMB_${System.currentTimeMillis()}.jpg"
                        )
                        FileOutputStream(destFile).use { out ->
                            thumbObj.compress(Bitmap.CompressFormat.JPEG, 92, out)
                        }
                        val result = Arguments.createMap().apply {
                            putString("uri", "file://${destFile.absolutePath}")
                            putString("fileName", destFile.name)
                            putBoolean("didCancel", false)
                        }
                        resolvePendingPromise(result)
                        return
                    }

                    // If path exists even if smaller, check if bitmap can be decoded
                    if (path != null && File(path).exists()) {
                        val result = Arguments.createMap().apply {
                            putString("uri", "file://$path")
                            putString("fileName", File(path).name)
                            putBoolean("didCancel", false)
                        }
                        resolvePendingPromise(result)
                        return
                    }

                    resolvePendingPromise(null)
                }
                REQUEST_GALLERY -> {
                    val selectedImageUri = data?.data
                    if (selectedImageUri != null) {
                        val destFile = File(
                            reactContext.cacheDir,
                            "FIC_GALLERY_${System.currentTimeMillis()}.jpg"
                        )
                        reactContext.contentResolver.openInputStream(selectedImageUri)?.use { input ->
                            destFile.outputStream().use { output ->
                                input.copyTo(output)
                            }
                        }

                        val result = Arguments.createMap().apply {
                            putString("uri", "file://${destFile.absolutePath}")
                            putString("fileName", destFile.name)
                            putBoolean("didCancel", false)
                        }
                        resolvePendingPromise(result)
                    } else {
                        resolvePendingPromise(null)
                    }
                }
            }
        } catch (e: Exception) {
            rejectPendingPromise("PROCESS_ERROR", e.message, e)
        }
    }

    override fun onNewIntent(intent: Intent?) {}
}

