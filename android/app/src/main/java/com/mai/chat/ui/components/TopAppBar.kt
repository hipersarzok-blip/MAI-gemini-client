package com.mai.chat.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Menu
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Button
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import com.mai.chat.data.remote.GeminiService

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MaiTopAppBar(
    onMenuClick: () -> Unit,
    onOpenSettings: () -> Unit,
    onOpenDirective: () -> Unit,
    activeTitle: String,
    onRenameChat: (String) -> Unit,
    selectedModel: String,
    onSelectModel: (String) -> Unit,
    hasApiKey: Boolean,
    hasDirective: Boolean,
    uiLanguage: String = "en"
) {
    val isTr = uiLanguage == "tr"
    var isModelMenuExpanded by remember { mutableStateOf(false) }
    var isRenameDialogOpen by remember { mutableStateOf(false) }
    var renameInput by remember { mutableStateOf(activeTitle) }

    val activeModelObj = GeminiService.SUPPORTED_MODELS.find { it.id == selectedModel }
        ?: GeminiService.SUPPORTED_MODELS.first()

    TopAppBar(
        colors = TopAppBarDefaults.topAppBarColors(
            containerColor = MaterialTheme.colorScheme.background,
            titleContentColor = MaterialTheme.colorScheme.onBackground
        ),
        navigationIcon = {
            IconButton(onClick = onMenuClick) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.Menu,
                    contentDescription = if (isTr) "Sohbetler Çekmecesi" else "Open drawer",
                    tint = MaterialTheme.colorScheme.onBackground
                )
            }
        },
        title = {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.padding(start = 2.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(28.dp)
                        .clip(CircleShape)
                        .clickable { onMenuClick() },
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.AutoAwesome,
                        contentDescription = "mAI",
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(18.dp)
                    )
                }

                Spacer(modifier = Modifier.width(6.dp))

                Box {
                    Surface(
                        modifier = Modifier
                            .clip(RoundedCornerShape(16.dp))
                            .clickable { isModelMenuExpanded = true },
                        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.7f),
                        shape = RoundedCornerShape(16.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = activeModelObj.label,
                                style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.SemiBold),
                                color = MaterialTheme.colorScheme.onSurface
                            )
                            Icon(
                                imageVector = Icons.Default.ArrowDropDown,
                                contentDescription = null,
                                modifier = Modifier.size(16.dp),
                                tint = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }

                    DropdownMenu(
                        expanded = isModelMenuExpanded,
                        onDismissRequest = { isModelMenuExpanded = false }
                    ) {
                        GeminiService.SUPPORTED_MODELS.forEach { model ->
                            val isSelected = model.id == selectedModel
                            DropdownMenuItem(
                                text = {
                                    Column {
                                        Text(
                                            text = model.name,
                                            style = MaterialTheme.typography.bodyMedium.copy(
                                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                                            )
                                        )
                                        Text(
                                            text = if (isTr) model.descriptionTr else model.description,
                                            style = MaterialTheme.typography.labelSmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant
                                        )
                                    }
                                },
                                leadingIcon = if (isSelected) {
                                    {
                                        Icon(
                                            imageVector = Icons.Default.Check,
                                            contentDescription = null,
                                            tint = MaterialTheme.colorScheme.primary
                                        )
                                    }
                                } else null,
                                onClick = {
                                    onSelectModel(model.id)
                                    isModelMenuExpanded = false
                                }
                            )
                        }
                    }
                }
            }
        },
        actions = {
            if (activeTitle.isNotBlank()) {
                Surface(
                    modifier = Modifier
                        .clip(RoundedCornerShape(12.dp))
                        .clickable {
                            renameInput = activeTitle
                            isRenameDialogOpen = true
                        }
                        .padding(horizontal = 4.dp),
                    color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 5.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = activeTitle,
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            modifier = Modifier.widthIn(max = 110.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Icon(
                            imageVector = Icons.Default.Edit,
                            contentDescription = if (isTr) "Sohbeti Yeniden Adlandır" else "Rename Chat",
                            tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f),
                            modifier = Modifier.size(12.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.width(4.dp))

            Surface(
                modifier = Modifier
                    .clip(RoundedCornerShape(16.dp))
                    .clickable { onOpenDirective() },
                color = if (hasDirective) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.8f),
                shape = RoundedCornerShape(16.dp)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 9.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "🎭",
                        fontSize = 12.sp
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = if (isTr) "Yönerge" else "Directive",
                        style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Medium),
                        color = if (hasDirective) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface
                    )
                    if (hasDirective) {
                        Spacer(modifier = Modifier.width(4.dp))
                        Box(
                            modifier = Modifier
                                .size(6.dp)
                                .clip(CircleShape)
                                .background(MaterialTheme.colorScheme.primary)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.width(4.dp))

            Surface(
                modifier = Modifier
                    .clip(RoundedCornerShape(16.dp))
                    .clickable { onOpenSettings() },
                color = when {
                    !hasApiKey -> MaterialTheme.colorScheme.error
                    hasDirective -> MaterialTheme.colorScheme.primary
                    else -> MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.8f)
                },
                shape = RoundedCornerShape(16.dp)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.Settings,
                        contentDescription = if (isTr) "Ayarlar" else "Settings",
                        tint = when {
                            !hasApiKey -> MaterialTheme.colorScheme.onError
                            hasDirective -> MaterialTheme.colorScheme.onPrimary
                            else -> MaterialTheme.colorScheme.onSurfaceVariant
                        },
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = if (isTr) "Ayarlar" else "Settings",
                        style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Medium),
                        color = when {
                            !hasApiKey -> MaterialTheme.colorScheme.onError
                            hasDirective -> MaterialTheme.colorScheme.onPrimary
                            else -> MaterialTheme.colorScheme.onSurface
                        }
                    )
                    if (hasDirective) {
                        Spacer(modifier = Modifier.width(4.dp))
                        Box(
                            modifier = Modifier
                                .size(6.dp)
                                .clip(CircleShape)
                                .background(MaterialTheme.colorScheme.onPrimary)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.width(8.dp))
        }
    )

    if (isRenameDialogOpen) {
        Dialog(onDismissRequest = { isRenameDialogOpen = false }) {
            Surface(
                shape = RoundedCornerShape(16.dp),
                color = MaterialTheme.colorScheme.surface,
                modifier = Modifier.fillMaxWidth().padding(16.dp)
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Text(
                        text = if (isTr) "Sohbeti Yeniden Adlandır" else "Rename Conversation",
                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    OutlinedTextField(
                        value = renameInput,
                        onValueChange = { renameInput = it },
                        label = { Text(if (isTr) "Sohbet Başlığı" else "Conversation Title") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(10.dp)
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.End
                    ) {
                        TextButton(onClick = { isRenameDialogOpen = false }) {
                            Text(if (isTr) "İptal" else "Cancel")
                        }
                        Spacer(modifier = Modifier.width(8.dp))
                        Button(
                            onClick = {
                                onRenameChat(renameInput.trim())
                                isRenameDialogOpen = false
                            },
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Text(if (isTr) "Kaydet" else "Save")
                        }
                    }
                }
            }
        }
    }
}
