# Legacy JavaScript bridge (used only when WebMessageListener is unavailable).
-keepclassmembers class id.hengki.monovra.bridge.LegacyJsInterface {
    @android.webkit.JavascriptInterface <methods>;
}
-keepattributes JavascriptInterface
