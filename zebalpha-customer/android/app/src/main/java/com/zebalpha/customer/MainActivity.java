package com.zebalpha.customer;

import android.content.Context;
import android.graphics.Bitmap;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.NetworkRequest;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.View;
import android.view.ViewGroup;
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
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;
import java.util.Locale;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "ZebAlphaMainActivity";
    private static final String DEFAULT_URL = "https://zebalpha.shop";
    private static final long NAVIGATION_TIMEOUT_MS = 20000; // 20s watchdog for slow/hanging connections
    private static final int MAX_AUTO_RETRIES = 2;

    public enum ErrorType {
        OFFLINE(
            "No Internet Connection",
            "Please check your internet connection and try again."
        ),
        SERVER(
            "Something went wrong!",
            "Please try again later."
        ),
        TIMEOUT(
            "Taking longer than expected",
            "Please check your connection and try again."
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

    private String lastTargetUrl = DEFAULT_URL;
    private boolean isRetrying = false;
    private int autoRetryCount = 0;
    private ConnectivityManager.NetworkCallback networkCallback;

    private final Handler timeoutHandler = new Handler(Looper.getMainLooper());
    private final Runnable timeoutWatchdog = () -> {
        runOnUiThread(() -> {
            WebView webView = getBridge() != null ? getBridge().getWebView() : null;
            if (webView != null && webView.getProgress() < 100) {
                Log.w(TAG, "Navigation watchdog fired after 20s timeout on: " + lastTargetUrl);
                showOfflineOverlay(ErrorType.TIMEOUT);
            }
        });
    };

    /**
     * Custom BridgeWebViewClient to ensure main-frame errors are cleanly isolated
     * from subresource errors (e.g. individual images or analytics scripts).
     */
    private class ZebAlphaWebViewClient extends BridgeWebViewClient {

        public ZebAlphaWebViewClient(Bridge bridge) {
            super(bridge);
        }

        @Override
        public void onPageStarted(WebView view, String url, Bitmap favicon) {
            super.onPageStarted(view, url, favicon);

            if (url != null && !url.contains("offline.html") && !url.equals("about:blank")) {
                lastTargetUrl = url;
            }

            // Start 20s watchdog timer for slow/unresponsive loading
            resetTimeoutWatchdog();
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            super.onPageFinished(view, url);
            cancelTimeoutWatchdog();

            runOnUiThread(() -> {
                if (isNetworkConnected() && url != null && !url.contains("offline.html") && !url.equals("about:blank")) {
                    hideOfflineOverlay();
                    autoRetryCount = 0;
                }
            });
        }

        @Override
        public void onPageCommitVisible(WebView view, String url) {
            super.onPageCommitVisible(view, url);
            cancelTimeoutWatchdog();
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            // CRITICAL: Distinguish main-frame navigation errors from subresource errors
            if (request != null && !request.isForMainFrame()) {
                Log.d(TAG, "Ignored subresource error for URL: " + request.getUrl());
                return;
            }

            cancelTimeoutWatchdog();

            int errorCode = Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && error != null
                ? error.getErrorCode()
                : WebViewClient.ERROR_UNKNOWN;

            ErrorType type = ErrorType.OFFLINE;
            if (errorCode == WebViewClient.ERROR_TIMEOUT) {
                type = ErrorType.TIMEOUT;
            } else if (!isNetworkConnected() || errorCode == WebViewClient.ERROR_HOST_LOOKUP || errorCode == WebViewClient.ERROR_CONNECT) {
                type = ErrorType.OFFLINE;
            } else {
                type = ErrorType.SERVER;
            }

            final ErrorType finalType = type;
            runOnUiThread(() -> {
                if (request != null && request.getUrl() != null) {
                    String failedUrl = request.getUrl().toString();
                    if (!failedUrl.contains("offline.html") && !failedUrl.equals("about:blank")) {
                        lastTargetUrl = failedUrl;
                    }
                }
                showOfflineOverlay(finalType);
            });

            super.onReceivedError(view, request, error);
        }

        @Override
        public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse errorResponse) {
            // CRITICAL: Only handle HTTP errors for main-frame
            if (request == null || !request.isForMainFrame()) {
                return;
            }

            cancelTimeoutWatchdog();

            int statusCode = errorResponse != null ? errorResponse.getStatusCode() : 0;
            if (statusCode == 408 || statusCode == 504) {
                runOnUiThread(() -> {
                    if (request.getUrl() != null) {
                        lastTargetUrl = request.getUrl().toString();
                    }
                    showOfflineOverlay(ErrorType.TIMEOUT);
                });
            } else if (statusCode >= 500) {
                runOnUiThread(() -> {
                    if (request.getUrl() != null) {
                        lastTargetUrl = request.getUrl().toString();
                    }
                    showOfflineOverlay(ErrorType.SERVER);
                });
            }

            super.onReceivedHttpError(view, request, errorResponse);
        }
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // 1. Setup offline error overlay view
        setupOfflineOverlay();

        // 2. Attach custom BridgeWebViewClient to ensure main-frame vs subresource isolation
        try {
            Bridge bridge = getBridge();
            if (bridge != null && bridge.getWebView() != null) {
                bridge.setWebViewClient(new ZebAlphaWebViewClient(bridge));
            }
        } catch (Exception e) {
            Log.e(TAG, "Error installing custom ZebAlphaWebViewClient", e);
        }

        // 3. Custom User-Agent header for Android App identification
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
            showOfflineOverlay(ErrorType.OFFLINE);
        }

        // 5. Automatic network reconnection callback with non-idempotent action safeguards
        registerNetworkCallback();

        // 6. Back navigation handling
        setupBackNavigation();
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
            offlineOverlayView.setVisibility(View.GONE);

            ImageButton btnBack = offlineOverlayView.findViewById(R.id.btn_error_back);
            ImageButton btnSearch = offlineOverlayView.findViewById(R.id.btn_error_search);
            ImageButton btnWishlist = offlineOverlayView.findViewById(R.id.btn_error_wishlist);
            View cartContainer = offlineOverlayView.findViewById(R.id.btn_error_cart_container);
            btnRetry = offlineOverlayView.findViewById(R.id.btn_error_retry);
            pbRetry = offlineOverlayView.findViewById(R.id.pb_error_retry);
            tvErrorTitle = offlineOverlayView.findViewById(R.id.tv_error_title);
            tvErrorSubtitle = offlineOverlayView.findViewById(R.id.tv_error_subtitle);

            // Back button
            btnBack.setOnClickListener(v -> handleBackNavigation());

            // Retry button with debounce
            btnRetry.setOnClickListener(v -> retryConnection());

            // Header actions: Search, Wishlist, Cart
            btnSearch.setOnClickListener(v -> {
                if (isNetworkConnected()) {
                    hideOfflineOverlay();
                    navigateToUrl("https://zebalpha.shop/categories");
                } else {
                    Toast.makeText(MainActivity.this, "Please check your internet connection.", Toast.LENGTH_SHORT).show();
                }
            });

            btnWishlist.setOnClickListener(v -> {
                if (isNetworkConnected()) {
                    hideOfflineOverlay();
                    navigateToUrl("https://zebalpha.shop/wishlist");
                } else {
                    Toast.makeText(MainActivity.this, "Please check your internet connection.", Toast.LENGTH_SHORT).show();
                }
            });

            cartContainer.setOnClickListener(v -> {
                if (isNetworkConnected()) {
                    hideOfflineOverlay();
                    navigateToUrl("https://zebalpha.shop/cart");
                } else {
                    Toast.makeText(MainActivity.this, "Please check your internet connection.", Toast.LENGTH_SHORT).show();
                }
            });

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
                hideOfflineOverlay();
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
            lastTargetUrl = url;
            webView.loadUrl(url);
        }
    }

    public void showOfflineOverlay(ErrorType type) {
        runOnUiThread(() -> {
            if (offlineOverlayView != null) {
                if (tvErrorTitle != null && type != null) {
                    tvErrorTitle.setText(type.title);
                }
                if (tvErrorSubtitle != null && type != null) {
                    tvErrorSubtitle.setText(type.subtitle);
                }

                offlineOverlayView.setVisibility(View.VISIBLE);
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
        if (isRetrying) return;
        isRetrying = true;

        if (pbRetry != null) pbRetry.setVisibility(View.VISIBLE);
        if (btnRetry != null) {
            btnRetry.setEnabled(false);
            btnRetry.setText("");
        }

        if (isNetworkConnected()) {
            WebView webView = getBridge() != null ? getBridge().getWebView() : null;
            if (webView != null) {
                String target = (lastTargetUrl != null && !lastTargetUrl.isEmpty() && !lastTargetUrl.contains("offline.html") && !lastTargetUrl.equals("about:blank"))
                    ? lastTargetUrl
                    : DEFAULT_URL;
                webView.loadUrl(target);
            }

            // Watchdog fallback in case network connects but server hangs
            resetTimeoutWatchdog();

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
                }, 3000);
            }
        } else {
            if (offlineOverlayView != null) {
                offlineOverlayView.postDelayed(() -> {
                    isRetrying = false;
                    if (pbRetry != null) pbRetry.setVisibility(View.GONE);
                    if (btnRetry != null) {
                        btnRetry.setEnabled(true);
                        btnRetry.setText("Retry");
                    }
                    showOfflineOverlay(ErrorType.OFFLINE);
                    Toast.makeText(MainActivity.this, "No internet connection. Please check your network and try again.", Toast.LENGTH_SHORT).show();
                }, 600);
            }
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
                        );
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
                            if (offlineOverlayView != null && offlineOverlayView.getVisibility() == View.VISIBLE) {
                                // CRITICAL: Never repeat checkout, payment, or order submissions automatically!
                                if (isNonIdempotentUrl(lastTargetUrl)) {
                                    Toast.makeText(MainActivity.this, "Connection restored. Tap Retry to proceed safely.", Toast.LENGTH_LONG).show();
                                    return;
                                }

                                // For safe idempotent pages (e.g. products, home, categories), auto-recover safely
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

    @Override
    public void onResume() {
        super.onResume();
        if (!isNetworkConnected()) {
            showOfflineOverlay(ErrorType.OFFLINE);
        }
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        cancelTimeoutWatchdog();
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
