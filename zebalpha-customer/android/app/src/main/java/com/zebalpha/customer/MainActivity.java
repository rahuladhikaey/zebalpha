package com.zebalpha.customer;

import android.content.Context;
import android.graphics.Bitmap;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.NetworkRequest;
import android.net.http.SslError;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.SslErrorHandler;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.ImageButton;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.provider.Settings;
import android.net.Uri;
import android.content.pm.PackageManager;
import android.os.SystemClock;
import android.webkit.JavascriptInterface;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;
import com.google.firebase.messaging.FirebaseMessaging;
import java.util.Locale;
import org.json.JSONObject;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "ZebAlphaMainActivity";
    private static final String DEFAULT_URL = "https://zebalpha.shop";
    private static final long NAVIGATION_TIMEOUT_MS = 12000; // 12s watchdog for slow/hanging connections
    private static final int MAX_AUTO_RETRIES = 2;

    public enum AppState {
        LOADING,
        SUCCESS,
        ERROR
    }

    public enum ErrorType {
        NETWORK(
            "No connection",
            "Please check your internet connectivity\nand try again"
        ),
        SERVER(
            "No connection",
            "Please check your internet connectivity\nand try again"
        ),
        TIMEOUT(
            "No connection",
            "Please check your internet connectivity\nand try again"
        );

        public final String title;
        public final String subtitle;

        ErrorType(String title, String subtitle) {
            this.title = title;
            this.subtitle = subtitle;
        }
    }

    private View offlineOverlayView;
    private TextView tvErrorTitle;
    private TextView tvErrorSubtitle;
    private Button btnRetry;
    private ProgressBar pbRetry;

    private volatile boolean hasError = false;
    private AppState currentState = AppState.LOADING;
    private String lastTargetUrl = DEFAULT_URL;
    private boolean isRetrying = false;
    private int autoRetryCount = 0;
    private ConnectivityManager.NetworkCallback networkCallback;
    private ActivityResultLauncher<String> notificationPermissionLauncher;
    private long permissionPromptRequestedAtMs = 0L;
    private boolean permissionRationaleBeforePrompt = false;
    private String pendingDeepLinkUrl = null;
    private BroadcastReceiver fcmTokenReceiver;

    private final Handler timeoutHandler = new Handler(Looper.getMainLooper());
    private final Runnable timeoutWatchdog = () -> {
        runOnUiThread(() -> {
            WebView webView = getBridge() != null ? getBridge().getWebView() : null;
            if (webView != null && webView.getProgress() < 100 && currentState != AppState.ERROR) {
                Log.w(TAG, "Navigation watchdog fired after timeout on: " + lastTargetUrl);
                hasError = true;
                currentState = AppState.ERROR;
                webView.stopLoading();
                webView.loadUrl("about:blank");
                webView.setVisibility(View.GONE);
                showOfflineOverlay(ErrorType.TIMEOUT);
            }
        });
    };

    /**
     * Checks if a URL is a valid web destination and not an internal/error URL.
     */
    private boolean isValidHttpUrl(String url) {
        if (url == null || url.trim().isEmpty()) return false;
        String lower = url.trim().toLowerCase(Locale.ROOT);
        return (lower.startsWith("http://") || lower.startsWith("https://")) &&
               !lower.contains("offline.html") &&
               !lower.equals("about:blank") &&
               !lower.startsWith("chrome-error://") &&
               !lower.contains("chromewebdata");
    }

    /**
     * Custom BridgeWebViewClient ensuring native intercept of network errors,
     * suppressing Chromium's default error page, and isolating main-frame from subresources.
     */
    private class ZebAlphaWebViewClient extends BridgeWebViewClient {

        public ZebAlphaWebViewClient(Bridge bridge) {
            super(bridge);
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            if (request != null && request.getUrl() != null) {
                String target = request.getUrl().toString();
                if (isValidHttpUrl(target)) {
                    lastTargetUrl = target;
                }
            }
            return super.shouldOverrideUrlLoading(view, request);
        }

        @Override
        public void onPageStarted(WebView view, String url, Bitmap favicon) {
            super.onPageStarted(view, url, favicon);

            if (isValidHttpUrl(url)) {
                hasError = false;
                lastTargetUrl = url;
                resetTimeoutWatchdog();
            }
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            super.onPageFinished(view, url);
            if (hasError || currentState == AppState.ERROR || !isValidHttpUrl(url)) {
                if (view != null) {
                    view.setVisibility(View.GONE);
                }
                return;
            }
            cancelTimeoutWatchdog();

            runOnUiThread(() -> {
                if (!hasError && currentState != AppState.ERROR && isNetworkConnected() && isValidHttpUrl(url)) {
                    currentState = AppState.SUCCESS;
                    hideOfflineOverlay();
                    autoRetryCount = 0;
                    if (view != null) {
                        view.setVisibility(View.VISIBLE);
                    }
                    dispatchNotificationStatusToWebView();
                    if (pendingDeepLinkUrl != null && !pendingDeepLinkUrl.trim().isEmpty()) {
                        String deepTarget = resolveAppDeepLinkUrl(pendingDeepLinkUrl);
                        pendingDeepLinkUrl = null;
                        if (deepTarget != null && !deepTarget.equals(url)) {
                            navigateToUrl(deepTarget);
                        }
                    }
                }
            });
        }

        @Override
        public void onPageCommitVisible(WebView view, String url) {
            super.onPageCommitVisible(view, url);
            if (hasError || currentState == AppState.ERROR || !isValidHttpUrl(url)) {
                if (view != null) {
                    view.setVisibility(View.GONE);
                }
                return;
            }
            cancelTimeoutWatchdog();

            runOnUiThread(() -> {
                if (!hasError && isValidHttpUrl(url) && currentState != AppState.ERROR) {
                    currentState = AppState.SUCCESS;
                    hideOfflineOverlay();
                    if (view != null) {
                        view.setVisibility(View.VISIBLE);
                    }
                }
            });
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            // CRITICAL: Filter for MAIN FRAME ONLY.
            // Do NOT trigger full-page error for secondary resource failures (images, analytics, fonts, css, scripts).
            if (request != null && !request.isForMainFrame()) {
                Log.d(TAG, "Ignored subresource error for URL: " + request.getUrl());
                return;
            }

            hasError = true;
            currentState = AppState.ERROR;
            cancelTimeoutWatchdog();

            String failedUrl = (request != null && request.getUrl() != null) ? request.getUrl().toString() : null;
            if (isValidHttpUrl(failedUrl)) {
                lastTargetUrl = failedUrl;
            }

            // CRITICAL: Stop WebView loading, clear with about:blank, and hide immediately
            // to completely prevent Chromium default error page from painting
            if (view != null) {
                view.stopLoading();
                view.loadUrl("about:blank");
                view.setVisibility(View.GONE);
            }

            runOnUiThread(() -> {
                isRetrying = false;
                showOfflineOverlay(ErrorType.NETWORK);
            });

            // CRITICAL: DO NOT call super.onReceivedError(view, request, error) for main frame!
            // Suppresses Chromium internal chrome-error://chromewebdata/ and Capacitor redirect.
        }

        @SuppressWarnings("deprecation")
        @Override
        public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
            // Legacy callback for Android < 6.0 / API 23 or legacy fallback
            hasError = true;
            currentState = AppState.ERROR;
            cancelTimeoutWatchdog();

            if (isValidHttpUrl(failingUrl)) {
                lastTargetUrl = failingUrl;
            }

            if (view != null) {
                view.stopLoading();
                view.loadUrl("about:blank");
                view.setVisibility(View.GONE);
            }

            runOnUiThread(() -> {
                isRetrying = false;
                showOfflineOverlay(ErrorType.NETWORK);
            });

            // DO NOT delegate to super
        }

        @Override
        public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse errorResponse) {
            // CRITICAL: Main frame only
            if (request == null || !request.isForMainFrame()) {
                return;
            }

            int statusCode = errorResponse != null ? errorResponse.getStatusCode() : 0;
            // Intercept server failure/gateway errors (500, 502, 503, 504)
            if (statusCode == 500 || statusCode == 502 || statusCode == 503 || statusCode == 504) {
                hasError = true;
                currentState = AppState.ERROR;
                cancelTimeoutWatchdog();

                String failedUrl = request.getUrl() != null ? request.getUrl().toString() : null;
                if (isValidHttpUrl(failedUrl)) {
                    lastTargetUrl = failedUrl;
                }

                if (view != null) {
                    view.stopLoading();
                    view.loadUrl("about:blank");
                    view.setVisibility(View.GONE);
                }

                runOnUiThread(() -> {
                    isRetrying = false;
                    showOfflineOverlay(ErrorType.SERVER);
                });
                return;
            }

            // For client HTTP errors (4xx like 404, 401), keep website application error handling
            super.onReceivedHttpError(view, request, errorResponse);
        }

        @Override
        public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
            Log.e(TAG, "SSL Certificate Error intercepted: " + (error != null ? error.toString() : "unknown"));
            // Secure production behavior: NEVER proceed on SSL errors!
            if (handler != null) {
                handler.cancel();
            }

            hasError = true;
            currentState = AppState.ERROR;
            cancelTimeoutWatchdog();

            if (view != null) {
                view.stopLoading();
                view.loadUrl("about:blank");
                view.setVisibility(View.GONE);
            }

            runOnUiThread(() -> {
                isRetrying = false;
                showOfflineOverlay(ErrorType.SERVER);
            });
        }
    }

    @Override
    protected void load() {
        try {
            bridgeBuilder.addWebViewListener(new com.getcapacitor.WebViewListener() {
                @Override
                public void onReceivedError(WebView webView) {
                    runOnUiThread(() -> {
                        hasError = true;
                        currentState = AppState.ERROR;
                        if (webView != null) {
                            webView.stopLoading();
                            webView.loadUrl("about:blank");
                            webView.setVisibility(View.GONE);
                        }
                        showOfflineOverlay(ErrorType.NETWORK);
                    });
                }
            });
        } catch (Exception e) {
            Log.e(TAG, "Error registering pre-load WebViewListener", e);
        }

        super.load();
        try {
            Bridge bridge = getBridge();
            if (bridge != null && bridge.getWebView() != null) {
                bridge.setWebViewClient(new ZebAlphaWebViewClient(bridge));
                bridge.getWebView().addJavascriptInterface(new ZebAlphaNativeInterface(), "ZebAlphaNative");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error installing ZebAlphaWebViewClient in load()", e);
        }
    }

    @Override
    public void onStart() {
        super.onStart();
        try {
            Bridge bridge = getBridge();
            if (bridge != null && bridge.getWebView() != null) {
                bridge.getWebView().addJavascriptInterface(new ZebAlphaNativeInterface(), "ZebAlphaNative");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error attaching ZebAlphaNative in onStart()", e);
        }
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        applyCreamGoldSystemBars();

        // Register ActivityResultLauncher unconditionally before STARTED state
        notificationPermissionLauncher = registerForActivityResult(
            new ActivityResultContracts.RequestPermission(),
            this::handlePermissionLauncherResult
        );

        // Listen for FCM token refreshes while app is alive
        registerFcmTokenReceiver();

        // Capture any deep link from notification tap on cold launch
        extractTargetUrlFromIntent(getIntent());

        // 1. Setup offline error overlay view
        setupOfflineOverlay();

        // 2. Attach custom BridgeWebViewClient & Native JavaScript Bridge
        try {
            Bridge bridge = getBridge();
            if (bridge != null && bridge.getWebView() != null) {
                bridge.setWebViewClient(new ZebAlphaWebViewClient(bridge));
                bridge.getWebView().addJavascriptInterface(new ZebAlphaNativeInterface(), "ZebAlphaNative");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error installing custom ZebAlphaWebViewClient", e);
        }

        // 3. Create high-importance notification channel immediately at startup (avoid blocking SplashScreen with permission dialog)
        ZebAlphaFirebaseMessagingService.ensureNotificationChannel(this);
        if (isNotificationEnabledInternal()) {
            fetchAndDispatchFcmToken();
        }

        // 4. Custom User-Agent header for Android App identification
        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                WebSettings settings = getBridge().getWebView().getSettings();
                String defaultUa = settings.getUserAgentString();
                if (!defaultUa.contains("ZEBALPHA_ANDROID_APP")) {
                    settings.setUserAgentString(defaultUa + " ZEBALPHA_ANDROID_APP");
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error configuring User-Agent", e);
        }

        // 4. Initial check: If app opened with no network connection
        if (!isNetworkConnected()) {
            WebView webView = getBridge() != null ? getBridge().getWebView() : null;
            if (webView != null) {
                webView.stopLoading();
                webView.loadUrl("about:blank");
                webView.setVisibility(View.GONE);
            }
            showOfflineOverlay(ErrorType.NETWORK);
        }

        // 5. Automatic network reconnection callback with non-idempotent action safeguards
        registerNetworkCallback();

        // 6. Back navigation handling
        setupBackNavigation();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        extractTargetUrlFromIntent(intent);
        if (pendingDeepLinkUrl != null && !pendingDeepLinkUrl.trim().isEmpty()) {
            String deepTarget = resolveAppDeepLinkUrl(pendingDeepLinkUrl);
            pendingDeepLinkUrl = null;
            if (deepTarget != null) {
                navigateToUrl(deepTarget);
            }
        }
    }

    public static final String NOTIFICATION_CHANNEL_ID = ZebAlphaFirebaseMessagingService.NOTIFICATION_CHANNEL_ID;
    public static final String NOTIFICATION_CHANNEL_NAME = ZebAlphaFirebaseMessagingService.NOTIFICATION_CHANNEL_NAME;

    private void extractTargetUrlFromIntent(Intent intent) {
        if (intent == null) return;
        try {
            String target = intent.getStringExtra("target_url");
            if (target == null || target.trim().isEmpty()) {
                target = intent.getStringExtra("url");
            }
            if (target != null && !target.trim().isEmpty()) {
                pendingDeepLinkUrl = target.trim();
            }
        } catch (Exception e) {
            Log.w(TAG, "Error reading notification target_url", e);
        }
    }

    private String resolveAppDeepLinkUrl(String raw) {
        if (raw == null) return null;
        String trimmed = raw.trim();
        if (trimmed.isEmpty()) return null;
        if (trimmed.startsWith("/")) {
            return DEFAULT_URL + trimmed;
        }
        String lower = trimmed.toLowerCase(Locale.ROOT);
        if (lower.startsWith("https://zebalpha.shop") || lower.startsWith("http://zebalpha.shop")) {
            return trimmed;
        }
        return null;
    }

    private void registerFcmTokenReceiver() {
        try {
            fcmTokenReceiver = new BroadcastReceiver() {
                @Override
                public void onReceive(Context context, Intent intent) {
                    if (intent == null) return;
                    String token = intent.getStringExtra("token");
                    if (token != null && !token.isEmpty()) {
                        dispatchFcmTokenToWebView(token);
                    }
                }
            };
            IntentFilter filter = new IntentFilter(ZebAlphaFirebaseMessagingService.ACTION_FCM_TOKEN);
            ContextCompat.registerReceiver(this, fcmTokenReceiver, filter, ContextCompat.RECEIVER_NOT_EXPORTED);
        } catch (Exception e) {
            Log.e(TAG, "Failed to register FCM token receiver", e);
        }
    }

    private boolean isPostNotificationsGranted() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            return true;
        }
        return ContextCompat.checkSelfPermission(this, android.Manifest.permission.POST_NOTIFICATIONS)
            == PackageManager.PERMISSION_GRANTED;
    }

    private boolean isChannelBlocked() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return false;
        }
        try {
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                NotificationChannel channel = manager.getNotificationChannel(NOTIFICATION_CHANNEL_ID);
                return channel != null && channel.getImportance() == NotificationManager.IMPORTANCE_NONE;
            }
        } catch (Exception e) {
            Log.w(TAG, "Error checking notification channel importance", e);
        }
        return false;
    }

    private boolean isNotificationEnabledInternal() {
        NotificationManagerCompat manager = NotificationManagerCompat.from(this);
        return isPostNotificationsGranted() && manager.areNotificationsEnabled() && !isChannelBlocked();
    }

    private String buildNotificationStatusJson(boolean blockedBySystem) {
        try {
            JSONObject obj = new JSONObject();
            boolean postGranted = isPostNotificationsGranted();
            boolean appEnabled = NotificationManagerCompat.from(this).areNotificationsEnabled();
            boolean channelBlocked = isChannelBlocked();
            boolean enabled = postGranted && appEnabled && !channelBlocked;
            boolean rationale = Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
                && ActivityCompat.shouldShowRequestPermissionRationale(this, android.Manifest.permission.POST_NOTIFICATIONS);

            obj.put("enabled", enabled);
            obj.put("granted", enabled);
            obj.put("postNotificationsGranted", postGranted);
            obj.put("areNotificationsEnabled", appEnabled);
            obj.put("channelBlocked", channelBlocked);
            obj.put("shouldShowRationale", rationale);
            obj.put("blockedBySystem", blockedBySystem);
            obj.put("sdkInt", Build.VERSION.SDK_INT);
            return obj.toString();
        } catch (Exception e) {
            return "{\"enabled\":false,\"granted\":false}";
        }
    }

    private void dispatchJsEvent(String eventName, String jsonDetail) {
        runOnUiThread(() -> {
            try {
                Bridge bridge = getBridge();
                if (bridge != null && bridge.getWebView() != null) {
                    bridge.getWebView().evaluateJavascript(
                        "window.dispatchEvent(new CustomEvent('" + eventName + "', { detail: " + jsonDetail + " }));",
                        null
                    );
                }
            } catch (Exception e) {
                Log.w(TAG, "Failed dispatching JS event: " + eventName, e);
            }
        });
    }

    private void dispatchNotificationStatusToWebView() {
        dispatchJsEvent("zebalpha:notification-status", buildNotificationStatusJson(false));
    }

    private void sendActivationNotificationIfFirstTime() {
        if (!isNotificationEnabledInternal()) return;
        try {
            SharedPreferences prefs = getSharedPreferences(ZebAlphaFirebaseMessagingService.PREFS_NAME, MODE_PRIVATE);
            if (prefs.getBoolean("notif_activation_sent", false)) {
                return;
            }
            boolean posted = ZebAlphaFirebaseMessagingService.showSystemNotification(
                this,
                "ZebAlpha Alerts Activated ✦",
                "You're all set! Order tracking, flash deals & exclusive drop updates are now active.",
                "/notifications"
            );
            if (posted) {
                prefs.edit().putBoolean("notif_activation_sent", true).apply();
            }
        } catch (Exception e) {
            Log.w(TAG, "Error sending activation notification", e);
        }
    }

    private void fetchAndDispatchFcmToken() {
        try {
            FirebaseMessaging.getInstance().getToken().addOnCompleteListener(task -> {
                if (!task.isSuccessful()) {
                    Log.w(TAG, "Fetching FCM registration token failed", task.getException());
                    return;
                }
                String token = task.getResult();
                if (token != null && !token.isEmpty()) {
                    SharedPreferences prefs = getSharedPreferences(ZebAlphaFirebaseMessagingService.PREFS_NAME, MODE_PRIVATE);
                    prefs.edit().putString(ZebAlphaFirebaseMessagingService.KEY_FCM_TOKEN, token).apply();
                    dispatchFcmTokenToWebView(token);
                }
            });
        } catch (Exception e) {
            Log.w(TAG, "FCM token retrieval error", e);
        }
    }

    private void dispatchFcmTokenToWebView(String token) {
        try {
            JSONObject obj = new JSONObject();
            obj.put("token", token);
            dispatchJsEvent("zebalpha:fcm-token", obj.toString());
        } catch (Exception e) {
            Log.w(TAG, "Failed dispatching FCM token event", e);
        }
    }

    private void handlePermissionLauncherResult(Boolean isGranted) {
        ZebAlphaFirebaseMessagingService.ensureNotificationChannel(this);
        boolean enabledNow = isNotificationEnabledInternal();
        boolean grantedNow = Boolean.TRUE.equals(isGranted) && enabledNow;
        long elapsedMs = SystemClock.elapsedRealtime() - permissionPromptRequestedAtMs;
        boolean rationaleAfter = Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
            && ActivityCompat.shouldShowRequestPermissionRationale(this, android.Manifest.permission.POST_NOTIFICATIONS);

        // If Android closes the launcher almost instantly with no rationale, OS suppressed dialog (Restricted Settings or permanent denial)
        boolean blockedBySystem = !grantedNow && !rationaleAfter && (elapsedMs < 450L || !permissionRationaleBeforePrompt);

        Log.i(TAG, "Notification permission result: isGranted=" + isGranted + ", enabledNow=" + enabledNow + ", blockedBySystem=" + blockedBySystem + ", elapsedMs=" + elapsedMs);

        if (grantedNow) {
            sendActivationNotificationIfFirstTime();
            fetchAndDispatchFcmToken();
        }

        String statusJson = buildNotificationStatusJson(blockedBySystem);
        dispatchJsEvent("zebalpha:notification-permission", statusJson);
        dispatchJsEvent("zebalpha:notification-status", statusJson);
    }

    /**
     * Checks and requests runtime notification permission safely on Android 13+ (API 33+).
     */
    private void checkAndRequestNotificationPermission() {
        ZebAlphaFirebaseMessagingService.ensureNotificationChannel(this);

        if (isNotificationEnabledInternal()) {
            sendActivationNotificationIfFirstTime();
            fetchAndDispatchFcmToken();
            String statusJson = buildNotificationStatusJson(false);
            dispatchJsEvent("zebalpha:notification-permission", statusJson);
            dispatchJsEvent("zebalpha:notification-status", statusJson);
            return;
        }

        // If POST_NOTIFICATIONS is granted but user/system muted master switch or channel, runtime dialog won't appear -> guide directly
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU || isPostNotificationsGranted()) {
            String statusJson = buildNotificationStatusJson(true);
            dispatchJsEvent("zebalpha:notification-permission", statusJson);
            return;
        }

        if (notificationPermissionLauncher != null) {
            permissionPromptRequestedAtMs = SystemClock.elapsedRealtime();
            permissionRationaleBeforePrompt = ActivityCompat.shouldShowRequestPermissionRationale(
                this,
                android.Manifest.permission.POST_NOTIFICATIONS
            );
            notificationPermissionLauncher.launch(android.Manifest.permission.POST_NOTIFICATIONS);
        }
    }

    /**
     * JavaScript Bridge Interface allowing the web app to trigger real native Android System Notifications.
     */
    public class ZebAlphaNativeInterface {

        @JavascriptInterface
        public void showNotification(String title, String message, String url) {
            runOnUiThread(() -> ZebAlphaFirebaseMessagingService.showSystemNotification(MainActivity.this, title, message, url));
        }

        @JavascriptInterface
        public void requestPermission() {
            runOnUiThread(() -> checkAndRequestNotificationPermission());
        }

        @JavascriptInterface
        public boolean isNotificationEnabled() {
            return isNotificationEnabledInternal();
        }

        @JavascriptInterface
        public String getNotificationStatus() {
            return buildNotificationStatusJson(false);
        }

        @JavascriptInterface
        public String getFcmToken() {
            SharedPreferences prefs = getSharedPreferences(ZebAlphaFirebaseMessagingService.PREFS_NAME, MODE_PRIVATE);
            String cached = prefs.getString(ZebAlphaFirebaseMessagingService.KEY_FCM_TOKEN, "");
            fetchAndDispatchFcmToken();
            return cached != null ? cached : "";
        }

        @JavascriptInterface
        public void openAppInfoSettings() {
            runOnUiThread(() -> {
                try {
                    Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                    intent.setData(Uri.parse("package:" + getPackageName()));
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(intent);
                } catch (Exception e) {
                    Log.e(TAG, "Failed to open app info settings", e);
                }
            });
        }

        @JavascriptInterface
        public void openNotificationSettings() {
            runOnUiThread(() -> {
                try {
                    Intent intent = new Intent();
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && isPostNotificationsGranted() && isChannelBlocked()) {
                        intent.setAction(Settings.ACTION_CHANNEL_NOTIFICATION_SETTINGS);
                        intent.putExtra(Settings.EXTRA_APP_PACKAGE, getPackageName());
                        intent.putExtra(Settings.EXTRA_CHANNEL_ID, NOTIFICATION_CHANNEL_ID);
                    } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        intent.setAction(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
                        intent.putExtra(Settings.EXTRA_APP_PACKAGE, getPackageName());
                    } else {
                        intent.setAction(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                        intent.setData(Uri.parse("package:" + getPackageName()));
                    }
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(intent);
                } catch (Exception e) {
                    Log.e(TAG, "Failed to open notification settings", e);
                    openAppInfoSettings();
                }
            });
        }
    }

    private void setupOfflineOverlay() {
        try {
            offlineOverlayView = getLayoutInflater().inflate(R.layout.layout_offline_error, null);
            addContentView(
                offlineOverlayView,
                new ViewGroup.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT
                )
            );
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                offlineOverlayView.setElevation(9999f);
                offlineOverlayView.setTranslationZ(9999f);
            }
            offlineOverlayView.setVisibility(View.GONE);

            btnRetry = offlineOverlayView.findViewById(R.id.btn_error_retry);
            pbRetry = offlineOverlayView.findViewById(R.id.pb_error_retry);
            tvErrorTitle = offlineOverlayView.findViewById(R.id.tv_error_title);
            tvErrorSubtitle = offlineOverlayView.findViewById(R.id.tv_error_subtitle);

            // Retry button with debounce
            if (btnRetry != null) btnRetry.setOnClickListener(v -> retryConnection());

        } catch (Exception e) {
            Log.e(TAG, "Error setting up offline overlay", e);
        }
    }

    private void setupBackNavigation() {
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                handleBackNavigation();
            }
        });
    }

    private void handleBackNavigation() {
        if (offlineOverlayView != null && offlineOverlayView.getVisibility() == View.VISIBLE) {
            WebView webView = getBridge() != null ? getBridge().getWebView() : null;
            if (webView != null && webView.canGoBack()) {
                hasError = false;
                currentState = AppState.LOADING;
                hideOfflineOverlay();
                webView.setVisibility(View.VISIBLE);
                webView.goBack();
            } else {
                finish();
            }
            return;
        }

        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            finish();
        }
    }

    private void navigateToUrl(String url) {
        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView != null) {
            hasError = false;
            currentState = AppState.LOADING;
            lastTargetUrl = url;
            hideOfflineOverlay();
            webView.setVisibility(View.VISIBLE);
            webView.loadUrl(url);
            resetTimeoutWatchdog();
        }
    }

    public void showOfflineOverlay(ErrorType type) {
        runOnUiThread(() -> {
            hasError = true;
            currentState = AppState.ERROR;
            if (offlineOverlayView != null) {
                if (tvErrorTitle != null && type != null) {
                    tvErrorTitle.setText(type.title);
                }
                if (tvErrorSubtitle != null && type != null) {
                    tvErrorSubtitle.setText(type.subtitle);
                }

                offlineOverlayView.setVisibility(View.VISIBLE);
                offlineOverlayView.bringToFront();
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    offlineOverlayView.setElevation(9999f);
                    offlineOverlayView.setTranslationZ(9999f);
                }
                if (pbRetry != null) pbRetry.setVisibility(View.GONE);
                if (btnRetry != null) {
                    btnRetry.setVisibility(View.VISIBLE);
                    btnRetry.setEnabled(true);
                    btnRetry.setText("Retry");
                }
            }
            isRetrying = false;
            WebView webView = getBridge() != null ? getBridge().getWebView() : null;
            if (webView != null) {
                webView.stopLoading();
                webView.loadUrl("about:blank");
                webView.setVisibility(View.GONE);
            }
        });
    }

    public void hideOfflineOverlay() {
        runOnUiThread(() -> {
            if (offlineOverlayView != null) {
                offlineOverlayView.setVisibility(View.GONE);
                if (pbRetry != null) pbRetry.setVisibility(View.GONE);
                if (btnRetry != null) {
                    btnRetry.setVisibility(View.VISIBLE);
                    btnRetry.setEnabled(true);
                    btnRetry.setText("Retry");
                }
            }
            isRetrying = false;
        });
    }

    private void retryConnection() {
        if (isRetrying) {
            Log.d(TAG, "Retry clicked while already retrying, ignoring.");
            return;
        }

        // 1. Check current network connectivity
        if (!isNetworkConnected()) {
            // If there is no usable network: remain on custom error screen!
            Log.d(TAG, "Retry tapped while offline. Remaining on custom error screen.");
            if (tvErrorTitle != null) tvErrorTitle.setText("No connection");
            if (tvErrorSubtitle != null) tvErrorSubtitle.setText("Please check your internet connectivity\nand try again");
            if (pbRetry != null) pbRetry.setVisibility(View.GONE);
            if (btnRetry != null) {
                btnRetry.setVisibility(View.VISIBLE);
                btnRetry.setEnabled(true);
                btnRetry.setText("Retry");
            }
            Toast.makeText(MainActivity.this, "No connection. Please check your internet connectivity and try again.", Toast.LENGTH_SHORT).show();
            return;
        }

        // 2. Connectivity is available
        isRetrying = true;
        hasError = false;
        currentState = AppState.LOADING;

        if (pbRetry != null) pbRetry.setVisibility(View.VISIBLE);
        if (btnRetry != null) {
            btnRetry.setEnabled(false);
            btnRetry.setText("");
        }

        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView != null) {
            String target = (lastTargetUrl != null && !lastTargetUrl.isEmpty() && isValidHttpUrl(lastTargetUrl))
                ? lastTargetUrl
                : DEFAULT_URL;

            Log.i(TAG, "Retrying original URL: " + target);

            hideOfflineOverlay();
            webView.setVisibility(View.VISIBLE);
            webView.loadUrl(target);
        } else {
            isRetrying = false;
        }

        // Watchdog fallback in case network connects but server hangs
        resetTimeoutWatchdog();

        // Safety debounce release
        if (offlineOverlayView != null) {
            offlineOverlayView.postDelayed(() -> {
                if (isRetrying) {
                    isRetrying = false;
                    if (pbRetry != null) pbRetry.setVisibility(View.GONE);
                    if (btnRetry != null) {
                        btnRetry.setEnabled(true);
                        btnRetry.setText("Retry");
                    }
                }
            }, 4000);
        }
    }

    /**
     * Check if the failed URL represents a non-idempotent action such as checkout, payment, or order submission.
     */
    private boolean isNonIdempotentUrl(String url) {
        if (url == null) return false;
        String lower = url.toLowerCase(Locale.ROOT);
        return lower.contains("/checkout") ||
               lower.contains("/order") ||
               lower.contains("/payment") ||
               lower.contains("/razorpay") ||
               lower.contains("/pay");
    }

    private boolean isNetworkConnected() {
        try {
            ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
            if (cm != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    Network network = cm.getActiveNetwork();
                    if (network != null) {
                        NetworkCapabilities capabilities = cm.getNetworkCapabilities(network);
                        return capabilities != null && (
                            capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) ||
                            capabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) ||
                            capabilities.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET)
                        ) && (capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET));
                    }
                } else {
                    android.net.NetworkInfo networkInfo = cm.getActiveNetworkInfo();
                    return networkInfo != null && networkInfo.isConnected();
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error checking network connectivity", e);
        }
        return false;
    }

    private void registerNetworkCallback() {
        try {
            ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
            if (cm != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                NetworkRequest request = new NetworkRequest.Builder()
                    .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                    .build();

                networkCallback = new ConnectivityManager.NetworkCallback() {
                    @Override
                    public void onAvailable(Network network) {
                        runOnUiThread(() -> {
                            if (offlineOverlayView != null && offlineOverlayView.getVisibility() == View.VISIBLE && currentState == AppState.ERROR) {
                                // CRITICAL: Never repeat checkout, payment, or order submissions automatically!
                                if (isNonIdempotentUrl(lastTargetUrl)) {
                                    Toast.makeText(MainActivity.this, "Connection restored. Tap Retry to proceed safely.", Toast.LENGTH_LONG).show();
                                    return;
                                }

                                // For safe idempotent pages (e.g. products, home, categories), auto-recover safely with debounce
                                if (autoRetryCount < MAX_AUTO_RETRIES) {
                                    autoRetryCount++;
                                    Toast.makeText(MainActivity.this, "Connection restored. Loading...", Toast.LENGTH_SHORT).show();
                                    retryConnection();
                                }
                            }
                        });
                    }
                };

                cm.registerNetworkCallback(request, networkCallback);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error registering network callback", e);
        }
    }

    private void resetTimeoutWatchdog() {
        timeoutHandler.removeCallbacks(timeoutWatchdog);
        timeoutHandler.postDelayed(timeoutWatchdog, NAVIGATION_TIMEOUT_MS);
    }

    private void cancelTimeoutWatchdog() {
        timeoutHandler.removeCallbacks(timeoutWatchdog);
    }

    private void applyCreamGoldSystemBars() {
        try {
            Window window = getWindow();
            if (window == null) return;
            window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
            int statusColor = ContextCompat.getColor(this, R.color.zebalpha_cream_bg);
            int navColor = ContextCompat.getColor(this, R.color.zebalpha_bottom_cream);
            window.setStatusBarColor(statusColor);
            window.setNavigationBarColor(navColor);
            window.getDecorView().setBackgroundColor(statusColor);

            WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, window.getDecorView());
            if (controller != null) {
                controller.setAppearanceLightStatusBars(true);
                controller.setAppearanceLightNavigationBars(true);
            }
        } catch (Exception e) {
            Log.w(TAG, "Unable to apply cream-gold system bars", e);
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        applyCreamGoldSystemBars();
        ZebAlphaFirebaseMessagingService.ensureNotificationChannel(this);
        if (isNotificationEnabledInternal()) {
            sendActivationNotificationIfFirstTime();
            fetchAndDispatchFcmToken();
        }
        dispatchNotificationStatusToWebView();

        if (!isNetworkConnected()) {
            WebView webView = getBridge() != null ? getBridge().getWebView() : null;
            if (webView != null) {
                webView.stopLoading();
                webView.loadUrl("about:blank");
                webView.setVisibility(View.GONE);
            }
            showOfflineOverlay(ErrorType.NETWORK);
        }
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        cancelTimeoutWatchdog();
        try {
            if (fcmTokenReceiver != null) {
                unregisterReceiver(fcmTokenReceiver);
                fcmTokenReceiver = null;
            }
        } catch (Exception e) {
            Log.e(TAG, "Error unregistering FCM token receiver", e);
        }
        try {
            if (networkCallback != null) {
                ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
                if (cm != null) {
                    cm.unregisterNetworkCallback(networkCallback);
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error unregistering network callback", e);
        }
    }
}
