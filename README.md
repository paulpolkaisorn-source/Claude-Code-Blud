# Wallpaper 4K

For Mr. CLAWD. Android app (Kotlin, minSdk 28) that sets your phone wallpaper from a photo or video you pick.

- **Photos**: decoded at up to 4K (3840 px long side, never upscaled) and applied to home screen, lock screen, or both via `WallpaperManager`.
- **Videos**: copied into app storage and played looped + muted by a live wallpaper service at the video's original resolution (4K plays if your phone's decoder supports it). Android's live-wallpaper screen asks you to confirm.

## Install
Grab `Wallpaper4K-debug.apk` from the repo root (or the `Wallpaper4K-debug-apk` artifact from the *Build APK* GitHub Action), copy it to your phone, and allow "install unknown apps".

## Build
`./gradlew assembleDebug` (needs JDK 17+ and the Android SDK, platform 35) → `app/build/outputs/apk/debug/app-debug.apk`.
