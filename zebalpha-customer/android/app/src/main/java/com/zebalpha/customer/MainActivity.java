package com.zebalpha.customer;

import android.content.Context;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.NetworkRequest;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.Button;
import android.widget.ImageButton;
import android.widget.ProgressBar;
import android.widget.Toast;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;

public class MainActivity extends BridgeActivity {

    private View offlineOverlayView;
    private Button btnRetry;
    private ProgressBar pbRetry;
    private String lastTargetUrl = "https://zebalpha.shop";
    private ConnectivityManager.NetworkCallback networkCallback;

    @Override
    protected void load() {
        // Register webview listener to detect load errors and successful page loads
        bridgeBuilder.addWebViewListener(new WebViewListener() {
            @Override
            public void onPageLoaded(WebView webView) {
                runOnUiThread(() -> {
                    String url = webView.getUrl();
                    if (isNetworkConnected() && url != null && !url.contains("offline.html") && !url.equals("about:blank")) {
                        hideOfflineOverlay();
                    }
                });
            }

            @Override
            public void onReceivedError(WebView webView) {
                runOnUiThread(() -> {
                    String url = webView.getUrl();
                    if (url != null && !url.contains("offline.html") && !url.equals("about:blank")) {
                        lastTargetUrl = url;
                    }
                    showOfflineOverlay();
                });
            }

            @Override
            public void onReceivedHttpError(WebView webView) {
                runOnUiThread(() -> {
                    if (!isNetworkConnected()) {
                        showOfflineOverlay();
                    }
                });
            }
        });

        super.load();
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // 1. Setup offline error overlay matching Picture 2
        setupOfflineOverlay();

        // 2. Custom User-Agent header for Android App identification
        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                WebSettings settings = getBridge().getWebView().getSettings();
                String defaultUa = settings.getUserAgentString();
                if (!defaultUa.contains("ZEBALPHA_ANDROID_APP")) {
                    settings.setUserAgentString(defaultUa + " ZEBALPHA_ANDROID_APP");
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        // 3. Initial check: If app opened with no internet, show offline overlay immediately
        if (!isNetworkConnected()) {
            showOfflineOverlay();
        }

        // 4. Register automatic network reconnection callback
        registerNetworkCallback();

        // 5. Back navigation handler
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (offlineOverlayView != null && offlineOverlayView.getVisibility() == View.VISIBLE) {
                    WebView webView = getBridge() != null ? getBridge().getWebView() : null;
                    if (webView != null && webView.canGoBack()) {
                        hideOfflineOverlay();
                        webView.goBack();
                    } else {
                        setEnabled(false);
                        getOnBackPressedDispatcher().onBackPressed();
                    }
                    return;
                }

                WebView webView = getBridge() != null ? getBridge().getWebView() : null;
                if (webView != null && webView.canGoBack()) {
                    webView.goBack();
                } else {
                    setEnabled(false);
                    getOnBackPressedDispatcher().onBackPressed();
                }
            }
        });
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

            btnBack.setOnClickListener(v -> {
                WebView webView = getBridge() != null ? getBridge().getWebView() : null;
                if (webView != null && webView.canGoBack()) {
                    hideOfflineOverlay();
                    webView.goBack();
                } else {
                    finish();
                }
            });

            btnRetry.setOnClickListener(v -> retryConnection());

            View.OnClickListener actionListener = v -> {
                if (isNetworkConnected()) {
                    retryConnection();
                } else {
                    Toast.makeText(MainActivity.this, "Please check your internet connection.", Toast.LENGTH_SHORT).show();
                }
            };

            btnSearch.setOnClickListener(actionListener);
            btnWishlist.setOnClickListener(actionListener);
            cartContainer.setOnClickListener(actionListener);

        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void showOfflineOverlay() {
        if (offlineOverlayView != null) {
            offlineOverlayView.setVisibility(View.VISIBLE);
            if (pbRetry != null) pbRetry.setVisibility(View.GONE);
            if (btnRetry != null) {
                btnRetry.setVisibility(View.VISIBLE);
                btnRetry.setEnabled(true);
            }
        }
        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView != null) {
            webView.stopLoading();
        }
    }

    private void hideOfflineOverlay() {
        if (offlineOverlayView != null) {
            offlineOverlayView.setVisibility(View.GONE);
            if (pbRetry != null) pbRetry.setVisibility(View.GONE);
            if (btnRetry != null) {
                btnRetry.setVisibility(View.VISIBLE);
                btnRetry.setEnabled(true);
            }
        }
    }

    private void retryConnection() {
        if (pbRetry != null) pbRetry.setVisibility(View.VISIBLE);
        if (btnRetry != null) btnRetry.setEnabled(false);

        if (isNetworkConnected()) {
            WebView webView = getBridge() != null ? getBridge().getWebView() : null;
            if (webView != null) {
                String target = (lastTargetUrl != null && !lastTargetUrl.isEmpty() && !lastTargetUrl.contains("offline.html") && !lastTargetUrl.equals("about:blank"))
                    ? lastTargetUrl
                    : "https://zebalpha.shop";
                webView.loadUrl(target);
            }

            if (offlineOverlayView != null) {
                offlineOverlayView.postDelayed(() -> {
                    if (isNetworkConnected()) {
                        hideOfflineOverlay();
                    } else {
                        if (pbRetry != null) pbRetry.setVisibility(View.GONE);
                        if (btnRetry != null) btnRetry.setEnabled(true);
                    }
                }, 1500);
            }
        } else {
            if (offlineOverlayView != null) {
                offlineOverlayView.postDelayed(() -> {
                    if (pbRetry != null) pbRetry.setVisibility(View.GONE);
                    if (btnRetry != null) btnRetry.setEnabled(true);
                    Toast.makeText(MainActivity.this, "No internet connection. Please check your network and try again.", Toast.LENGTH_SHORT).show();
                }, 500);
            }
        }
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
            e.printStackTrace();
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
                                retryConnection();
                            }
                        });
                    }
                };

                cm.registerNetworkCallback(request, networkCallback);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        if (!isNetworkConnected()) {
            showOfflineOverlay();
        }
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        try {
            if (networkCallback != null) {
                ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
                if (cm != null) {
                    cm.unregisterNetworkCallback(networkCallback);
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
