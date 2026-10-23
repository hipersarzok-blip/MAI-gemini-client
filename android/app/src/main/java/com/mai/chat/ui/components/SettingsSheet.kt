package com.mai.chat.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Globe
import androidx.compose.material.icons.filled.Key
import androidx.compose.material.icons.filled.NightlightRound
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.WbSunny
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.mai.chat.data.remote.GeminiService

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsSheet(
    isOpen: Boolean,
    onDismiss: () -> Unit,
    currentDirective: String,
    onOpenDirective: () -> Unit,
    apiKey: String,
    onSaveApiKey: (String) -> Unit,
    selectedModel: String,
    onSelectModel: (String) -> Unit,
    isDarkMode: Boolean,
    onToggleTheme: () -> Unit,
    uiLanguage: String,
    onSelectLanguage: (String) -> Unit,
    onClearChat: () -> Unit,
    onDeleteChat: () -> Unit,
    activeChatTitle: String?
) {
    if (!isOpen) return

    val isTr = uiLanguage == "tr"
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val scrollState = rememberScrollState()

    var tempApiKey by remember { mutableStateOf(apiKey) }
    var showApiKeyText by remember { mutableStateOf(false) }

    LaunchedEffect(apiKey) {
        tempApiKey = apiKey
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = MaterialTheme.colorScheme.surface,
        shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp)
                .verticalScroll(scrollState)
                .padding(bottom = 36.dp)
        ) {
            // Header
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(36.dp)
                            .clip(CircleShape)
                            .background(MaterialTheme.colorScheme.primaryContainer),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Settings,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text(
                            text = if (isTr) "Ayarlar" else "Settings",
                            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        if (!activeChatTitle.isNullOrBlank()) {
                            Text(
                                text = activeChatTitle,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                    }
                }

                IconButton(onClick = onDismiss) {
                    Icon(
                        imageVector = Icons.Default.Close,
                        contentDescription = if (isTr) "Kapat" else "Close",
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // ==========================================
            // SECTION 1: DIRECTIVE & ROLEPLAY PROMPT CARD
            // ==========================================
            Text(
                text = if (isTr) "SOHBET DİREKTİFİ & KİŞİLİK" else "CHAT DIRECTIVE & PERSONA",
                style = MaterialTheme.typography.labelMedium.copy(
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.sp
                ),
                color = MaterialTheme.colorScheme.primary
            )
            Spacer(modifier = Modifier.height(8.dp))

            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp))
                    .clickable { 
                        onDismiss()
                        onOpenDirective()
                    },
                color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                shape = RoundedCornerShape(16.dp)
            ) {
                Row(
                    modifier = Modifier.padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(
                        modifier = Modifier.weight(1f),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(40.dp)
                                .clip(CircleShape)
                                .background(MaterialTheme.colorScheme.primaryContainer),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = if (currentDirective.contains("ROLEPLAY")) "🎭" else "✨",
                                fontSize = 20.sp
                            )
                        }
                        Spacer(modifier = Modifier.width(12.dp))
                        Column {
                            Text(
                                text = if (isTr) "Sohbet Direktifini Yapılandır" else "Configure Chat Directive",
                                style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Bold),
                                color = MaterialTheme.colorScheme.onSurface
                            )
                            Text(
                                text = if (currentDirective.isNotBlank()) {
                                    if (isTr) "✓ Özel Direktif / Rol Tanımlı" else "✓ Custom Directive Active"
                                } else {
                                    if (isTr) "Rol yapma veya asistanlık direktifi seçin" else "Choose roleplay or assistant persona"
                                },
                                style = MaterialTheme.typography.bodySmall,
                                color = if (currentDirective.isNotBlank()) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }

                    FilledTonalButton(
                        onClick = {
                            onDismiss()
                            onOpenDirective()
                        },
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Text(if (isTr) "Düzenle" else "Edit")
                    }
                }
            }

            HorizontalDivider(modifier = Modifier.padding(vertical = 16.dp))

            // ==========================================
            // SECTION 2: MODEL SELECTION
            // ==========================================
            Text(
                text = if (isTr) "GEMINI MODEL SEÇİMİ" else "GEMINI MODEL SELECTION",
                style = MaterialTheme.typography.labelMedium.copy(
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.sp
                ),
                color = MaterialTheme.colorScheme.primary
            )
            Spacer(modifier = Modifier.height(8.dp))

            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                GeminiService.SUPPORTED_MODELS.forEach { model ->
                    val isSelected = model.id == selectedModel
                    Surface(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .border(
                                width = if (isSelected) 1.5.dp else 0.dp,
                                color = if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant,
                                shape = RoundedCornerShape(12.dp)
                            )
                            .clickable { onSelectModel(model.id) },
                        color = if (isSelected) MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.4f) else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(
                                        text = model.name,
                                        style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Bold),
                                        color = MaterialTheme.colorScheme.onSurface
                                    )
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text(
                                        text = "(${model.id})",
                                        style = MaterialTheme.typography.labelSmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f)
                                    )
                                }
                                Text(
                                    text = if (isTr) model.descriptionTr else model.description,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                            if (isSelected) {
                                Icon(
                                    imageVector = Icons.Default.Check,
                                    contentDescription = "Selected",
                                    tint = MaterialTheme.colorScheme.primary
                                )
                            }
                        }
                    }
                }
            }

            HorizontalDivider(modifier = Modifier.padding(vertical = 16.dp))

            // ==========================================
            // SECTION 3: GEMINI API KEY
            // ==========================================
            Text(
                text = if (isTr) "GEMINI API ANAHTARI" else "GEMINI API KEY",
                style = MaterialTheme.typography.labelMedium.copy(
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.sp
                ),
                color = MaterialTheme.colorScheme.primary
            )
            Spacer(modifier = Modifier.height(8.dp))

            OutlinedTextField(
                value = tempApiKey,
                onValueChange = { tempApiKey = it },
                label = { Text("Google Gemini API Key") },
                placeholder = { Text("AIzaSy...") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                visualTransformation = if (showApiKeyText) VisualTransformation.None else PasswordVisualTransformation(),
                trailingIcon = {
                    IconButton(onClick = { showApiKeyText = !showApiKeyText }) {
                        Icon(
                            imageVector = Icons.Default.Key,
                            contentDescription = if (isTr) "Anahtarı Göster/Gizle" else "Toggle key visibility",
                            tint = if (tempApiKey.isNotBlank()) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                },
                shape = RoundedCornerShape(12.dp)
            )
            Spacer(modifier = Modifier.height(8.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = if (tempApiKey.isNotBlank()) {
                        if (isTr) "✓ API Anahtarı Kayıtlı" else "✓ API Key Configured"
                    } else {
                        if (isTr) "⚠️ API Anahtarı Girilmelidir" else "⚠️ API Key Required"
                    },
                    style = MaterialTheme.typography.bodySmall,
                    color = if (tempApiKey.isNotBlank()) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error
                )

                Button(
                    onClick = { onSaveApiKey(tempApiKey.trim()) },
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text(if (isTr) "Kaydet" else "Save")
                }
            }

            HorizontalDivider(modifier = Modifier.padding(vertical = 16.dp))

            // ==========================================
            // SECTION 4: APPEARANCE & THEME
            // ==========================================
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column {
                    Text(
                        text = if (isTr) "Görünüm Teması" else "Appearance Theme",
                        style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Bold),
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Text(
                        text = if (isDarkMode) {
                            if (isTr) "Koyu Tema Aktif" else "Dark Theme Active"
                        } else {
                            if (isTr) "Açık Tema Aktif" else "Light Theme Active"
                        },
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                FilledTonalButton(
                    onClick = onToggleTheme,
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Icon(
                        imageVector = if (isDarkMode) Icons.Default.WbSunny else Icons.Default.NightlightRound,
                        contentDescription = null
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        if (isDarkMode) {
                            if (isTr) "Açık Tema" else "Light Theme"
                        } else {
                            if (isTr) "Koyu Tema" else "Dark Theme"
                        }
                    )
                }
            }

            HorizontalDivider(modifier = Modifier.padding(vertical = 16.dp))

            // ==========================================
            // SECTION 5: UI LANGUAGE
            // ==========================================
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.Globe,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = if (isTr) "Arayüz Dili" else "UI Language",
                        style = MaterialTheme.typography.labelMedium.copy(
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 1.sp
                        ),
                        color = MaterialTheme.colorScheme.primary
                    )
                }
                Text(
                    text = if (uiLanguage == "en") "English (Default)" else "Türkçe",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Spacer(modifier = Modifier.height(10.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Surface(
                    modifier = Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(12.dp))
                        .border(
                            width = if (uiLanguage == "en") 1.5.dp else 0.dp,
                            color = if (uiLanguage == "en") MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant,
                            shape = RoundedCornerShape(12.dp)
                        )
                        .clickable { onSelectLanguage("en") },
                    color = if (uiLanguage == "en") MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.5f) else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = "🇬🇧 English",
                            style = MaterialTheme.typography.bodyMedium.copy(
                                fontWeight = if (uiLanguage == "en") FontWeight.Bold else FontWeight.Normal
                            ),
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        if (uiLanguage == "en") {
                            Icon(
                                imageVector = Icons.Default.Check,
                                contentDescription = "Active",
                                tint = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    }
                }

                Surface(
                    modifier = Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(12.dp))
                        .border(
                            width = if (uiLanguage == "tr") 1.5.dp else 0.dp,
                            color = if (uiLanguage == "tr") MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant,
                            shape = RoundedCornerShape(12.dp)
                        )
                        .clickable { onSelectLanguage("tr") },
                    color = if (uiLanguage == "tr") MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.5f) else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = "🇹🇷 Türkçe",
                            style = MaterialTheme.typography.bodyMedium.copy(
                                fontWeight = if (uiLanguage == "tr") FontWeight.Bold else FontWeight.Normal
                            ),
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        if (uiLanguage == "tr") {
                            Icon(
                                imageVector = Icons.Default.Check,
                                contentDescription = "Active",
                                tint = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    }
                }
            }

            HorizontalDivider(modifier = Modifier.padding(vertical = 16.dp))

            // ==========================================
            // SECTION 6: CHAT MANAGEMENT
            // ==========================================
            Text(
                text = if (isTr) "SOHBETİ YÖNET" else "MANAGE CHAT",
                style = MaterialTheme.typography.labelMedium.copy(
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.sp
                ),
                color = MaterialTheme.colorScheme.error
            )
            Spacer(modifier = Modifier.height(8.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                OutlinedButton(
                    onClick = {
                        onClearChat()
                        onDismiss()
                    },
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error)
                ) {
                    Icon(imageVector = Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(if (isTr) "Mesajları Temizle" else "Clear Messages")
                }

                Button(
                    onClick = {
                        onDeleteChat()
                        onDismiss()
                    },
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
                ) {
                    Icon(imageVector = Icons.Default.Delete, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(if (isTr) "Sohbeti Sil" else "Delete Chat")
                }
            }
        }
    }
}
