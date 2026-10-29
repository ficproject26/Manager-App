package com.ficmanagerapp

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.MediaMetadataRetriever
import android.media.MediaPlayer
import android.media.MediaRecorder
import android.net.Uri
import android.os.Build
import android.provider.OpenableColumns
import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.io.File
import java.io.FileOutputStream

class NativeAudioModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), ActivityEventListener {

    companion object {
        const val NAME = "NativeAudio"
        private const val TAG = "NativeAudio"
        private const val REQUEST_PICK_AUDIO = 2001
    }

    private var recorder: MediaRecorder? = null
    private var player: MediaPlayer? = null
    private var currentRecordingFile: File? = null
    private var recordingStartTime: Long = 0
    private var pendingPickPromise: Promise? = null

    init {
        reactContext.addActivityEventListener(this)
    }

    override fun getName(): String = NAME

    // ─── 1. REAL MICROPHONE RECORDING ────────────────────────────

    @ReactMethod
    fun startRecording(promise: Promise) {
        try {
            stopCurrentRecordingInternal()
            stopCurrentPlayerInternal()

            val outputFile = File.createTempFile("FIC_AUDIO_", ".m4a", reactContext.cacheDir)
            currentRecordingFile = outputFile
            recordingStartTime = System.currentTimeMillis()

            val rec = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                MediaRecorder(reactContext)
            } else {
                @Suppress("DEPRECATION")
                MediaRecorder()
            }

            rec.setAudioSource(MediaRecorder.AudioSource.MIC)
            rec.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
            rec.setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
            rec.setAudioEncodingBitRate(128000)
            rec.setAudioSamplingRate(44100)
            rec.setOutputFile(outputFile.absolutePath)
            rec.prepare()
            rec.start()

            recorder = rec
            Log.d(TAG, "RECORD START: ${outputFile.absolutePath}")
            promise.resolve(outputFile.absolutePath)
        } catch (e: Exception) {
            Log.e(TAG, "RECORD START FAILED: ${e.message}", e)
            currentRecordingFile = null
            recorder = null
            promise.reject("RECORDING_START_FAILED", e.message, e)
        }
    }

    @ReactMethod
    fun getRecordingStatus(promise: Promise) {
        val rec = recorder
        val map = Arguments.createMap()
        if (rec != null) {
            try {
                val maxAmp = rec.maxAmplitude
                val elapsed = Math.max(0, ((System.currentTimeMillis() - recordingStartTime) / 1000).toInt())
                map.putBoolean("isRecording", true)
                map.putInt("elapsedSeconds", elapsed)
                map.putInt("amplitude", maxAmp)
            } catch (e: Exception) {
                map.putBoolean("isRecording", true)
                map.putInt("elapsedSeconds", 0)
                map.putInt("amplitude", 0)
            }
        } else {
            map.putBoolean("isRecording", false)
            map.putInt("elapsedSeconds", 0)
            map.putInt("amplitude", 0)
        }
        promise.resolve(map)
    }

    @ReactMethod
    fun stopRecording(promise: Promise) {
        val rec = recorder
        if (rec == null) {
            promise.reject("NOT_RECORDING", "No active recording")
            return
        }

        try {
            val elapsedMillis = System.currentTimeMillis() - recordingStartTime
            // Guarantee at least 800ms before stopping to prevent MediaRecorder crash on Android
            if (elapsedMillis < 800) {
                Thread.sleep(800 - elapsedMillis)
            }

            rec.stop()
            rec.release()
            recorder = null

            val finalElapsed = System.currentTimeMillis() - recordingStartTime
            val durationSeconds = Math.max(1, (finalElapsed / 1000).toInt())
            val file = currentRecordingFile
            val path = file?.absolutePath ?: ""
            val fileSize = file?.length() ?: 0

            Log.d(TAG, "RECORD STOP: $path (size: $fileSize bytes, duration: $durationSeconds s)")

            val map = Arguments.createMap().apply {
                putString("filePath", path)
                putString("fileName", file?.name ?: "voice_note.m4a")
                putDouble("fileSize", fileSize.toDouble())
                putString("mimeType", "audio/m4a")
                putInt("durationSeconds", durationSeconds)
            }
            promise.resolve(map)
        } catch (e: Exception) {
            Log.e(TAG, "RECORD STOP FAILED: ${e.message}", e)
            recorder = null
            promise.reject("RECORDING_STOP_FAILED", e.message, e)
        }
    }

    // ─── 2. REAL AUDIO FILE PICKER ───────────────────────────────

    @ReactMethod
    fun pickAudioFile(promise: Promise) {
        val activity = currentActivity
        if (activity == null) {
            promise.reject("ACTIVITY_NOT_FOUND", "Activity doesn't exist")
            return
        }

        pendingPickPromise = promise
        try {
            val intent = Intent(Intent.ACTION_GET_CONTENT).apply {
                type = "audio/*"
                putExtra(
                    Intent.EXTRA_MIME_TYPES,
                    arrayOf(
                        "audio/mpeg",
                        "audio/mp4",
                        "audio/x-m4a",
                        "audio/aac",
                        "audio/wav",
                        "audio/*"
                    )
                )
                addCategory(Intent.CATEGORY_OPENABLE)
            }
            activity.startActivityForResult(intent, REQUEST_PICK_AUDIO)
        } catch (e: Exception) {
            pendingPickPromise = null
            promise.reject("PICK_AUDIO_FAILED", e.message, e)
        }
    }

    override fun onActivityResult(
        activity: Activity?,
        requestCode: Int,
        resultCode: Int,
        data: Intent?
    ) {
        if (requestCode == REQUEST_PICK_AUDIO) {
            val promise = pendingPickPromise
            pendingPickPromise = null

            if (resultCode == Activity.RESULT_OK && data?.data != null) {
                val sourceUri = data.data!!
                try {
                    val fileName = queryFileName(sourceUri) ?: "uploaded_audio.m4a"
                    val ext = if (fileName.contains(".")) fileName.substringAfterLast(".") else "m4a"
                    val destFile = File.createTempFile("FIC_UPLOAD_", ".$ext", reactContext.cacheDir)

                    reactContext.contentResolver.openInputStream(sourceUri)?.use { input ->
                        FileOutputStream(destFile).use { output ->
                            input.copyTo(output)
                        }
                    }

                    val fileSize = destFile.length()
                    val mimeType = reactContext.contentResolver.getType(sourceUri) ?: "audio/$ext"

                    var durationSeconds = 0
                    try {
                        val retriever = MediaMetadataRetriever()
                        retriever.setDataSource(destFile.absolutePath)
                        val durStr = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)
                        retriever.release()
                        if (durStr != null) {
                            durationSeconds = Math.max(1, (durStr.toLong() / 1000).toInt())
                        }
                    } catch (e: Exception) {
                        Log.w(TAG, "Could not extract metadata: ${e.message}")
                    }

                    Log.d(TAG, "AUDIO PICKED: ${destFile.absolutePath} ($fileName, $fileSize bytes, $durationSeconds s)")

                    val map = Arguments.createMap().apply {
                        putString("filePath", destFile.absolutePath)
                        putString("fileName", fileName)
                        putDouble("fileSize", fileSize.toDouble())
                        putString("mimeType", mimeType)
                        putInt("durationSeconds", durationSeconds)
                    }
                    promise?.resolve(map)
                } catch (e: Exception) {
                    Log.e(TAG, "FAILED TO READ PICKED AUDIO: ${e.message}", e)
                    promise?.reject("READ_AUDIO_FAILED", e.message, e)
                }
            } else {
                // User cancelled picker
                Log.d(TAG, "AUDIO PICKER CANCELLED BY USER")
                promise?.resolve(null)
            }
        }
    }

    override fun onNewIntent(intent: Intent?) {}

    // ─── 3. REAL AUDIBLE PLAYBACK (LOUDSPEAKER ROUTED) ───────────

    @ReactMethod
    fun startPlayback(filePath: String, promise: Promise) {
        try {
            stopCurrentPlayerInternal()

            val cleanPath = if (filePath.startsWith("file://")) filePath.substring(7) else filePath
            val file = File(cleanPath)
            if (!file.exists()) {
                Log.e(TAG, "FILE NOT FOUND: $cleanPath")
                promise.reject("FILE_NOT_FOUND", "Audio file does not exist at: $cleanPath")
                return
            }

            Log.d(TAG, "PLAY START: $cleanPath (size: ${file.length()} bytes)")

            // Force Loudspeaker Audio Route
            val audioManager = reactContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
            audioManager.mode = AudioManager.MODE_NORMAL
            audioManager.isSpeakerphoneOn = true

            val mp = MediaPlayer()
            val audioAttributes = AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_MEDIA)
                .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                .build()
            mp.setAudioAttributes(audioAttributes)
            mp.setVolume(1.0f, 1.0f)
            mp.setDataSource(cleanPath)
            mp.prepare()

            mp.setOnCompletionListener {
                Log.d(TAG, "PLAY COMPLETED")
                emitPlaybackEvent("onPlaybackEnded", null)
            }
            mp.setOnErrorListener { _, what, extra ->
                Log.e(TAG, "PLAYBACK ERROR: what=$what, extra=$extra")
                emitPlaybackEvent("onPlaybackError", null)
                true
            }

            mp.start()
            player = mp

            val durationSecs = Math.max(1, mp.duration / 1000)
            val map = Arguments.createMap().apply {
                putInt("duration", durationSecs)
            }
            promise.resolve(map)
        } catch (e: Exception) {
            Log.e(TAG, "PLAYBACK FAILED: ${e.message}", e)
            promise.reject("PLAYBACK_FAILED", e.message, e)
        }
    }

    @ReactMethod
    fun pausePlayback(promise: Promise) {
        try {
            player?.let {
                if (it.isPlaying) {
                    it.pause()
                    Log.d(TAG, "PLAY PAUSED")
                }
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("PAUSE_FAILED", e.message, e)
        }
    }

    @ReactMethod
    fun resumePlayback(promise: Promise) {
        try {
            player?.let {
                if (!it.isPlaying) {
                    it.start()
                    Log.d(TAG, "PLAY RESUMED")
                }
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("RESUME_FAILED", e.message, e)
        }
    }

    @ReactMethod
    fun stopPlayback(promise: Promise) {
        stopCurrentPlayerInternal()
        Log.d(TAG, "PLAY STOPPED")
        promise.resolve(true)
    }

    @ReactMethod
    fun getPlaybackStatus(promise: Promise) {
        val mp = player
        val map = Arguments.createMap()
        if (mp != null) {
            try {
                map.putBoolean("isPlaying", mp.isPlaying)
                map.putInt("currentPosition", mp.currentPosition / 1000)
                map.putInt("duration", mp.duration / 1000)
            } catch (e: Exception) {
                map.putBoolean("isPlaying", false)
                map.putInt("currentPosition", 0)
                map.putInt("duration", 0)
            }
        } else {
            map.putBoolean("isPlaying", false)
            map.putInt("currentPosition", 0)
            map.putInt("duration", 0)
        }
        promise.resolve(map)
    }

    private fun stopCurrentRecordingInternal() {
        try {
            recorder?.stop()
            recorder?.release()
        } catch (e: Exception) {}
        recorder = null
    }

    private fun stopCurrentPlayerInternal() {
        try {
            player?.stop()
            player?.release()
        } catch (e: Exception) {}
        player = null
    }

    private fun emitPlaybackEvent(eventName: String, params: WritableMap?) {
        if (reactContext.hasActiveReactInstance()) {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(eventName, params)
        }
    }

    @ReactMethod
    fun addListener(eventName: String) {
        // Keep: Required for RN built-in NativeEventEmitter calls
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Keep: Required for RN built-in NativeEventEmitter calls
    }

    private fun queryFileName(uri: Uri): String? {
        if (uri.scheme == "content") {
            try {
                reactContext.contentResolver.query(uri, null, null, null, null)?.use { cursor ->
                    if (cursor.moveToFirst()) {
                        val nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                        if (nameIndex != -1) {
                            return cursor.getString(nameIndex)
                        }
                    }
                }
            } catch (e: Exception) {}
        }
        return uri.path?.let { File(it).name }
    }
}
