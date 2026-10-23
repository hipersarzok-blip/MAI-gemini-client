package com.mai.chat.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Code
import androidx.compose.material.icons.filled.FlashOn
import androidx.compose.material.icons.filled.Psychology
import androidx.compose.material3.DrawerValue
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalNavigationDrawer
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.rememberDrawerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.mai.chat.data.local.MessageEntity
import com.mai.chat.data.local.MessageRole
import com.mai.chat.ui.components.ChatBubble
import com.mai.chat.ui.components.TypingIndicatorBubble
import com.mai.chat.ui.components.ChatInputField
import com.mai.chat.ui.components.ConversationDrawerContent
import com.mai.chat.ui.components.MaiTopAppBar
import com.mai.chat.ui.components.SettingsSheet
import com.mai.chat.ui.components.DirectiveSheet
import com.mai.chat.ui.viewmodel.ChatViewModel
import kotlinx.coroutines.launch

@Composable
fun ChatScreen(viewModel: ChatViewModel) {
    val conversations by viewModel.conversations.collectAsState()
    val activeConversation by viewModel.activeConversation.collectAsState()
    val messages by viewModel.messages.collectAsState()
    val isStreaming by viewModel.isStreaming.collectAsState()
    val streamingChunk by viewModel.streamingChunk.collectAsState()
    val apiKey by viewModel.apiKey.collectAsState()
    val selectedModel by viewModel.selectedModel.collectAsState()
    val isDarkThemePref by viewModel.isDarkTheme.collectAsState()
    val uiLanguage by viewModel.uiLanguage.collectAsState()

    val isTr = uiLanguage == "tr"
    val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)
    val coroutineScope = rememberCoroutineScope()
    val listState = rememberLazyListState()
    val snackbarHostState = remember { SnackbarHostState() }

    var isSettingsOpen by remember { mutableStateOf(false) }
    var isDirectiveOpen by remember { mutableStateOf(false) }
    var inputText by remember { mutableStateOf("") }

    LaunchedEffect(messages.size, streamingChunk, isStreaming) {
        val totalItems = messages.size + if (isStreaming) 1 else 0
        if (totalItems > 0) {
            listState.animateScrollToItem(totalItems - 1)
        }
    }

    ModalNavigationDrawer(
        drawerState = drawerState,
        drawerContent = {
            ConversationDrawerContent(
                conversations = conversations,
                activeConversationId = activeConversation?.id,
                onSelectConversation = { convId ->
                    viewModel.selectConversation(convId)
                    coroutineScope.launch { drawerState.close() }
                },
                onNewChat = {
                    viewModel.createNewChat(title = if (isTr) "Yeni Sohbet" else "New Chat")
                    coroutineScope.launch { drawerState.close() }
                },
                onDeleteConversation = { convId ->
                    viewModel.deleteConversation(convId)
                },
                uiLanguage = uiLanguage
            )
        }
    ) {
        Scaffold(
            snackbarHost = { SnackbarHost(snackbarHostState) },
            topBar = {
                MaiTopAppBar(
                    onMenuClick = {
                        coroutineScope.launch {
                            if (drawerState.isClosed) drawerState.open() else drawerState.close()
                        }
                    },
                    onOpenSettings = { isSettingsOpen = true },
                    onOpenDirective = { isDirectiveOpen = true },
                    activeTitle = activeConversation?.title ?: (if (isTr) "Yeni Sohbet" else "New Chat"),
                    onRenameChat = { newTitle -> viewModel.renameConversation(newTitle) },
                    selectedModel = selectedModel,
                    onSelectModel = { modelId -> viewModel.selectModel(modelId) },
                    hasApiKey = apiKey.isNotBlank(),
                    hasDirective = activeConversation?.directive?.isNotBlank() == true,
                    uiLanguage = uiLanguage
                )
            },
            bottomBar = {
                ChatInputField(
                    inputText = inputText,
                    onInputChange = { inputText = it },
                    onSend = {
                        if (apiKey.isBlank()) {
                            isSettingsOpen = true
                            coroutineScope.launch {
                                val msg = if (isTr) "Lütfen önce Gemini API anahtarınızı girin" else "Please enter your Gemini API key first"
                                snackbarHostState.showSnackbar(msg)
                            }
                        } else {
                            val textToSend = inputText
                            inputText = ""
                            viewModel.sendMessage(textToSend)
                        }
                    },
                    onStop = { viewModel.stopStreaming() },
                    isLoading = isStreaming,
                    uiLanguage = uiLanguage,
                    modifier = Modifier.imePadding()
                )
            }
        ) { paddingValues ->
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .background(MaterialTheme.colorScheme.background)
            ) {
                if (messages.isEmpty() && streamingChunk.isBlank()) {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(20.dp),
                        verticalArrangement = Arrangement.Center,
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Surface(
                            modifier = Modifier
                                .size(64.dp)
                                .clip(CircleShape),
                            color = MaterialTheme.colorScheme.primaryContainer
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(
                                    imageVector = Icons.Default.AutoAwesome,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.primary,
                                    modifier = Modifier.size(36.dp)
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        Text(
                            text = "mAI Gemini Chat",
                            style = MaterialTheme.typography.headlineSmall.copy(
                                fontWeight = FontWeight.Bold,
                                letterSpacing = (-0.5).sp
                            ),
                            color = MaterialTheme.colorScheme.onBackground
                        )

                        Text(
                            text = if (isTr)
                                "Nasıl yardımcı olabilirim? Aşağıdan bir başlangıç seçin veya yazmaya başlayın."
                            else
                                "How can I help you today? Pick a starter below or type a message.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(horizontal = 24.dp, vertical = 6.dp),
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center
                        )

                        Spacer(modifier = Modifier.height(24.dp))

                        Column(
                            modifier = Modifier.fillMaxWidth(),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            StarterCard(
                                icon = Icons.Default.Psychology,
                                title = if (isTr) "🎭 C.ai Rol Yapma (Roleplay)" else "🎭 C.ai Roleplay",
                                description = if (isTr) "Karakter kişiliği oluştur ve derin rol yapma başlat" else "Create a persona and start deep character immersion",
                                onClick = {
                                    isDirectiveOpen = true
                                }
                            )

                            StarterCard(
                                icon = Icons.Default.Code,
                                title = if (isTr) "💻 Kodlama ve Yazılım Mimarisi" else "💻 Coding & System Architecture",
                                description = if (isTr) "Production-ready algoritmalar ve mimari çözümler" else "Production-ready algorithms and architectural design",
                                onClick = {
                                    inputText = if (isTr)
                                        "Android Kotlin ve Jetpack Compose ile modern bir Clean Architecture örneği açıkla."
                                    else
                                        "Explain a modern Clean Architecture pattern in Kotlin with Jetpack Compose."
                                }
                            )

                            StarterCard(
                                icon = Icons.Default.FlashOn,
                                title = if (isTr) "⚡ Hızlı Fikir & Beyin Fırtınası" else "⚡ Brainstorming & Ideas",
                                description = if (isTr) "Yaratıcı projeler için stratejik öneriler al" else "Get creative suggestions and strategic insights",
                                onClick = {
                                    inputText = if (isTr)
                                        "Yapay zeka ile çalışan özgün bir mobil uygulama projesi için 3 yenilikçi fikir ver."
                                    else
                                        "Give 3 innovative mobile app concepts utilizing modern generative AI."
                                }
                            )
                        }
                    }
                } else {
                    LazyColumn(
                        state = listState,
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(vertical = 12.dp)
                    ) {
                        item(key = "persistent_directive_bar") {
                            Surface(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 16.dp, vertical = 4.dp)
                                    .clip(RoundedCornerShape(14.dp))
                                    .clickable { isDirectiveOpen = true },
                                color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.45f),
                                shape = RoundedCornerShape(14.dp)
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        modifier = Modifier.weight(1f)
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.AutoAwesome,
                                            contentDescription = null,
                                            tint = MaterialTheme.colorScheme.primary,
                                            modifier = Modifier.size(16.dp)
                                        )
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Text(
                                            text = if (activeConversation?.directive?.isNotBlank() == true)
                                                (if (isTr) "Aktif Direktif / Karakter (Düzenlemek için dokunun)" else "Active Directive / Persona (Tap to edit)")
                                            else
                                                (if (isTr) "Direktif / Roleplay Karakteri Ekle" else "Add Directive / Roleplay Persona"),
                                            style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.SemiBold),
                                            color = MaterialTheme.colorScheme.onSurface
                                        )
                                    }
                                    Text(
                                        text = if (isTr) "Düzenle" else "Edit",
                                        style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
                                        color = MaterialTheme.colorScheme.primary
                                    )
                                }
                            }
                        }

                        items(messages, key = { it.id }) { message ->
                            ChatBubble(message = message, uiLanguage = uiLanguage)
                        }

                        if (isStreaming) {
                            item(key = "streaming_live_bubble") {
                                if (streamingChunk.isBlank()) {
                                    TypingIndicatorBubble(uiLanguage = uiLanguage)
                                } else {
                                    val streamingMessage = remember(streamingChunk) {
                                        MessageEntity(
                                            id = "streaming-temp-id",
                                            conversationId = activeConversation?.id ?: "",
                                            role = MessageRole.MODEL,
                                            text = streamingChunk,
                                            timestamp = System.currentTimeMillis()
                                        )
                                    }
                                    ChatBubble(
                                        message = streamingMessage, 
                                        uiLanguage = uiLanguage,
                                        isStreaming = true
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    SettingsSheet(
        isOpen = isSettingsOpen,
        onDismiss = { isSettingsOpen = false },
        currentDirective = activeConversation?.directive ?: "",
        onOpenDirective = {
            isSettingsOpen = false
            isDirectiveOpen = true
        },
        apiKey = apiKey,
        onSaveApiKey = { newKey ->
            viewModel.saveApiKey(newKey)
            coroutineScope.launch {
                val msg = if (isTr) "API Anahtarı kaydedildi" else "API Key saved"
                snackbarHostState.showSnackbar(msg)
            }
        },
        selectedModel = selectedModel,
        onSelectModel = { modelId ->
            viewModel.selectModel(modelId)
            coroutineScope.launch {
                val msg = if (isTr) "Model seçildi: $modelId" else "Model selected: $modelId"
                snackbarHostState.showSnackbar(msg)
            }
        },
        isDarkMode = isDarkThemePref ?: true,
        onToggleTheme = { viewModel.toggleTheme() },
        uiLanguage = uiLanguage,
        onSelectLanguage = { lang ->
            viewModel.setLanguage(lang)
            coroutineScope.launch {
                val msg = if (lang == "tr") "Dil Türkçe olarak ayarlandı" else "Language set to English"
                snackbarHostState.showSnackbar(msg)
            }
        },
        onClearChat = {
            viewModel.clearCurrentChat()
            coroutineScope.launch {
                val msg = if (isTr) "Mesaj geçmişi temizlendi" else "Chat history cleared"
                snackbarHostState.showSnackbar(msg)
            }
        },
        onDeleteChat = {
            activeConversation?.id?.let { convId ->
                viewModel.deleteConversation(convId)
            }
            coroutineScope.launch {
                val msg = if (isTr) "Sohbet silindi" else "Conversation deleted"
                snackbarHostState.showSnackbar(msg)
            }
        },
        activeChatTitle = activeConversation?.title
    )

    DirectiveSheet(
        isOpen = isDirectiveOpen,
        onDismiss = { isDirectiveOpen = false },
        currentDirective = activeConversation?.directive ?: "",
        onSaveDirective = { newDirective ->
            viewModel.saveDirective(newDirective)
            coroutineScope.launch {
                val msg = if (isTr) "Direktif başarıyla güncellendi" else "Directive updated successfully"
                snackbarHostState.showSnackbar(msg)
            }
        },
        onApplyGreeting = { starterGreeting ->
            viewModel.sendModelStarterMessage(starterGreeting)
            coroutineScope.launch {
                val msg = if (isTr) "Açılış mesajı sohbete eklendi" else "Starter greeting added to chat"
                snackbarHostState.showSnackbar(msg)
            }
        },
        uiLanguage = uiLanguage
    )
}

@Composable
private fun StarterCard(
    icon: ImageVector,
    title: String,
    description: String,
    onClick: () -> Unit
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .clickable { onClick() },
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
        shape = RoundedCornerShape(14.dp)
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(22.dp)
            )
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold),
                    color = MaterialTheme.colorScheme.onSurface
                )
                Text(
                    text = description,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}
