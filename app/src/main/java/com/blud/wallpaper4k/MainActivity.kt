package com.blud.wallpaper4k

import android.app.WallpaperManager
import android.content.ComponentName
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.ImageDecoder
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.widget.Button
import android.widget.ImageView
import android.widget.RadioGroup
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import java.util.concurrent.Executors
import kotlin.math.max
import kotlin.math.roundToInt

class MainActivity : AppCompatActivity() {

    private val worker = Executors.newSingleThreadExecutor()
    private val main = Handler(Looper.getMainLooper())

    private lateinit var preview: ImageView
    private lateinit var info: TextView
    private lateinit var targetGroup: RadioGroup
    private lateinit var applyButton: Button

    /** Decoded photo waiting to be applied (null if a video, or nothing, is selected). */
    private var pendingBitmap: Bitmap? = null
    private var videoReady = false

    private val picker = registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri != null) onMediaPicked(uri)
    }

    private val liveWallpaperPicker =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        preview = findViewById(R.id.preview)
        info = findViewById(R.id.info)
        targetGroup = findViewById(R.id.targetGroup)
        applyButton = findViewById(R.id.applyButton)

        findViewById<Button>(R.id.chooseButton).setOnClickListener {
            picker.launch(arrayOf("image/*", "video/*"))
        }
        applyButton.setOnClickListener { apply() }
    }

    override fun onDestroy() {
        worker.shutdown()
        super.onDestroy()
    }

    private fun onMediaPicked(uri: Uri) {
        val isVideo = contentResolver.getType(uri)?.startsWith("video/") == true
        pendingBitmap = null
        videoReady = false
        applyButton.isEnabled = false
        info.setText(R.string.hint)
        Toast.makeText(this, "Loading…", Toast.LENGTH_SHORT).show()

        worker.execute {
            try {
                if (isVideo) loadVideo(uri) else loadImage(uri)
            } catch (t: Throwable) {
                main.post {
                    applyButton.isEnabled = false
                    Toast.makeText(this, "Couldn't load that file: ${t.message}", Toast.LENGTH_LONG).show()
                }
            }
        }
    }

    private fun loadImage(uri: Uri) {
        var originalW = 0
        var originalH = 0
        val bitmap = ImageDecoder.decodeBitmap(ImageDecoder.createSource(contentResolver, uri)) { decoder, imageInfo, _ ->
            decoder.allocator = ImageDecoder.ALLOCATOR_SOFTWARE
            originalW = imageInfo.size.width
            originalH = imageInfo.size.height
            val longSide = max(originalW, originalH)
            if (longSide > MAX_SIDE) {
                val scale = MAX_SIDE.toFloat() / longSide
                decoder.setTargetSize(
                    (originalW * scale).roundToInt().coerceAtLeast(1),
                    (originalH * scale).roundToInt().coerceAtLeast(1)
                )
            }
        }
        main.post {
            pendingBitmap = bitmap
            preview.setImageBitmap(bitmap)
            info.text = "Photo: ${originalW}×${originalH} → applying at ${bitmap.width}×${bitmap.height}" +
                if (max(originalW, originalH) < MAX_SIDE) " (source is below 4K; it isn't upscaled)" else ""
            applyButton.isEnabled = true
        }
    }

    private fun loadVideo(uri: Uri) {
        VideoStore.save(this, uri)
        val retriever = MediaMetadataRetriever()
        var frame: Bitmap? = null
        var w = "?"
        var h = "?"
        try {
            retriever.setDataSource(VideoStore.currentFile(this)!!.absolutePath)
            frame = retriever.getFrameAtTime(0)
            w = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_WIDTH) ?: "?"
            h = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_HEIGHT) ?: "?"
        } finally {
            retriever.release()
        }
        main.post {
            videoReady = true
            frame?.let { preview.setImageBitmap(it) }
            info.text = "Video: ${w}×${h}, plays looped and muted as a live wallpaper (original resolution)."
            applyButton.isEnabled = true
        }
    }

    private fun apply() {
        val bitmap = pendingBitmap
        when {
            bitmap != null -> applyImage(bitmap)
            videoReady -> applyVideo()
            else -> Toast.makeText(this, R.string.nothing_selected, Toast.LENGTH_SHORT).show()
        }
    }

    private fun applyImage(bitmap: Bitmap) {
        val flags = when (targetGroup.checkedRadioButtonId) {
            R.id.targetHome -> WallpaperManager.FLAG_SYSTEM
            R.id.targetLock -> WallpaperManager.FLAG_LOCK
            else -> WallpaperManager.FLAG_SYSTEM or WallpaperManager.FLAG_LOCK
        }
        applyButton.isEnabled = false
        worker.execute {
            val result = runCatching {
                WallpaperManager.getInstance(this).setBitmap(bitmap, null, true, flags)
            }
            main.post {
                applyButton.isEnabled = true
                Toast.makeText(
                    this,
                    if (result.isSuccess) "Wallpaper set" else "Failed: ${result.exceptionOrNull()?.message}",
                    Toast.LENGTH_LONG
                ).show()
            }
        }
    }

    private fun applyVideo() {
        val component = ComponentName(this, VideoWallpaperService::class.java)
        val intent = Intent(WallpaperManager.ACTION_CHANGE_LIVE_WALLPAPER)
            .putExtra(WallpaperManager.EXTRA_LIVE_WALLPAPER_COMPONENT, component)
        try {
            liveWallpaperPicker.launch(intent)
        } catch (e: Exception) {
            // Some launchers don't handle the direct intent; fall back to the generic live-wallpaper chooser.
            startActivity(Intent(WallpaperManager.ACTION_LIVE_WALLPAPER_CHOOSER))
        }
    }

    private companion object {
        /** 4K UHD long side. */
        const val MAX_SIDE = 3840
    }
}
