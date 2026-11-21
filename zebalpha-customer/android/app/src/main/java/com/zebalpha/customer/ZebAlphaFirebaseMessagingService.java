package com.zebalpha.customer;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Build;
import android.util.Log;
import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Map;

public class ZebAlphaFirebaseMessagingService extends FirebaseMessagingService {

    private static final String TAG = "ZebAlphaFCMService";
    public static final String PREFS_NAME = "zebalpha_native_prefs";
    public static final String KEY_FCM_TOKEN = "fcm_token";
    public static final String ACTION_FCM_TOKEN = "com.zebalpha.customer.ACTION_FCM_TOKEN";
    public static final String NOTIFICATION_CHANNEL_ID = "zebalpha_alerts_channel";
    public static final String NOTIFICATION_CHANNEL_NAME = "ZebAlpha Drops & Orders";
    public static final String TOPIC_ALL = "zebalpha_all";
    public static final String TOPIC_CUSTOMERS = "zebalpha_customers";

    /**
     * Subscribes this device to ZebAlpha broadcast topics so broadcasts reach every
     * phone reliably.
     */
    public static void subscribeToDefaultTopics() {
        try {
            FirebaseMessaging fm = FirebaseMessaging.getInstance();
            fm.subscribeToTopic(TOPIC_ALL);
            fm.subscribeToTopic(TOPIC_CUSTOMERS);
        } catch (Exception e) {
            Log.w(TAG, "Topic subscription notice", e);
        }
    }

    /**
     * Ensures the high-importance Android notification channel exists even when
     * woken in background.
     */
    public static void ensureNotificationChannel(Context context) {
        if (context == null || Build.VERSION.SDK_INT < Build.VERSION_CODES.O)
            return;
        try {
            NotificationManager manager = context.getSystemService(NotificationManager.class);
            if (manager == null)
                return;

            NotificationChannel existing = manager.getNotificationChannel(NOTIFICATION_CHANNEL_ID);
            if (existing == null) {
                NotificationChannel channel = new NotificationChannel(
                        NOTIFICATION_CHANNEL_ID,
                        NOTIFICATION_CHANNEL_NAME,
                        NotificationManager.IMPORTANCE_HIGH);
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
            subscribeToDefaultTopics();

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
                : (data.get("body") != null ? data.get("body")
                        : (data.get("message") != null ? data.get("message") : ""));

        String targetUrl = data.get("url") != null
                ? data.get("url")
                : (data.get("target_url") != null ? data.get("target_url") : "/notifications");

        String imageUrl = (notif != null && notif.getImageUrl() != null)
                ? notif.getImageUrl().toString()
                : data.get("image");

        String tagId = data.get("id");

        showSystemNotification(this, title, message, targetUrl, imageUrl, tagId);
    }

    private static Bitmap fetchBitmapFromUrl(String rawUrl) {
        if (rawUrl == null || !rawUrl.trim().startsWith("http"))
            return null;
        HttpURLConnection conn = null;
        try {
            URL url = new URL(rawUrl.trim());
            conn = (HttpURLConnection) url.openConnection();
            conn.setConnectTimeout(4000);
            conn.setReadTimeout(4000);
            conn.setDoInput(true);
            conn.connect();
            try (InputStream input = conn.getInputStream()) {
                return BitmapFactory.decodeStream(input);
            }
        } catch (Exception e) {
            Log.w(TAG, "Could not load notification image: " + rawUrl);
            return null;
        } finally {
            if (conn != null)
                conn.disconnect();
        }
    }

    public static boolean showSystemNotification(Context context, String title, String message, String targetUrl) {
        return showSystemNotification(context, title, message, targetUrl, null, null);
    }

    public static boolean showSystemNotification(
            Context context,
            String title,
            String message,
            String targetUrl,
            String imageUrl,
            String dedupeTag) {
        if (context == null)
            return false;
        ensureNotificationChannel(context);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
                ContextCompat.checkSelfPermission(context,
                        android.Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
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

            // Deterministic ID when dedupeTag is present so token + topic deliveries never
            // duplicate in tray
            int notifId = (dedupeTag != null && !dedupeTag.trim().isEmpty())
                    ? (dedupeTag.trim().hashCode() & 0x7FFFFFFF)
                    : (int) (System.currentTimeMillis() & 0x7FFFFFFF);

            PendingIntent pendingIntent = PendingIntent.getActivity(
                    context,
                    notifId,
                    intent,
                    flags);

            Bitmap largeLogo = BitmapFactory.decodeResource(context.getResources(), R.mipmap.ic_launcher);
            Bitmap richPicture = fetchBitmapFromUrl(imageUrl);

            NotificationCompat.Builder builder = new NotificationCompat.Builder(context, NOTIFICATION_CHANNEL_ID)
                    .setSmallIcon(R.drawable.ic_stat_notification)
                    .setColor(0xFFEAB308)
                    .setContentTitle(title != null && !title.isEmpty() ? title : "ZebAlpha")
                    .setContentText(message != null ? message : "")
                    .setPriority(NotificationCompat.PRIORITY_HIGH)
                    .setCategory(NotificationCompat.CATEGORY_PROMO)
                    .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                    .setDefaults(NotificationCompat.DEFAULT_ALL)
                    .setAutoCancel(true)
                    .setContentIntent(pendingIntent);

            if (largeLogo != null) {
                builder.setLargeIcon(largeLogo);
            }

            if (richPicture != null) {
                builder.setStyle(
                        new NotificationCompat.BigPictureStyle()
                                .bigPicture(richPicture)
                                .bigLargeIcon((Bitmap) null)
                                .setSummaryText(message != null ? message : ""));
            } else {
                builder.setStyle(new NotificationCompat.BigTextStyle().bigText(message != null ? message : ""));
            }

            if (dedupeTag != null && !dedupeTag.trim().isEmpty()) {
                manager.notify(dedupeTag.trim(), notifId, builder.build());
            } else {
                manager.notify(notifId, builder.build());
            }
            return true;
        } catch (Exception e) {
            Log.e(TAG, "Error displaying system notification", e);
            return false;
        }
    }
}
