# ProGuard rules for mAI - Android Native Client
-keep class com.google.ai.client.generativeai.** { *; }
-dontwarn com.google.ai.client.generativeai.**

# Room Database & Entities
-keepclassmembers class * extends androidx.room.RoomDatabase {
    public abstract <methods>;
}
-keep class * extends androidx.room.RoomDatabase
-keep class com.mai.chat.data.local.** { *; }
-dontwarn androidx.room.**

# Kotlin Coroutines
-keepnames class kotlinx.coroutines.internal.MainDispatcherFactory {}
-keepnames class kotlinx.coroutines.CoroutineExceptionHandler {}
-keepclassmembers class kotlinx.coroutines.** {
    volatile <fields>;
}

# AndroidX Security Crypto
-keep class androidx.security.crypto.** { *; }

