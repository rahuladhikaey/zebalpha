# ==============================================================================
# ZebAlpha Customer Android — R8 Full Mode ProGuard Rules
# Maximizes DEX shrinking, obfuscation & runtime optimization while preserving
# Capacitor 8 plugins, Firebase Messaging, and ZebAlphaNative JS Bridge.
# ==============================================================================

# Preserve stack trace line numbers for Google Play Console de-obfuscation
# while obfuscating original source filenames.
-keepattributes SourceFile,LineNumberTable,*Annotation*,Signature,InnerClasses,EnclosingMethod
-renamesourcefileattribute SourceFile

# ── 1. ZebAlpha Native WebView JavaScript Bridge (@JavascriptInterface) ──────
# Critical: keeps showNotification, getFcmToken, startVoiceSearch, shareContent, etc.
-keepattributes JavascriptInterface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keep public class com.zebalpha.customer.MainActivity$ZebAlphaNativeInterface {
    public *;
}

# ── 2. Manifest-referenced Entry Points (Activity & FCM Service) ─────────────
-keep public class com.zebalpha.customer.MainActivity
-keep public class com.zebalpha.customer.ZebAlphaFirebaseMessagingService

# ── 3. Capacitor 8 Core, Plugins & Reflection-loaded Plugin Methods ──────────
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keep class * extends com.getcapacitor.Plugin {
    public <init>(...);
    @com.getcapacitor.PluginMethod <methods>;
    @com.getcapacitor.annotation.PermissionCallback <methods>;
    @com.getcapacitor.annotation.ActivityCallback <methods>;
}
-keep class com.getcapacitor.** { *; }
-keep class com.capacitorjs.plugins.** { *; }
-keep class org.apache.cordova.** { *; }

# ── 4. Safe Reflection / JSON / WebView Interop Guards ───────────────────────
-dontwarn org.apache.cordova.**
-dontwarn com.getcapacitor.**
-dontwarn androidx.webkit.**
