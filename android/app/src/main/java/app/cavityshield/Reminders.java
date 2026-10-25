package app.cavityshield;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;

/** Water reminders, the morning menu notification, and the notification's "I drank" button. */
public class Reminders extends BroadcastReceiver {
    static final String ACT_WATER = "app.cavityshield.WATER";
    static final String ACT_MENU = "app.cavityshield.MENU";
    static final String ACT_DRANK = "app.cavityshield.DRANK";
    static final String CH_WATER = "water";
    static final String CH_MENU = "menu";
    static final int NOTIF_WATER = 1;
    static final int NOTIF_MENU = 2;
    static final String KEY_MINUTES = "remindMinutes";
    static final String KEY_PENDING = "pendingDrinks";
    static final int QUIET_FROM = 21, QUIET_UNTIL = 7;
    static final int MENU_HOUR = 7;

    static final String[] MENU_URLS = {
            "https://raw.githubusercontent.com/paulpolkaisorn-source/Claude-Code-Blud/refs/heads/claude/vibrant-fermat-1c2b11/daily/menu.json",
            "https://raw.githubusercontent.com/paulpolkaisorn-source/Claude-Code-Blud/refs/heads/main/daily/menu.json"
    };

    static SharedPreferences prefs(Context c) {
        return c.getSharedPreferences("cavityshield", Context.MODE_PRIVATE);
    }

