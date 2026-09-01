package com.kvsr.mgmt;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebView;

import android.webkit.GeolocationPermissions;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebView;
import android.net.Uri;

public class MainActivity extends BridgeActivity {

    @Override
    public void onResume() {
        super.onResume();

        BridgeWebView webView = getBridge().getWebView();
        if (webView == null) return;

        // Enable geolocation in the WebView (used by navigator.geolocation).
        webView.getSettings().setGeolocationEnabled(true);
        webView.getSettings().setMediaPlaybackRequiresUserGesture(false);

        // Wrap Capacitor's existing WebChromeClient so we keep file chooser /
        // plugin behaviour but also grant camera + geolocation to the web app
        // (required for getUserMedia based face recognition).
        final WebChromeClient existing = webView.getWebChromeClient();

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        request.grant(request.getResources());
                    }
                });
            }

            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                callback.invoke(origin, true, false);
            }

            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> filePath, FileChooserParams fileChooserParams) {
                if (existing != null) return existing.onShowFileChooser(view, filePath, fileChooserParams);
                return false;
            }

            @Override
            public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, android.os.Message resultMsg) {
                if (existing != null) return existing.onCreateWindow(view, isDialog, isUserGesture, resultMsg);
                return false;
            }

            @Override
            public void onConsoleMessage(String message, int lineNumber, String sourceID) {
                if (existing != null) {
                    existing.onConsoleMessage(message, lineNumber, sourceID);
                } else {
                    super.onConsoleMessage(message, lineNumber, sourceID);
                }
            }
        });
    }
}
