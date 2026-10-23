package com.mai.chat.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Represents a conversation thread in mAI.
 *
 * @param id Unique identifier
 * @param title Dynamic conversation title derived from the first prompt
 * @param directive Custom system instruction and persona context for this conversation
 * @param createdAt Epoch timestamp when conversation was initiated
 * @param updatedAt Epoch timestamp of the latest interaction
 */
@Entity(tableName = "conversations")
data class ConversationEntity(
    @PrimaryKey
    val id: String,
    val title: String,
    val directive: String = "",
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis()
)
