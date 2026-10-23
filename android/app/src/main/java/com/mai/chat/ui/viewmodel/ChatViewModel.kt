package com.mai.chat.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mai.chat.data.local.ConversationEntity
import com.mai.chat.data.local.MessageEntity
import com.mai.chat.data.preferences.PreferenceManager
import com.mai.chat.data.repository.ChatRepository
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class ChatViewModel(
    private val repository: ChatRepository,
    private val preferenceManager: PreferenceManager
) : ViewModel() {

    val conversations: StateFlow<List<ConversationEntity>> = repository.allConversations
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val apiKey: StateFlow<String> = preferenceManager.apiKeyFlow
    val isDarkTheme: StateFlow<Boolean?> = preferenceManager.isDarkThemeFlow
    val selectedModel: StateFlow<String> = preferenceManager.selectedModelFlow
    val uiLanguage: StateFlow<String> = preferenceManager.uiLanguageFlow

    private val _activeConversation = MutableStateFlow<ConversationEntity?>(null)
    val activeConversation: StateFlow<ConversationEntity?> = _activeConversation.asStateFlow()

    private val _messages = MutableStateFlow<List<MessageEntity>>(emptyList())
    val messages: StateFlow<List<MessageEntity>> = _messages.asStateFlow()

    private val _isStreaming = MutableStateFlow(false)
    val isStreaming: StateFlow<Boolean> = _isStreaming.asStateFlow()

    private val _streamingChunk = MutableStateFlow("")
    val streamingChunk: StateFlow<String> = _streamingChunk.asStateFlow()

    private var messagesJob: Job? = null
    private var streamingJob: Job? = null

    init {
        viewModelScope.launch {
            conversations.collect { list ->
                if (_activeConversation.value == null) {
                    if (list.isNotEmpty()) {
                        selectConversation(list.first().id)
                    } else {
                        val defaultTitle = if (uiLanguage.value == "tr") "Yeni Sohbet" else "New Chat"
                        createNewChat(title = defaultTitle)
                    }
                } else {
                    val currentId = _activeConversation.value?.id
                    val updated = list.find { it.id == currentId }
                    if (updated != null) {
                        _activeConversation.value = updated
                    }
                }
            }
        }
    }

    fun selectConversation(conversationId: String) {
        viewModelScope.launch {
            val conv = conversations.value.find { it.id == conversationId }
            _activeConversation.value = conv

            messagesJob?.cancel()
            messagesJob = viewModelScope.launch {
                repository.getMessagesForConversation(conversationId).collect { msgs ->
                    _messages.value = msgs
                }
            }
        }
    }

    fun createNewChat(directive: String = "", title: String = "") {
        viewModelScope.launch {
            val defaultTitle = if (title.isNotBlank()) title else if (uiLanguage.value == "tr") "Yeni Sohbet" else "New Chat"
            val newConv = repository.createNewConversation(directive = directive)
            if (defaultTitle != "New Chat") {
                repository.updateTitle(newConv.id, defaultTitle)
            }
            selectConversation(newConv.id)
        }
    }

    fun saveDirective(newDirective: String) {
        val currentConv = _activeConversation.value ?: return
        viewModelScope.launch {
            repository.updateDirective(currentConv.id, newDirective)
            _activeConversation.value = currentConv.copy(directive = newDirective)
        }
    }

    fun sendModelStarterMessage(greetingText: String) {
        val currentConv = _activeConversation.value ?: return
        val trimmed = greetingText.trim()
        if (trimmed.isEmpty()) return
        viewModelScope.launch {
            repository.insertAiMessage(currentConv.id, trimmed)
        }
    }

    fun renameConversation(newTitle: String) {
        val currentConv = _activeConversation.value ?: return
        val trimmed = newTitle.trim()
        if (trimmed.isEmpty()) return
        viewModelScope.launch {
            repository.updateTitle(currentConv.id, trimmed)
            _activeConversation.value = currentConv.copy(title = trimmed)
        }
    }

    fun deleteConversation(conversationId: String) {
        viewModelScope.launch {
            repository.deleteConversation(conversationId)
            if (_activeConversation.value?.id == conversationId) {
                _activeConversation.value = null
            }
        }
    }

    fun clearCurrentChat() {
        val currentConv = _activeConversation.value ?: return
        viewModelScope.launch {
            repository.clearMessagesForConversation(currentConv.id)
        }
    }

    fun saveApiKey(newKey: String) {
        preferenceManager.saveApiKey(newKey)
    }

    fun selectModel(modelId: String) {
        preferenceManager.saveSelectedModel(modelId)
    }

    fun setLanguage(lang: String) {
        preferenceManager.saveLanguage(lang)
    }

    fun toggleTheme() {
        val current = isDarkTheme.value ?: true
        preferenceManager.saveDarkTheme(!current)
    }

    fun stopStreaming() {
        streamingJob?.cancel()
        val currentChunk = _streamingChunk.value
        val conv = _activeConversation.value
        if (conv != null && currentChunk.isNotBlank()) {
            viewModelScope.launch {
                repository.insertAiMessage(conv.id, currentChunk)
            }
        }
        _isStreaming.value = false
        _streamingChunk.value = ""
    }

    fun sendMessage(text: String) {
        val conv = _activeConversation.value ?: return
        val trimmed = text.trim()
        if (trimmed.isBlank() || _isStreaming.value) return

        viewModelScope.launch {
            repository.insertUserMessage(conv.id, trimmed)

            _isStreaming.value = true
            _streamingChunk.value = ""

            val fullResponseBuilder = StringBuilder()

            streamingJob?.cancel()
            streamingJob = viewModelScope.launch {
                repository.streamGeminiResponse(
                    conversationId = conv.id,
                    prompt = trimmed,
                    directive = conv.directive,
                    modelName = selectedModel.value
                ).catch { error ->
                    _isStreaming.value = false
                    val msg = (error.message ?: "").lowercase()
                    val errorMsg = if (msg.contains("503") || msg.contains("overloaded") || msg.contains("unavailable") || msg.contains("high demand")) {
                        if (uiLanguage.value == "tr")
                            "Model Yoğunluğu (503): Google Gemini sunucularında anlık yoğunluk var. Lütfen birkaç saniye sonra tekrar deneyin."
                        else
                            "Model Overloaded (503): Gemini is currently experiencing heavy demand. Please try again in a few moments."
                    } else if (msg.contains("429") || msg.contains("quota") || msg.contains("resource_exhausted")) {
                        if (uiLanguage.value == "tr")
                            "Hız Limiti (429): İstek kotasına ulaşıldı. Lütfen birkaç saniye bekleyin veya kendi API anahtarınızı girin."
                        else
                            "Rate Limit (429): Quota reached. Please wait a few seconds or configure your API key."
                    } else {
                        val errorPrefix = if (uiLanguage.value == "tr") "Hata: " else "Error: "
                        errorPrefix + (error.message ?: "Failed to generate response")
                    }
                    repository.insertAiMessage(conv.id, errorMsg)
                    _streamingChunk.value = ""
                }.collect { chunk ->
                    if (chunk.isNotEmpty()) {
                        fullResponseBuilder.append(chunk)
                        _streamingChunk.value = fullResponseBuilder.toString()
                    }
                }

                // Streaming finished, commit message to Room
                if (fullResponseBuilder.isNotEmpty()) {
                    repository.insertAiMessage(conv.id, fullResponseBuilder.toString())
                } else if (_isStreaming.value) {
                    val fallbackNotice = if (uiLanguage.value == "tr")
                        "Üzgünüm, yanıt oluşturulurken anlık bir gecikme yaşandı. Lütfen mesajınızı tekrar iletin."
                    else
                        "I apologize, there was a temporary delay generating the response. Please try sending your message again."
                    repository.insertAiMessage(conv.id, fallbackNotice)
                }

                _isStreaming.value = false
                _streamingChunk.value = ""
            }
        }
    }
}
