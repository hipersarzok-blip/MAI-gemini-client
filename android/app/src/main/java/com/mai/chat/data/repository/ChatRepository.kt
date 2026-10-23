package com.mai.chat.data.repository

import com.mai.chat.data.local.ConversationDao
import com.mai.chat.data.local.ConversationEntity
import com.mai.chat.data.local.MessageDao
import com.mai.chat.data.local.MessageEntity
import com.mai.chat.data.local.MessageRole
import com.mai.chat.data.preferences.PreferenceManager
import com.mai.chat.data.remote.GeminiService
import kotlinx.coroutines.flow.Flow
import java.util.UUID

class ChatRepository(
    private val conversationDao: ConversationDao,
    private val messageDao: MessageDao,
    private val preferenceManager: PreferenceManager,
    private val geminiService: GeminiService = GeminiService()
) {

    val allConversations: Flow<List<ConversationEntity>> = conversationDao.getAllConversations()

    fun getConversationFlow(id: String): Flow<ConversationEntity?> =
        conversationDao.getConversationFlow(id)

    fun getMessagesForConversation(conversationId: String): Flow<List<MessageEntity>> =
        messageDao.getMessagesForConversation(conversationId)

    suspend fun createNewConversation(directive: String = ""): ConversationEntity {
        val newConv = ConversationEntity(
            id = UUID.randomUUID().toString(),
            title = "New Chat",
            directive = directive,
            createdAt = System.currentTimeMillis(),
            updatedAt = System.currentTimeMillis()
        )
        conversationDao.insertConversation(newConv)
        return newConv
    }

    suspend fun updateDirective(conversationId: String, directive: String) {
        conversationDao.updateDirective(conversationId, directive)
    }

    suspend fun updateTitle(conversationId: String, title: String) {
        conversationDao.updateTitle(conversationId, title, System.currentTimeMillis())
    }

    suspend fun deleteConversation(conversationId: String) {
        messageDao.deleteMessagesForConversation(conversationId)
        conversationDao.deleteConversationById(conversationId)
    }

    suspend fun clearMessagesForConversation(conversationId: String) {
        messageDao.deleteMessagesForConversation(conversationId)
    }

    suspend fun insertUserMessage(conversationId: String, text: String): MessageEntity {
        val userMessage = MessageEntity(
            id = UUID.randomUUID().toString(),
            conversationId = conversationId,
            role = MessageRole.USER,
            text = text,
            timestamp = System.currentTimeMillis()
        )
        messageDao.insertMessage(userMessage)

        // Auto-title conversation from first prompt if needed
        val existing = messageDao.getMessagesList(conversationId)
        if (existing.size <= 1) {
            val title = if (text.length > 28) text.take(28).trim() + "..." else text.trim()
            conversationDao.updateTitle(conversationId, title, System.currentTimeMillis())
        }

        return userMessage
    }

    suspend fun insertAiMessage(conversationId: String, text: String): MessageEntity {
        val aiMessage = MessageEntity(
            id = UUID.randomUUID().toString(),
            conversationId = conversationId,
            role = MessageRole.MODEL,
            text = text,
            timestamp = System.currentTimeMillis()
        )
        messageDao.insertMessage(aiMessage)
        return aiMessage
    }

    suspend fun streamGeminiResponse(
        conversationId: String,
        prompt: String,
        directive: String,
        modelName: String = GeminiService.DEFAULT_MODEL
    ): Flow<String> {
        val apiKey = preferenceManager.getApiKey()
        if (apiKey.isBlank()) {
            throw IllegalStateException("API Key bulunamadı. Lütfen sağ üstteki 'Ayarlar' (⚙️) menüsünden Gemini API anahtarınızı girin.")
        }

        val allMessages = messageDao.getMessagesList(conversationId)
        val history = if (allMessages.isNotEmpty() && allMessages.last().text == prompt && allMessages.last().role == MessageRole.USER) {
            allMessages.dropLast(1)
        } else {
            allMessages.filter { it.text != prompt || it.role != MessageRole.USER }
        }

        return geminiService.generateContentStream(
            apiKey = apiKey,
            directive = directive,
            history = history,
            newPrompt = prompt,
            modelName = modelName
        )
    }
}
