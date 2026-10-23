package com.mai.chat.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.IconButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp

@Composable
fun ChatInputField(
    inputText: String,
    onInputChange: (String) -> Unit,
    onSend: () -> Unit,
    onStop: () -> Unit,
    isLoading: Boolean,
    uiLanguage: String = "en",
    modifier: Modifier = Modifier
) {
    val isTr = uiLanguage == "tr"

    Row(
        modifier = modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.background)
            .padding(horizontal = 14.dp, vertical = 8.dp)
            .navigationBarsPadding(),
        verticalAlignment = Alignment.CenterVertically
    ) {
        OutlinedTextField(
            value = inputText,
            onValueChange = onInputChange,
            modifier = Modifier.weight(1f),
            placeholder = {
                Text(
                    text = if (isTr) "mAI'a bir mesaj yazın..." else "Message mAI...",
                    color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f)
                )
            },
            shape = RoundedCornerShape(24.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedContainerColor = MaterialTheme.colorScheme.surface,
                unfocusedContainerColor = MaterialTheme.colorScheme.surface,
                focusedBorderColor = MaterialTheme.colorScheme.outline.copy(alpha = 0.5f),
                unfocusedBorderColor = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f),
                focusedTextColor = MaterialTheme.colorScheme.onSurface,
                unfocusedTextColor = MaterialTheme.colorScheme.onSurface
            ),
            maxLines = 5,
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Send),
            keyboardActions = KeyboardActions(
                onSend = {
                    if (inputText.isNotBlank() && !isLoading) {
                        onSend()
                    }
                }
            )
        )

        val canSend = inputText.isNotBlank() && !isLoading

        if (isLoading) {
            IconButton(
                onClick = onStop,
                modifier = Modifier
                    .padding(start = 8.dp)
                    .size(44.dp)
                    .clip(CircleShape),
                colors = IconButtonDefaults.iconButtonColors(
                    containerColor = MaterialTheme.colorScheme.error,
                    contentColor = MaterialTheme.colorScheme.onError
                )
            ) {
                Icon(
                    imageVector = Icons.Default.Stop,
                    contentDescription = if (isTr) "Cevabı Durdur" else "Stop generation",
                    modifier = Modifier.size(20.dp)
                )
            }
        } else {
            IconButton(
                onClick = onSend,
                enabled = canSend,
                modifier = Modifier
                    .padding(start = 8.dp)
                    .size(44.dp)
                    .clip(CircleShape),
                colors = IconButtonDefaults.iconButtonColors(
                    containerColor = if (canSend) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant,
                    contentColor = if (canSend) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.4f)
                )
            ) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.Send,
                    contentDescription = if (isTr) "Mesaj Gönder" else "Send message",
                    modifier = Modifier.size(19.dp)
                )
            }
        }
    }
}
