package com.mai.chat.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import com.mai.chat.data.preferences.PreferenceManager
import com.mai.chat.data.repository.ChatRepository

@Suppress("UNCHECKED_CAST")
class ChatViewModelFactory(
    private val repository: ChatRepository,
    private val preferenceManager: PreferenceManager
) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(ChatViewModel::class.java)) {
            return ChatViewModel(repository, preferenceManager) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}
