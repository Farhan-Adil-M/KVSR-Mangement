package com.kvsr.mgmt;

import com.getcapacitor.BridgeActivity;

import android.webkit.WebView;

public class MainActivity extends BridgeActivity {

    @Override
    public void onResume() {
        super.onResume();

        WebView webView = getBridge().getWebView();
        if (webView == null) return;

        // Enable browser geolocation in the WebView. Capacitor's own
        // BridgeWebChromeClient already handles the runtime permission
        // prompts for camera (getUserMedia) and location, so no custom
        // WebChromeClient is needed.
        webView.getSettings().setGeolocationEnabled(true);
        webView.getSettings().setMediaPlaybackRequiresUserGesture(false);
    }
}
