package com.triotech.assistrio;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;
import android.os.Build;
import android.webkit.WebView;
import android.webkit.WebSettings;
import android.util.Log;

public class MainActivity extends BridgeActivity {
  private boolean isEmulator = false;

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    isEmulator =
      Build.FINGERPRINT != null && (
        Build.FINGERPRINT.startsWith("generic")
          || Build.FINGERPRINT.toLowerCase().contains("emulator")
          || Build.FINGERPRINT.toLowerCase().contains("sdk_gphone")
      );

    if (isEmulator) {
      WebView.setWebContentsDebuggingEnabled(true);
    }

    super.onCreate(savedInstanceState);
    applyWebViewSettings();
  }

  @Override
  public void onResume() {
    super.onResume();
    applyWebViewSettings();
  }

  private void applyWebViewSettings() {
    try {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.LOLLIPOP) return;
      if (this.getBridge() == null) return;
      WebView webView = this.getBridge().getWebView();
      if (webView == null) return;
      WebSettings settings = webView.getSettings();
      if (settings == null) return;
      settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
      Log.i("Assistrio", "WebView settings applied: mixedContent=ALWAYS_ALLOW");
    } catch (Exception e) {
      Log.w("Assistrio", "Failed to apply WebView settings: " + e.getMessage());
    }
  }
}
