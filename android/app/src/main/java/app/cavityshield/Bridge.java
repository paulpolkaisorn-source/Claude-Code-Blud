package app.cavityshield;

import android.app.NotificationManager;
import android.content.Context;
import android.content.SharedPreferences;
import android.webkit.JavascriptInterface;

/** Exposed to the page as window.AndroidBridge. */
public class Bridge {
    private final Context ctx;

    Bridge(Context ctx) {
        this.ctx = ctx;
    }

    @JavascriptInterface
    public void setReminder(int minutes) {
        Reminders.prefs(ctx).edit().putInt(Reminders.KEY_MINUTES, minutes).apply();
        Reminders.scheduleWater(ctx, minutes);
    }

    /** A glass was logged in the app: restart the water countdown from now. */
    @JavascriptInterface
    public void drank() {
        ctx.getSystemService(NotificationManager.class).cancel(Reminders.NOTIF_WATER);
        Reminders.scheduleWater(ctx, Reminders.prefs(ctx).getInt(Reminders.KEY_MINUTES, 45));
    }

    /** Glasses logged from the notification's "I drank" button since the app last looked. */
    @JavascriptInterface
    public synchronized int takePendingDrinks() {
        SharedPreferences p = Reminders.prefs(ctx);
        int n = p.getInt(Reminders.KEY_PENDING, 0);
        if (n != 0) p.edit().putInt(Reminders.KEY_PENDING, 0).apply();
        return n;
    }
}
