package com.mai.chat.data.local

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

/**
 * Represents an individual chat message in a conversation.
 */
@Entity(
    tableName = "messages",
    foreignKeys = [
        ForeignKey(
            entity = ConversationEntity::class,
            parentColumns = ["id"],
            childColumns = ["conversationId"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [Index(value = ["conversationId"])]
)
data class MessageEntity(
    @PrimaryKey
    val id: String,
    val conversationId: String,
    val role: MessageRole,
    val text: String,
    val timestamp: Long = System.currentTimeMillis()
)

enum class MessageRole {
    USER,
    MODEL
}
