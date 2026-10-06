package com.blud.wallpaper4k

import android.content.Context
import android.net.Uri
import java.io.File

/** Keeps the user's chosen wallpaper video in app-private storage so the live wallpaper can always read it. */
object VideoStore {
    private const val PREFS = "wallpaper"
    private const val KEY_FILE = "video_file"

    /** Copies [uri] into private storage under a fresh name, makes it current, and deletes older copies. */
    fun save(context: Context, uri: Uri) {
        val name = "wallpaper_video_${System.currentTimeMillis()}.mp4"
        val dest = File(context.filesDir, name)
        val input = context.contentResolver.openInputStream(uri)
            ?: throw IllegalStateException("Could not open the selected video")
        input.use { src -> dest.outputStream().use { out -> src.copyTo(out) } }

        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit().putString(KEY_FILE, name).apply()

        context.filesDir.listFiles()
            ?.filter { it.name.startsWith("wallpaper_video_") && it.name != name }
            ?.forEach { it.delete() }
    }

    fun currentName(context: Context): String? =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_FILE, null)

    fun currentFile(context: Context): File? =
        currentName(context)?.let { File(context.filesDir, it) }?.takeIf { it.exists() }
}
