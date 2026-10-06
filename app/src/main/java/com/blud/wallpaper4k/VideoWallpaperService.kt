package com.blud.wallpaper4k

import android.media.MediaPlayer
import android.service.wallpaper.WallpaperService
import android.view.SurfaceHolder

/** Live wallpaper that loops the video chosen in [MainActivity], muted, scaled to fill the screen. */
class VideoWallpaperService : WallpaperService() {

    override fun onCreateEngine(): Engine = VideoEngine()

    private inner class VideoEngine : Engine() {
        private var player: MediaPlayer? = null
        private var playingName: String? = null

        override fun onSurfaceCreated(holder: SurfaceHolder) {
            super.onSurfaceCreated(holder)
            startPlayer(holder)
        }

        override fun onSurfaceDestroyed(holder: SurfaceHolder) {
            releasePlayer()
            super.onSurfaceDestroyed(holder)
        }

        override fun onVisibilityChanged(visible: Boolean) {
            if (visible) {
                // A newly chosen video is picked up the next time the wallpaper becomes visible.
                if (playingName != VideoStore.currentName(this@VideoWallpaperService)) {
                    startPlayer(surfaceHolder)
                } else {
                    runCatching { player?.start() }
                }
            } else {
                runCatching { player?.pause() }
            }
        }

        override fun onDestroy() {
            releasePlayer()
            super.onDestroy()
        }

        private fun startPlayer(holder: SurfaceHolder) {
            releasePlayer()
            val file = VideoStore.currentFile(this@VideoWallpaperService) ?: return
            playingName = file.name
            try {
                player = MediaPlayer().apply {
                    setDataSource(file.absolutePath)
                    setSurface(holder.surface)
                    isLooping = true
                    setVolume(0f, 0f)
                    setOnPreparedListener { mp ->
                        mp.setVideoScalingMode(MediaPlayer.VIDEO_SCALING_MODE_SCALE_TO_FIT_WITH_CROPPING)
                        if (isVisible) mp.start()
                    }
                    setOnErrorListener { _, _, _ ->
                        releasePlayer()
                        true
                    }
                    prepareAsync()
                }
            } catch (e: Exception) {
                releasePlayer()
            }
        }

        private fun releasePlayer() {
            player?.let { runCatching { it.release() } }
            player = null
            playingName = null
        }
    }
}