    static PendingIntent broadcast(Context c, String action, int code) {
        Intent i = new Intent(c, Reminders.class).setAction(action);
        return PendingIntent.getBroadcast(c, code, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static PendingIntent openApp(Context c) {
        Intent i = new Intent(c, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(c, 0, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static void ensureChannels(Context c) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        NotificationChannel w = new NotificationChannel(CH_WATER, "Water reminders", NotificationManager.IMPORTANCE_HIGH);
        w.setDescription("Reminds you to drink a glass of water");
        nm.createNotificationChannel(w);
        NotificationChannel m = new NotificationChannel(CH_MENU, "Daily menu from Claude", NotificationManager.IMPORTANCE_DEFAULT);
        m.setDescription("Your tooth-safe food plan every morning");
        nm.createNotificationChannel(m);
    }

    static void scheduleWater(Context c, int minutes) {
        AlarmManager am = c.getSystemService(AlarmManager.class);
        PendingIntent pi = broadcast(c, ACT_WATER, 10);
        am.cancel(pi);
        if (minutes <= 0) return;
        long every = minutes * 60_000L;
        am.setInexactRepeating(AlarmManager.RTC_WAKEUP, System.currentTimeMillis() + every, every, pi);
    }

    static void scheduleMenu(Context c) {
        Calendar cal = Calendar.getInstance();
        cal.set(Calendar.HOUR_OF_DAY, MENU_HOUR);
        cal.set(Calendar.MINUTE, 0);
        cal.set(Calendar.SECOND, 0);
        cal.set(Calendar.MILLISECOND, 0);
        if (cal.getTimeInMillis() <= System.currentTimeMillis()) cal.add(Calendar.DAY_OF_YEAR, 1);
        AlarmManager am = c.getSystemService(AlarmManager.class);
        PendingIntent pi = broadcast(c, ACT_MENU, 11);
        am.cancel(pi);
        am.setInexactRepeating(AlarmManager.RTC_WAKEUP, cal.getTimeInMillis(), AlarmManager.INTERVAL_DAY, pi);
    }

    @Override
    public void onReceive(Context c, Intent intent) {
        String a = intent.getAction();
        if (a == null) return;
        ensureChannels(c);
        switch (a) {
            case ACT_WATER: {
                int h = Calendar.getInstance().get(Calendar.HOUR_OF_DAY);
                if (h >= QUIET_FROM || h < QUIET_UNTIL) return;
                notifyWater(c);
                break;
            }
            case ACT_DRANK: {
                synchronized (Bridge.class) {
                    SharedPreferences p = prefs(c);
                    p.edit().putInt(KEY_PENDING, p.getInt(KEY_PENDING, 0) + 1).apply();
                }
                c.getSystemService(NotificationManager.class).cancel(NOTIF_WATER);
                scheduleWater(c, prefs(c).getInt(KEY_MINUTES, 45));
                break;
            }
            case ACT_MENU: {
                final PendingResult result = goAsync();
                final Context app = c.getApplicationContext();
                new Thread(() -> {
                    try {
                        notifyMenu(app, fetchToday());
                    } finally {
                        result.finish();
                    }
                }).start();
                break;
            }
            case Intent.ACTION_BOOT_COMPLETED:
            case Intent.ACTION_MY_PACKAGE_REPLACED:
                scheduleWater(c, prefs(c).getInt(KEY_MINUTES, 45));
                scheduleMenu(c);
                break;
            default:
                break;
        }
    }

    private static Notification.Builder builder(Context c, String channel) {
        Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(c, channel) : new Notification.Builder(c);
        b.setSmallIcon(R.drawable.ic_stat_tooth).setColor(0xFF0F8F86).setAutoCancel(true).setContentIntent(openApp(c));
        return b;
    }

    static void notifyWater(Context c) {
        Notification.Action drank = new Notification.Action.Builder(null, "I drank a glass", broadcast(c, ACT_DRANK, 12)).build();
        Notification.Builder b = builder(c, CH_WATER)
                .setContentTitle("Water time!")
                .setContentText("Your teeth are thirsty. Drink a glass of water.")
                .addAction(drank);
        if (Build.VERSION.SDK_INT < 26) b.setDefaults(Notification.DEFAULT_ALL).setPriority(Notification.PRIORITY_HIGH);
        post(c, NOTIF_WATER, b.build());
    }

    /** Returns {title, body}; falls back to a generic nudge when offline or the menu is missing. */
    static String[] fetchToday() {
        String today = new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
        for (String u : MENU_URLS) {
            HttpURLConnection con = null;
            try {
                con = (HttpURLConnection) new URL(u + "?t=" + System.currentTimeMillis()).openConnection();
                con.setConnectTimeout(8000);
                con.setReadTimeout(8000);
                con.setUseCaches(false);
                if (con.getResponseCode() != 200) continue;
                JSONObject j = new JSONObject(readAll(con.getInputStream()));
                JSONArray days = j.optJSONArray("days");
                if (days == null) continue;
                for (int i = 0; i < days.length(); i++) {
                    JSONObject d = days.optJSONObject(i);
                    if (d == null || !today.equals(d.optString("date"))) continue;
                    StringBuilder sb = new StringBuilder();
                    JSONArray meals = d.optJSONArray("meals");
                    for (int k = 0; meals != null && k < meals.length(); k++) {
                        JSONArray m = meals.optJSONArray(k);
                        if (m == null || m.length() < 2) continue;
                        if (sb.length() > 0) sb.append('\n');
                        sb.append(m.optString(0)).append(": ").append(m.optString(1));
                    }
                    String note = j.optString("note", "");
                    String body = note.isEmpty() ? sb.toString() : note + "\n\n" + sb;
                    return new String[]{"Your menu from Claude", body};
                }
            } catch (Exception ignored) {
            } finally {
                if (con != null) con.disconnect();
            }
        }
        return new String[]{"Good morning!", "Open Cavity Shield for today's tooth-safe menu. Start with a glass of water."};
    }

    static void notifyMenu(Context c, String[] msg) {
        String preview = msg[1].split("\n")[0];
        Notification n = builder(c, CH_MENU)
                .setContentTitle(msg[0])
                .setContentText(preview)
                .setStyle(new Notification.BigTextStyle().bigText(msg[1]))
                .build();
        post(c, NOTIF_MENU, n);
    }

    private static void post(Context c, int id, Notification n) {
        try {
            c.getSystemService(NotificationManager.class).notify(id, n);
        } catch (SecurityException ignored) {
            // notifications not allowed by the user
        }
    }

    private static String readAll(InputStream in) throws Exception {
        try (InputStream is = in; ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buf = new byte[8192];
            int r;
            while ((r = is.read(buf)) != -1) out.write(buf, 0, r);
            return out.toString("UTF-8");
        }
    }
}
