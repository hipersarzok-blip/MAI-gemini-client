package com.mai.chat.ui.components

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.widget.Toast
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.mai.chat.data.local.MessageEntity
import com.mai.chat.data.local.MessageRole

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun ChatBubble(
    message: MessageEntity, 
    uiLanguage: String = "en",
    isStreaming: Boolean = false
) {
    val context = LocalContext.current
    val isTr = uiLanguage == "tr"
    val isUser = message.role == MessageRole.USER

    // Blinking cursor transition for active streaming text
    val infiniteTransition = rememberInfiniteTransition(label = "cursor_blink")
    val cursorAlpha by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = 0f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 500, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "cursor_alpha"
    )

    val copyToClipboard: () -> Unit = {
        val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        val clip = ClipData.newPlainText("mAI Message", message.text)
        clipboard.setPrimaryClip(clip)
        val notice = if (isTr) "Metin panoya kopyalandı" else "Text copied to clipboard"
        Toast.makeText(context, notice, Toast.LENGTH_SHORT).show()
    }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 14.dp, vertical = 6.dp),
        horizontalArrangement = if (isUser) Arrangement.End else Arrangement.Start,
        verticalAlignment = Alignment.Top
    ) {
        if (!isUser) {
            Surface(
                modifier = Modifier
                    .size(28.dp)
                    .clip(CircleShape),
                color = MaterialTheme.colorScheme.primaryContainer
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        imageVector = Icons.Default.AutoAwesome,
                        contentDescription = "AI",
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(16.dp)
                    )
                }
            }
            Spacer(modifier = Modifier.width(8.dp))
        }

        Column(
            horizontalAlignment = if (isUser) Alignment.End else Alignment.Start,
            modifier = Modifier.widthIn(max = 330.dp)
        ) {
            Surface(
                shape = RoundedCornerShape(
                    topStart = 18.dp,
                    topEnd = 18.dp,
                    bottomStart = if (isUser) 18.dp else 4.dp,
                    bottomEnd = if (isUser) 4.dp else 18.dp
                ),
                color = if (isUser) {
                    MaterialTheme.colorScheme.surfaceVariant
                } else {
                    MaterialTheme.colorScheme.surface
                },
                tonalElevation = if (isUser) 1.dp else 2.dp,
                shadowElevation = 1.dp,
                modifier = Modifier
                    .clip(
                        RoundedCornerShape(
                            topStart = 18.dp,
                            topEnd = 18.dp,
                            bottomStart = if (isUser) 18.dp else 4.dp,
                            bottomEnd = if (isUser) 4.dp else 18.dp
                        )
                    )
                    .combinedClickable(
                        onClick = {},
                        onLongClick = copyToClipboard
                    )
            ) {
                Box(modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp)) {
                    val formattedText = formatRoleplayAndMarkdown(
                        text = message.text,
                        primaryColor = MaterialTheme.colorScheme.primary,
                        isUser = isUser
                    )

                    Row(verticalAlignment = Alignment.Bottom) {
                        Text(
                            text = formattedText,
                            style = MaterialTheme.typography.bodyMedium.copy(
                                fontSize = 15.sp,
                                lineHeight = 22.sp
                            ),
                            color = MaterialTheme.colorScheme.onSurface
                        )

                        // Animated live blinking cursor when streaming tokens
                        if (isStreaming) {
                            Box(
                                modifier = Modifier
                                    .padding(start = 2.dp, bottom = 2.dp)
                                    .size(width = 3.dp, height = 16.dp)
                                    .alpha(cursorAlpha)
                                    .background(MaterialTheme.colorScheme.primary, RoundedCornerShape(1.dp))
                            )
                        }
                    }
                }
            }

            // Quick Copy action button on AI messages
            if (!isUser && !isStreaming) {
                Row(
                    modifier = Modifier.padding(top = 2.dp, start = 4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(
                        onClick = copyToClipboard,
                        modifier = Modifier.size(24.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.ContentCopy,
                            contentDescription = if (isTr) "Kopyala" else "Copy",
                            tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f),
                            modifier = Modifier.size(13.dp)
                        )
                    }
                }
            }
        }

        if (isUser) {
            Spacer(modifier = Modifier.width(8.dp))
            Surface(
                modifier = Modifier
                    .size(28.dp)
                    .clip(CircleShape),
                color = MaterialTheme.colorScheme.surfaceVariant
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        imageVector = Icons.Default.Person,
                        contentDescription = "User",
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(16.dp)
                    )
                }
            }
        }
    }
}

