package com.mai.chat

import android.app.Application
import com.mai.chat.data.local.AppDatabase
import com.mai.chat.data.preferences.PreferenceManager
import com.mai.chat.data.repository.ChatRepository

/**
 * mAI Application instance holding singletons for local database,
 * preferences, and the chat repository.
 */
class MaiApplication : Application() {

    lateinit var database: AppDatabase
        private set

    lateinit var preferenceManager: PreferenceManager
        private set

    lateinit var chatRepository: ChatRepository
        private set

    override fun onCreate() {
        super.onCreate()
        database = AppDatabase.getDatabase(this)
        preferenceManager = PreferenceManager(this)
        chatRepository = ChatRepository(
            conversationDao = database.conversationDao(),
            messageDao = database.messageDao(),
            preferenceManager = preferenceManager
        )
    }
}
