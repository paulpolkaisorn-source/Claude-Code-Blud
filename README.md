# Claude-Code-Blud
For Mr. CLAWD

## Cavity Shield

A kid's tooth-care app: daily brushing missions, water tracker with reminders, food guide, meal ideas and a 2-minute brush timer.

- Web version: `cavity-shield.html`
- Android app: download [`android/CavityShield.apk`](android/CavityShield.apk) and install it (allow "install unknown apps" for your browser or file manager).
- Daily menu: `daily/menu.json` is updated by Claude every morning. The app shows it on the Today screen and in a 7:00 notification.

Build the APK yourself: `cd android && ./gradlew assembleRelease` (needs the Android SDK; set `sdk.dir` in `android/local.properties`).