/**
 * Animated Typing Indicator Bubble with 3 pulsing/bouncing dots.
 * Displayed while waiting for the Gemini stream's first token.
 */
@Composable
fun TypingIndicatorBubble(uiLanguage: String = "en") {
    val isTr = uiLanguage == "tr"
    val infiniteTransition = rememberInfiniteTransition(label = "typing_dots")

    val dot1Offset by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = -6f,
        animationSpec = infiniteRepeatable(
            animation = tween(400, delayMillis = 0, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "dot1"
    )

    val dot2Offset by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = -6f,
        animationSpec = infiniteRepeatable(
            animation = tween(400, delayMillis = 150, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "dot2"
    )

    val dot3Offset by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = -6f,
        animationSpec = infiniteRepeatable(
            animation = tween(400, delayMillis = 300, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "dot3"
    )

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 14.dp, vertical = 6.dp),
        horizontalArrangement = Arrangement.Start,
        verticalAlignment = Alignment.Top
    ) {
        Surface(
            modifier = Modifier
                .size(28.dp)
                .clip(CircleShape),
            color = MaterialTheme.colorScheme.primaryContainer
        ) {
            Box(contentAlignment = Alignment.Center) {
                Icon(
                    imageVector = Icons.Default.AutoAwesome,
                    contentDescription = "AI",
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(16.dp)
                )
            }
        }
        Spacer(modifier = Modifier.width(8.dp))

        Column {
            Surface(
                shape = RoundedCornerShape(
                    topStart = 18.dp,
                    topEnd = 18.dp,
                    bottomStart = 4.dp,
                    bottomEnd = 18.dp
                ),
                color = MaterialTheme.colorScheme.surface,
                tonalElevation = 2.dp,
                shadowElevation = 1.dp
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(5.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .offset(y = dot1Offset.dp)
                            .size(7.dp)
                            .clip(CircleShape)
                            .background(Color(0xFF4285F4))
                    )
                    Box(
                        modifier = Modifier
                            .offset(y = dot2Offset.dp)
                            .size(7.dp)
                            .clip(CircleShape)
                            .background(Color(0xFF9B72CB))
                    )
                    Box(
                        modifier = Modifier
                            .offset(y = dot3Offset.dp)
                            .size(7.dp)
                            .clip(CircleShape)
                            .background(Color(0xFFD96570))
                    )
                }
            }

            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = if (isTr) "Gemini düşünüyor & yazıyor..." else "Gemini is typing...",
                style = MaterialTheme.typography.labelSmall.copy(fontSize = 11.sp),
                color = MaterialTheme.colorScheme.primary.copy(alpha = 0.85f),
                modifier = Modifier.padding(start = 4.dp)
            )
        }
    }
}

@Composable
private fun formatRoleplayAndMarkdown(
    text: String,
    primaryColor: androidx.compose.ui.graphics.Color,
    isUser: Boolean
): androidx.compose.ui.text.AnnotatedString {
    return buildAnnotatedString {
        var i = 0
        val len = text.length

        while (i < len) {
            if (i + 1 < len && text[i] == '*' && text[i + 1] == '*') {
                val end = text.indexOf("**", i + 2)
                if (end != -1) {
                    withStyle(SpanStyle(fontWeight = FontWeight.Bold)) {
                        append(text.substring(i + 2, end))
                    }
                    i = end + 2
                    continue
                }
            }

            if (text[i] == '*') {
                val end = text.indexOf('*', i + 1)
                if (end != -1) {
                    withStyle(
                        SpanStyle(
                            fontStyle = FontStyle.Italic,
                            color = if (isUser) primaryColor.copy(alpha = 0.85f) else primaryColor
                        )
                    ) {
                        append("*" + text.substring(i + 1, end) + "*")
                    }
                    i = end + 1
                    continue
                }
            }

            append(text[i])
            i++
        }
    }
}
