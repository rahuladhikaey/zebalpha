package com.zebalpha.customer;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import android.util.Log;
import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import java.util.Map;

public class ZebAlphaFirebaseMessagingService extends FirebaseMessagingService {

    private static final String TAG = "ZebAlphaFCMService";
    public static final String PREFS_NAME = "zebalpha_native_prefs";
    public static final String KEY_FCM_TOKEN = "fcm_token";
    public static final String ACTION_FCM_TOKEN = "com.zebalpha.customer.ACTION_FCM_TOKEN";
    public static final String NOTIFICATION_CHANNEL_ID = "zebalpha_alerts_channel";
    public static final String NOTIFICATION_CHANNEL_NAME = "ZebAlpha Drops & Orders";

    /**
     * Ensures the high-importance Android notification channel exists even when woken in background.
     */
    public static void ensureNotificationChannel(Context context) {
        if (context == null || Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        try {
            NotificationManager manager = context.getSystemService(NotificationManager.class);
            if (manager == null) return;

            NotificationChannel existing = manager.getNotificationChannel(NOTIFICATION_CHANNEL_ID);
            if (existing == null) {
                NotificationChannel channel = new NotificationChannel(
                    NOTIFICATION_CHANNEL_ID,
                    NOTIFICATION_CHANNEL_NAME,
                    NotificationManager.IMPORTANCE_HIGH
                );
                channel.setDescription("VIP drops, flash discounts, and real-time order alerts");
                channel.enableLights(true);
                channel.enableVibration(true);
                channel.setShowBadge(true);
                channel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);
                manager.createNotificationChannel(channel);
                Log.i(TAG, "Created notification channel: " + NOTIFICATION_CHANNEL_ID);
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to ensure notification channel", e);
        }
    }

    @Override
    public void onNewToken(@NonNull String token) {
        super.onNewToken(token);
        Log.i(TAG, "FCM token refreshed");
        try {
            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
            prefs.edit().putString(KEY_FCM_TOKEN, token).apply();

            Intent broadcast = new Intent(ACTION_FCM_TOKEN);
            broadcast.setPackage(getPackageName());
            broadcast.putExtra("token", token);
            sendBroadcast(broadcast);
        } catch (Exception e) {
            Log.e(TAG, "Error saving refreshed FCM token", e);
        }
    }

    @Override
    public void onMessageReceived(@NonNull RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);
        ensureNotificationChannel(this);

        Map<String, String> data = remoteMessage.getData();
        RemoteMessage.Notification notif = remoteMessage.getNotification();

        String title = (notif != null && notif.getTitle() != null && !notif.getTitle().isEmpty())
            ? notif.getTitle()
            : (data.get("title") != null ? data.get("title") : "ZebAlpha Alert");

        String message = (notif != null && notif.getBody() != null && !notif.getBody().isEmpty())
            ? notif.getBody()
            : (data.get("body") != null ? data.get("body") : (data.get("message") != null ? data.get("message") : ""));

        String targetUrl = data.get("url") != null ? data.get("url") : "/notifications";

        showSystemNotification(this, title, message, targetUrl);
    }

    public static boolean showSystemNotification(Context context, String title, String message, String targetUrl) {
        if (context == null) return false;
        ensureNotificationChannel(context);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(context, android.Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) {
            return false;
        }

        NotificationManagerCompat manager = NotificationManagerCompat.from(context);
        if (!manager.areNotificationsEnabled()) {
            return false;
        }

        try {
            Intent intent = new Intent(context, MainActivity.class);
            intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            if (targetUrl != null && !targetUrl.trim().isEmpty()) {
                intent.putExtra("target_url", targetUrl.trim());
            }

            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }

            int notifId = (int) (System.currentTimeMillis() & 0x7FFFFFFF);
            PendingIntent pendingIntent = PendingIntent.getActivity(
                context,
                notifId,
                intent,
                flags
            );

            NotificationCompat.Builder builder = new NotificationCompat.Builder(context, NOTIFICATION_CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_stat_notification)
                .setColor(0xFFEAB308)
                .setContentTitle(title != null && !title.isEmpty() ? title : "ZebAlpha")
                .setContentText(message != null ? message : "")
                .setStyle(new NotificationCompat.BigTextStyle().bigText(message != null ? message : ""))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent);

            manager.notify(notifId, builder.build());
            return true;
        } catch (Exception e) {
            Log.e(TAG, "Error displaying system notification", e);
            return false;
        }
    }
}
