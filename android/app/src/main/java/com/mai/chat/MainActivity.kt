package com.mai.chat

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import com.mai.chat.ui.screens.ChatScreen
import com.mai.chat.ui.theme.MAITheme
import com.mai.chat.ui.viewmodel.ChatViewModel
import com.mai.chat.ui.viewmodel.ChatViewModelFactory

class MainActivity : ComponentActivity() {

    private val viewModel: ChatViewModel by viewModels {
        val app = application as MaiApplication
        ChatViewModelFactory(app.chatRepository, app.preferenceManager)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            val userDarkMode by viewModel.isDarkTheme.collectAsState()
            val systemDark = isSystemInDarkTheme()
            val effectiveDark = userDarkMode ?: systemDark

            MAITheme(darkTheme = effectiveDark) {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    ChatScreen(viewModel = viewModel)
                }
            }
        }
    }
}
