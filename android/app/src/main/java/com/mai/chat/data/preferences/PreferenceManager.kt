package com.mai.chat.data.preferences

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class PreferenceManager(context: Context) {

    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()

    private val securePrefs = try {
        EncryptedSharedPreferences.create(
            context,
            "mai_secure_prefs",
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    } catch (e: Exception) {
        context.getSharedPreferences("mai_secure_fallback_prefs", Context.MODE_PRIVATE)
    }

    private val standardPrefs = context.getSharedPreferences("mai_ui_prefs", Context.MODE_PRIVATE)

    private val _apiKeyFlow = MutableStateFlow(getApiKey())
    val apiKeyFlow: StateFlow<String> = _apiKeyFlow.asStateFlow()

    private val _isDarkThemeFlow = MutableStateFlow(getDarkTheme())
    val isDarkThemeFlow: StateFlow<Boolean?> = _isDarkThemeFlow.asStateFlow()

    private val _selectedModelFlow = MutableStateFlow(getSelectedModel())
    val selectedModelFlow: StateFlow<String> = _selectedModelFlow.asStateFlow()

    private val _uiLanguageFlow = MutableStateFlow(getLanguage())
    val uiLanguageFlow: StateFlow<String> = _uiLanguageFlow.asStateFlow()

    fun getApiKey(): String {
        return securePrefs.getString(KEY_API_KEY, "") ?: ""
    }

    fun saveApiKey(key: String) {
        val trimmed = key.trim()
        securePrefs.edit().putString(KEY_API_KEY, trimmed).apply()
        _apiKeyFlow.value = trimmed
    }

    fun getSelectedModel(): String {
        return standardPrefs.getString(KEY_SELECTED_MODEL, DEFAULT_MODEL) ?: DEFAULT_MODEL
    }

    fun saveSelectedModel(modelId: String) {
        standardPrefs.edit().putString(KEY_SELECTED_MODEL, modelId).apply()
        _selectedModelFlow.value = modelId
    }

    fun getLanguage(): String {
        return standardPrefs.getString(KEY_UI_LANGUAGE, DEFAULT_LANGUAGE) ?: DEFAULT_LANGUAGE
    }

    fun saveLanguage(lang: String) {
        val clean = if (lang == "tr") "tr" else "en"
        standardPrefs.edit().putString(KEY_UI_LANGUAGE, clean).apply()
        _uiLanguageFlow.value = clean
    }

    fun getDarkTheme(): Boolean? {
        if (!standardPrefs.contains(KEY_DARK_THEME)) return null
        return standardPrefs.getBoolean(KEY_DARK_THEME, false)
    }

    fun saveDarkTheme(isDark: Boolean?) {
        if (isDark == null) {
            standardPrefs.edit().remove(KEY_DARK_THEME).apply()
        } else {
            standardPrefs.edit().putBoolean(KEY_DARK_THEME, isDark).apply()
        }
        _isDarkThemeFlow.value = isDark
    }

    companion object {
        const val DEFAULT_MODEL = "gemini-3.1-flash-lite"
        const val DEFAULT_LANGUAGE = "en"
        private const val KEY_API_KEY = "gemini_api_key"
        private const val KEY_SELECTED_MODEL = "selected_gemini_model"
        private const val KEY_UI_LANGUAGE = "ui_language"
        private const val KEY_DARK_THEME = "user_dark_theme_preference"
    }
}
