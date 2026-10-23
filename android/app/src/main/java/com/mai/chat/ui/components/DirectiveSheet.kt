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
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Checkbox
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
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

data class AssistantCategoryItem(
    val id: String,
    val domain: String,
    val title: String,
    val badge: String,
    val description: String,
    val frameworkPrompt: String
)

val ANDROID_ASSISTANT_CATEGORIES = listOf(
    AssistantCategoryItem(
        id = "coding",
        domain = "software",
        title = "Kodlama & Yazılım Mimarisi",
        badge = "💻 Kodlama",
        description = "Temiz kod (Clean Code), SOLID prensipleri, tam çalışan kod blokları ve mimari analiz.",
        frameworkPrompt = "You are a senior software architect. Provide complete, production-ready, clean code adhering to SOLID principles and strict typing."
    ),
    AssistantCategoryItem(
        id = "devops",
        domain = "software",
        title = "DevOps & Bulut Altyapısı",
        badge = "☁️ DevOps",
        description = "CI/CD boru hatları, Docker konteynerizasyon, Kubernetes orkestrasyonu, Linux ve bulut güvenliği.",
        frameworkPrompt = "You are a senior DevOps & Cloud Architect. Emphasize reproducible infrastructure as code, hardened security, and systematic troubleshooting."
    ),
    AssistantCategoryItem(
        id = "cybersecurity",
        domain = "software",
        title = "Siber Güvenlik & Tehdit Analizi",
        badge = "🛡️ Güvenlik",
        description = "Savunmacı güvenlik (Blue Team), OWASP Top 10 denetimi, şifreleme ve zafiyet analizi.",
        frameworkPrompt = "You are a cybersecurity expert. Provide defensive analysis, identify OWASP vulnerabilities, and enforce modern cryptographic standards."
    ),
    AssistantCategoryItem(
        id = "data_science",
        domain = "software",
        title = "Veri Bilimi & Makine Öğrenimi",
        badge = "📊 Veri Bilimi",
        description = "Keşifçi veri analizi (EDA), özellik mühendisliği, model değerlendirme metrikleri ve istatistik.",
        frameworkPrompt = "You are a data scientist. Base reasoning on rigorous statistical grounding, hypothesis testing, and leak-free pipelines."
    ),
    AssistantCategoryItem(
        id = "database",
        domain = "software",
        title = "Veritabanı Mühendisliği & SQL",
        badge = "🗄️ Veritabanı",
        description = "İlişkisel şema tasarımı, B-Tree indeksleme stratejileri, sorgu planı analizi ve NoSQL.",
        frameworkPrompt = "You are a database engineer. Design normalized schemas, optimize complex queries, and resolve concurrency locks."
    ),
    AssistantCategoryItem(
        id = "system_architecture",
        domain = "software",
        title = "Dağıtık Sistemler & Mimari",
        badge = "🏗️ Sistem Tasarımı",
        description = "Yüksek erişilebilirlik, mikroservisler, CAP teoremi, önbellek stratejileri ve ölçeklenebilirlik.",
        frameworkPrompt = "You are a distributed systems architect. Analyze trade-offs through the CAP theorem, circuit breakers, and fault-tolerant patterns."
    ),
    AssistantCategoryItem(
        id = "academic_research",
        domain = "science",
        title = "Akademik Araştırma & Tez Danışmanı",
        badge = "🎓 Araştırma",
        description = "Literatür tarama metodolojisi, araştırma sorusu formülasyonu, akademik üslup ve atıf etiği.",
        frameworkPrompt = "You are a scholarly research advisor. Maintain objective epistemic modesty and high academic standards."
    ),
    AssistantCategoryItem(
        id = "homework",
        domain = "science",
        title = "Ödev & Okul Desteği",
        badge = "📚 Ödev",
        description = "Adım adım pedagojik problem çözümü, kavramsal kavratma ve kendi kendine öğrenme rehberi.",
        frameworkPrompt = "You are an encouraging academic tutor. Break down problems step-by-step to foster deep understanding."
    ),
    AssistantCategoryItem(
        id = "study",
        domain = "science",
        title = "Ders Çalışma & Sınav Hazırlığı",
        badge = "🧠 Ders Çalışma",
        description = "Feynman tekniği, aktif hatırlama (active recall), hap sınav bilgileri ve kavram haritaları.",
        frameworkPrompt = "You are a learning coach using the Feynman technique and active recall to make complex ideas simple."
    ),
    AssistantCategoryItem(
        id = "mathematics",
        domain = "science",
        title = "İleri Matematik & Analitik İspat",
        badge = "📐 Matematik",
        description = "Adım adım matematiksel ispatlar, kalkülüs, lineer cebir ve aksiyomatik mantık.",
        frameworkPrompt = "You are a pure and applied mathematician. Demonstrate rigorous axiomatic proofs with clear deductive steps."
    ),
    AssistantCategoryItem(
        id = "physics",
        domain = "science",
        title = "Fizik & Mühendislik Analizi",
        badge = "⚛️ Fizik",
        description = "Klasik mekanik, termodinamik, elektromanyetizma, boyut analizi ve fiziksel modelleme.",
        frameworkPrompt = "You are a theoretical and applied physicist. Reason from fundamental conservation laws and dimensional analysis."
    ),
    AssistantCategoryItem(
        id = "medical",
        domain = "health",
        title = "Tıp & Klinik Bilgi (Eğitici)",
        badge = "🩺 Tıp & Sağlık",
        description = "Kanıta dayalı klinik titizlik, fizyolojik mekanizmalar ve hasta dostu açık terminoloji.",
        frameworkPrompt = "You are a biomedical expert providing educational health knowledge grounded in peer-reviewed clinical literature."
    ),
    AssistantCategoryItem(
        id = "nutrition_fitness",
        domain = "health",
        title = "Beslenme & Egzersiz Biyomekaniği",
        badge = "🏋️ Spor & Beslenme",
        description = "Enerji dengesi, makrobesin dağılımı, hipertrofi ilkeleri, kardiyovasküler fizyoloji ve toparlanma.",
        frameworkPrompt = "You are an exercise physiologist and nutritionist. Apply progressive overload, biomechanics, and evidence-based nutrition."
    ),
    AssistantCategoryItem(
        id = "psychology",
        domain = "health",
        title = "Bilişsel Psikoloji & Davranış Mimarisi",
        badge = "🧘 Psikoloji",
        description = "Bilişsel Davranışçı Terapi (BDT) ilkeleri, bilişsel çarpıtmalar, alışkanlık döngüleri ve duygusal regülasyon.",
        frameworkPrompt = "You are a cognitive psychologist. Apply objective, compassionate analysis based on CBT models and habit loops."
    ),
    AssistantCategoryItem(
        id = "finance",
        domain = "business",
        title = "Finansal Analiz & Şirket Değerleme",
        badge = "📈 Finans",
        description = "Bilanço ve gelir tablosu analizi, İndirgenmiş Nakit Akışı (DCF), serbest nakit akımı ve rasyolar.",
        frameworkPrompt = "You are a corporate finance expert. Formulate DCF models, interpret financial ratios, and evaluate capital efficiency."
    ),
    AssistantCategoryItem(
        id = "legal",
        domain = "business",
        title = "Hukuk & Sözleşme Analizi",
        badge = "⚖️ Hukuk",
        description = "Sözleşme maddeleri denetimi, hukuki mantık (IRAC metodu), yasal risk tespiti ve uyuşmazlık analizi.",
        frameworkPrompt = "You are a legal analyst using the IRAC method to identify contractual risks and statutory frameworks."
    ),
    AssistantCategoryItem(
        id = "startup_business",
        domain = "business",
        title = "Girişimcilik & İş Modeli Mimarisi",
        badge = "🚀 Girişimcilik",
        description = "Yalın Girişim (Lean Startup), Ürün-Pazar Uyumu (PMF), birim ekonomi ve pazar stratejisi.",
        frameworkPrompt = "You are a venture builder focusing on unit economics, customer discovery, and defensible moats."
    ),
    AssistantCategoryItem(
        id = "technical_writing",
        domain = "creative",
        title = "Teknik Yazarlık & Dokümantasyon",
        badge = "📝 Teknik Yazı",
        description = "Yazılım dokümantasyonu, API referansları, RFC şartnameleri, kılavuzlar ve açık üslup.",
        frameworkPrompt = "You are a technical writer specializing in clear, active-voice API documentation and user manuals."
    ),
    AssistantCategoryItem(
        id = "general",
        domain = "career",
        title = "Üst Düzey Yönetici Asistanlığı",
        badge = "⚡ Yönetici Asistanı",
        description = "Hızlı, doğrudan, yapılandırılmış ve gereksiz laf kalabalığından arındırılmış üst düzey asistanlık.",
        frameworkPrompt = "You are a high-efficiency executive assistant. Deliver dense, structured, actionable information directly."
    )
)

val ANDROID_AVATAR_EMOJIS = listOf("🎭", "⚔️", "🌸", "🕵️‍♂️", "🐺", "🖤", "🎀", "🤖", "🧙‍♂️", "👑", "☕", "🌕", "🔥", "🛡️", "⚡", "🌙")

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DirectiveSheet(
    isOpen: Boolean,
    onDismiss: () -> Unit,
    currentDirective: String,
    onSaveDirective: (String) -> Unit,
    onApplyGreeting: (String) -> Unit,
    uiLanguage: String = "tr"
) {
    val isTr = uiLanguage == "tr"
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val scrollState = rememberScrollState()

    var activeTab by remember { mutableStateOf("roleplay") }
    var showPresetsGallery by remember { mutableStateOf(false) }

    // Roleplay fields kept above `if (!isOpen) return` so they never reset when closing/reopening
    var rpName by remember { mutableStateOf("") }
    var rpGender by remember { mutableStateOf("Kadın") }
    var rpRole by remember { mutableStateOf("") }
    var rpAvatar by remember { mutableStateOf("🎭") }
    var rpAppearance by remember { mutableStateOf("") }
    var rpPersonality by remember { mutableStateOf("") }
    var rpAngst by remember { mutableStateOf("") }
    var rpScenario by remember { mutableStateOf("") }
    var rpRelationship by remember { mutableStateOf("") }
    var rpSpeechStyle by remember { mutableStateOf("") }
    var rpGreeting by remember { mutableStateOf("") }
    var autoInsertGreeting by remember { mutableStateOf(false) }

    // Assistant fields
    var assistantSearch by remember { mutableStateOf("") }
    var selectedDomain by remember { mutableStateOf("all") }
    var selectedCategoryId by remember { mutableStateOf("coding") }
    var assistantCustomText by remember { mutableStateOf("") }

    // Custom directive text
    var customText by remember { mutableStateOf(currentDirective) }

    LaunchedEffect(currentDirective, isOpen) {
        if (!isOpen) return@LaunchedEffect
        customText = currentDirective
        autoInsertGreeting = false

        if (currentDirective.contains("[CHARACTER.AI & EMOCHI HYPER-REALISTIC ROLEPLAY DIRECTIVE]")) {
            activeTab = "roleplay"
            fun extractLine(prefix: String): String {
                val line = currentDirective.lines().firstOrNull { it.trim().startsWith(prefix) } ?: return ""
                val value = line.substringAfter(prefix).trim()
                return if (value in listOf("Unknown", "Companion", "Undefined", "Complex, multi-layered", "Deep-seated internal conflicts and emotional vulnerabilities", "Atmospheric Roleplay Setting", "Organic emerging bond", "Natural, authentic tone", "None")) "" else value
            }
            val parsedName = extractLine("Character Name:")
            if (parsedName.isNotBlank()) rpName = parsedName
            val parsedGender = extractLine("Gender:")
            if (parsedGender.isNotBlank()) rpGender = parsedGender
            val parsedRole = extractLine("Role / Archetype:")
            if (parsedRole.isNotBlank()) rpRole = parsedRole
            val parsedApp = extractLine("Appearance & Age:")
            if (parsedApp.isNotBlank()) rpAppearance = parsedApp
            val parsedPers = extractLine("Personality:")
            if (parsedPers.isNotBlank()) rpPersonality = parsedPers
            val parsedAngst = extractLine("Vulnerabilities & Emotional Conflict (Angst):")
            if (parsedAngst.isNotBlank()) rpAngst = parsedAngst
            val parsedScen = extractLine("Scenario & Setting:")
            if (parsedScen.isNotBlank()) rpScenario = parsedScen
            val parsedRel = extractLine("Relationship to User:")
            if (parsedRel.isNotBlank()) rpRelationship = parsedRel
            val parsedSpeech = extractLine("Speech Style:")
            if (parsedSpeech.isNotBlank()) rpSpeechStyle = parsedSpeech
            val parsedGreet = extractLine("Opening Scene:")
            if (parsedGreet.isNotBlank()) rpGreeting = parsedGreet
        } else if (currentDirective.contains("[DISCIPLINE:")) {
            activeTab = "assistant"
        } else if (currentDirective.isNotBlank() && rpName.isBlank()) {
            activeTab = "custom"
        }
    }

    if (!isOpen) return

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
                        Text(text = if (activeTab == "roleplay") rpAvatar else "⚙️", fontSize = 18.sp)
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text(
                            text = if (isTr) "Sohbet Direktifi & Kişilik" else "Chat Directive & Persona",
                            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Text(
                            text = if (activeTab == "roleplay") 
                                (if (isTr) "C.ai & Emochi Gerçekçi Rol Yapma" else "C.ai & Emochi Hyper-Realistic Roleplay")
                            else if (activeTab == "assistant")
                                (if (isTr) "26 Uzmanlık Alanı" else "26 Expert Disciplines")
                            else
                                (if (isTr) "Serbest Sistem Talimatı" else "Free-form System Instruction"),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
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

            Spacer(modifier = Modifier.height(14.dp))

            // Segmented Mode Tabs
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(14.dp))
                    .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
                    .padding(4.dp),
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                listOf(
                    "roleplay" to (if (isTr) "🎭 Roleplay (C.ai)" else "🎭 Roleplay (C.ai)"),
                    "assistant" to (if (isTr) "🤖 Uzman Asistan" else "🤖 Assistant"),
                    "custom" to (if (isTr) "✍️ Serbest Direktif" else "✍️ Custom")
                ).forEach { (id, label) ->
                    val isSelected = activeTab == id
                    Surface(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(10.dp))
                            .clickable { activeTab = id },
                        color = if (isSelected) MaterialTheme.colorScheme.primary else androidx.compose.ui.graphics.Color.Transparent,
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Box(
                            modifier = Modifier.padding(vertical = 8.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = label,
                                style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.SemiBold),
                                color = if (isSelected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // ==========================================
            // MODE 1: ROLEPLAY (C.AI & EMOCHI ENGINE)
            // ==========================================
            if (activeTab == "roleplay") {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(16.dp))
                        .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f))
                        .padding(14.dp)
                ) {
                    // C.ai Info Notice
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.35f)
                    ) {
                        Row(
                            modifier = Modifier.padding(12.dp),
                            verticalAlignment = Alignment.Top
                        ) {
                            Icon(
                                imageVector = Icons.Default.AutoAwesome,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(20.dp)
                            )
                            Spacer(modifier = Modifier.width(10.dp))
                            Text(
                                text = if (isTr)
                                    "C.ai & Emochi Standardı: Dördüncü duvar asla yıkılmaz. Eylemler, bakışlar ve hisler *yıldız* içinde yazılır. Karakterin acıları ve zaafları (angst) canlı hissettirir."
                                else
                                    "C.ai Standards: The 4th wall is unbreakable. Actions and feelings in *asterisks*. Emotional angst and flaws create true depth.",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    // Preset Character Picker Trigger
                    FilledTonalButton(
                        onClick = { showPresetsGallery = !showPresetsGallery },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text(
                            text = if (showPresetsGallery) 
                                (if (isTr) "Şablonları Kapat" else "Close Presets") 
                            else 
                                (if (isTr) "Hazır Karakterler (${ANDROID_ROLEPLAY_PRESETS.size} Popüler Şablon)" else "Ready Presets (${ANDROID_ROLEPLAY_PRESETS.size} Character Cards)"),
                            style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold)
                        )
                    }

                    if (showPresetsGallery) {
                        Spacer(modifier = Modifier.height(10.dp))
                        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            ANDROID_ROLEPLAY_PRESETS.forEach { preset ->
                                Surface(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clip(RoundedCornerShape(12.dp))
                                        .clickable {
                                            rpName = preset.charName
                                            rpGender = preset.gender
                                            rpRole = preset.role
                                            rpAvatar = preset.emoji
                                            rpAppearance = preset.appearance
                                            rpPersonality = preset.personality
                                            rpAngst = preset.angst
                                            rpScenario = preset.scenario
                                            rpRelationship = preset.relationship
                                            rpSpeechStyle = preset.speechStyle
                                            rpGreeting = preset.greeting
                                            showPresetsGallery = false
                                        },
                                    color = MaterialTheme.colorScheme.surface,
                                    shape = RoundedCornerShape(12.dp)
                                ) {
                                    Row(
                                        modifier = Modifier.padding(10.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(text = preset.emoji, fontSize = 24.sp)
                                        Spacer(modifier = Modifier.width(10.dp))
                                        Column(modifier = Modifier.weight(1f)) {
                                            Text(text = preset.title, style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Bold))
                                            Text(text = "${preset.charName} • ${preset.role}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary)
                                            Text(text = preset.personality, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                        }
                                        Icon(imageVector = Icons.Default.Check, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(18.dp))
                                    }
                                }
                            }
                        }
                        Spacer(modifier = Modifier.height(10.dp))
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    // Avatar Emoji Row
                    Text(
                        text = if (isTr) "Karakter Emojisi" else "Character Emoji",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        items(ANDROID_AVATAR_EMOJIS) { em ->
                            Surface(
                                modifier = Modifier
                                    .size(38.dp)
                                    .clip(CircleShape)
                                    .clickable { rpAvatar = em },
                                color = if (rpAvatar == em) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surface,
                                border = if (rpAvatar == em) androidx.compose.foundation.BorderStroke(1.5.dp, MaterialTheme.colorScheme.primary) else null
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Text(text = em, fontSize = 18.sp)
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    // Character Name & Gender
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        OutlinedTextField(
                            value = rpName,
                            onValueChange = { rpName = it },
                            label = { Text(if (isTr) "Karakter Adı" else "Character Name") },
                            placeholder = { Text("Örn: Alya, Dedektif Murat...") },
                            modifier = Modifier.weight(1.3f),
                            singleLine = true,
                            shape = RoundedCornerShape(10.dp)
                        )

                        OutlinedTextField(
                            value = rpGender,
                            onValueChange = { rpGender = it },
                            label = { Text(if (isTr) "Cinsiyet" else "Gender") },
                            modifier = Modifier.weight(1f),
                            singleLine = true,
                            shape = RoundedCornerShape(10.dp)
                        )
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    // Role & Relationship
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        OutlinedTextField(
                            value = rpRole,
                            onValueChange = { rpRole = it },
                            label = { Text(if (isTr) "Rol / Arketip" else "Role / Archetype") },
                            placeholder = { Text("Örn: Muhafız, Kaçak...") },
                            modifier = Modifier.weight(1f),
                            singleLine = true,
                            shape = RoundedCornerShape(10.dp)
                        )

                        OutlinedTextField(
                            value = rpRelationship,
                            onValueChange = { rpRelationship = it },
                            label = { Text(if (isTr) "İlişki Dinamiği" else "Relationship") },
                            placeholder = { Text("Örn: Düşman, Sırdaş...") },
                            modifier = Modifier.weight(1f),
                            singleLine = true,
                            shape = RoundedCornerShape(10.dp)
                        )
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    OutlinedTextField(
                        value = rpPersonality,
                        onValueChange = { rpPersonality = it },
                        label = { Text(if (isTr) "Kişilik & Genel Mizaç" else "Personality & Demeanor") },
                        placeholder = { Text(if (isTr) "Örn: Gururlu, alaycı, sana karşı çelişkili hisler taşıyan..." else "e.g. Proud, cynical, secretly caring...") },
                        modifier = Modifier.fillMaxWidth(),
                        maxLines = 3,
                        shape = RoundedCornerShape(10.dp)
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    // Emotional Flaws (Angst)
                    OutlinedTextField(
                        value = rpAngst,
                        onValueChange = { rpAngst = it },
                        label = { Text(if (isTr) "💔 Duygusal Acılar, Zaaflar & Angst" else "💔 Emotional Angst & Vulnerabilities") },
                        placeholder = { Text(if (isTr) "Örn: Terk edilme korkusu var, güvenmekte zorlanır, sevgisini sertlikle maskeler..." else "e.g. Fear of abandonment, past trauma...") },
                        modifier = Modifier.fillMaxWidth(),
                        maxLines = 3,
                        shape = RoundedCornerShape(10.dp)
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    // Appearance & Scenario
                    OutlinedTextField(
                        value = rpAppearance,
                        onValueChange = { rpAppearance = it },
                        label = { Text(if (isTr) "Görünüş & Yaş" else "Appearance & Age") },
                        placeholder = { Text("Örn: 22 yaşlarında, solgun tenli, darmadağınık saçlı...") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        shape = RoundedCornerShape(10.dp)
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    OutlinedTextField(
                        value = rpScenario,
                        onValueChange = { rpScenario = it },
                        label = { Text(if (isTr) "Dünya, Mekan & Atmosfer (Scenario)" else "Scenario & World Setting") },
                        placeholder = { Text("Örn: Yağmurlu terk edilmiş eski tren garı bekleme salonu...") },
                        modifier = Modifier.fillMaxWidth(),
                        maxLines = 2,
                        shape = RoundedCornerShape(10.dp)
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    OutlinedTextField(
                        value = rpSpeechStyle,
                        onValueChange = { rpSpeechStyle = it },
                        label = { Text(if (isTr) "Konuşma Tarzı (Opsiyonel)" else "Speech Style (Optional)") },
                        placeholder = { Text("Örn: Kısık sesli, duraksayarak konuşur, gözlerini kaçırır...") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        shape = RoundedCornerShape(10.dp)
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    // Starter Greeting
                    OutlinedTextField(
                        value = rpGreeting,
                        onValueChange = { rpGreeting = it },
                        label = { Text(if (isTr) "🎬 Açılış Sahnesi / İlk Repliği (Greeting)" else "🎬 Opening Scene / Greeting") },
                        placeholder = { Text("Örn: *Pencereye bakarken irkilir* \"Geldin demek...\"") },
                        modifier = Modifier.fillMaxWidth(),
                        maxLines = 3,
                        shape = RoundedCornerShape(10.dp)
                    )

                    Spacer(modifier = Modifier.height(6.dp))

                    // Auto-insert greeting checkbox
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { autoInsertGreeting = !autoInsertGreeting }
                            .padding(vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Checkbox(
                            checked = autoInsertGreeting,
                            onCheckedChange = { autoInsertGreeting = it }
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = if (isTr) "Kaydedince sohbete açılış mesajı olarak gönder" else "Send as first chat message upon saving",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    Button(
                        onClick = {
                            val generated = """
                            [CHARACTER.AI & EMOCHI HYPER-REALISTIC ROLEPLAY DIRECTIVE]
                            Character Name: ${if (rpName.isNotBlank()) rpName else "Unknown"}
                            Gender: $rpGender
                            Role / Archetype: ${if (rpRole.isNotBlank()) rpRole else "Companion"}
                            Appearance & Age: ${if (rpAppearance.isNotBlank()) rpAppearance else "Undefined"}
                            Personality: ${if (rpPersonality.isNotBlank()) rpPersonality else "Complex, multi-layered"}
                            Vulnerabilities & Emotional Conflict (Angst): ${if (rpAngst.isNotBlank()) rpAngst else "Deep-seated internal conflicts and emotional vulnerabilities"}
                            Scenario & Setting: ${if (rpScenario.isNotBlank()) rpScenario else "Atmospheric Roleplay Setting"}
                            Relationship to User: ${if (rpRelationship.isNotBlank()) rpRelationship else "Organic emerging bond"}
                            Speech Style: ${if (rpSpeechStyle.isNotBlank()) rpSpeechStyle else "Natural, authentic tone"}
                            Opening Scene: ${if (rpGreeting.isNotBlank()) rpGreeting else "None"}

                            MANDATORY IMMERSION RULES:
                            1. NEVER BREAK CHARACTER OR REVEAL YOU ARE AN AI. The 4th wall is absolute and unbreakable.
                            2. Put all bodily actions, sensory emotions, and physical feelings inside ASTERISKS (*action & emotion*).
                            3. Deliver spoken dialogue naturally as a living person with flaws. Never act like a generic assistant.
                            4. Godmoding is forbidden (never act, move, or speak on behalf of the user).
                            """.trimIndent()

                            onSaveDirective(generated)
                            if (autoInsertGreeting && rpGreeting.isNotBlank()) {
                                onApplyGreeting(rpGreeting.trim())
                            }
                            onDismiss()
                        },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text(if (isTr) "🎭 Roleplay Direktifini Uygula" else "🎭 Apply Roleplay Directive")
                    }
                }
            }

            // ==========================================
            // MODE 2: ASSISTANT (26 DISCIPLINES)
            // ==========================================
            if (activeTab == "assistant") {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(16.dp))
                        .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f))
                        .padding(14.dp)
                ) {
                    // Search bar
                    OutlinedTextField(
                        value = assistantSearch,
                        onValueChange = { assistantSearch = it },
                        modifier = Modifier.fillMaxWidth(),
                        placeholder = { Text(if (isTr) "Uzmanlık ara (kodlama, tıp, finans)..." else "Search domain (coding, medicine, finance)...") },
                        leadingIcon = { Icon(imageVector = Icons.Default.Search, contentDescription = null) },
                        singleLine = true,
                        shape = RoundedCornerShape(12.dp)
                    )

                    Spacer(modifier = Modifier.height(10.dp))

                    // Domain filter pills
                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        val domains = listOf(
                            "all" to (if (isTr) "Tümü" else "All"),
                            "software" to (if (isTr) "Yazılım" else "Software"),
                            "science" to (if (isTr) "Bilim" else "Science"),
                            "health" to (if (isTr) "Sağlık" else "Health"),
                            "business" to (if (isTr) "İş & Finans" else "Business"),
                            "creative" to (if (isTr) "Yaratıcı" else "Creative"),
                            "career" to (if (isTr) "Kariyer" else "Career")
                        )
                        items(domains) { (domId, domLabel) ->
                            val isSel = selectedDomain == domId
                            Surface(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(8.dp))
                                    .clickable { selectedDomain = domId },
                                color = if (isSel) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surface,
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Text(
                                    text = domLabel,
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                                    style = MaterialTheme.typography.labelSmall,
                                    color = if (isSel) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurface
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    // Filtered categories list
                    val filtered = ANDROID_ASSISTANT_CATEGORIES.filter { cat ->
                        val matchesDom = selectedDomain == "all" || cat.domain == selectedDomain
                        val matchesSearch = assistantSearch.isBlank() || 
                            cat.title.contains(assistantSearch, ignoreCase = true) || 
                            cat.description.contains(assistantSearch, ignoreCase = true)
                        matchesDom && matchesSearch
                    }

                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        filtered.forEach { cat ->
                            val isSelected = selectedCategoryId == cat.id
                            Surface(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(12.dp))
                                    .clickable { selectedCategoryId = cat.id },
                                color = if (isSelected) MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.5f) else MaterialTheme.colorScheme.surface,
                                border = if (isSelected) androidx.compose.foundation.BorderStroke(1.5.dp, MaterialTheme.colorScheme.primary) else null,
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Row(
                                    modifier = Modifier.padding(12.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(text = cat.title, style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Bold))
                                        Text(text = cat.description, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                    if (isSelected) {
                                        Icon(imageVector = Icons.Default.Check, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                                    }
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    OutlinedTextField(
                        value = assistantCustomText,
                        onValueChange = { assistantCustomText = it },
                        label = { Text(if (isTr) "Özel Odak veya Talimatlar" else "Custom Focus Instructions") },
                        placeholder = { Text("Örn: Sadece Jetpack Compose kullan, kodlarda Türkçe yorum ekle...") },
                        modifier = Modifier.fillMaxWidth(),
                        maxLines = 3,
                        shape = RoundedCornerShape(10.dp)
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    Button(
                        onClick = {
                            val cat = ANDROID_ASSISTANT_CATEGORIES.find { it.id == selectedCategoryId } 
                                ?: ANDROID_ASSISTANT_CATEGORIES.first()
                            val directivePrompt = if (assistantCustomText.isNotBlank()) {
                                "${cat.frameworkPrompt}\n\n[USER FOCUS]\n$assistantCustomText"
                            } else {
                                cat.frameworkPrompt
                            }
                            onSaveDirective(directivePrompt)
                            onDismiss()
                        },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text(if (isTr) "🤖 Asistan Direktifini Uygula" else "🤖 Apply Assistant Framework")
                    }
                }
            }

            // ==========================================
            // MODE 3: CUSTOM DIRECTIVE
            // ==========================================
            if (activeTab == "custom") {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(16.dp))
                        .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f))
                        .padding(14.dp)
                ) {
                    OutlinedTextField(
                        value = customText,
                        onValueChange = { customText = it },
                        label = { Text(if (isTr) "Özel Sistem Direktifi (Serbest Metin)" else "Custom System Directive") },
                        placeholder = { Text(if (isTr) "Yapay zekanın sohbet boyunca uymasını istediğiniz kuralları buraya serbestçe yazın..." else "Write the mandatory rules and behavior instructions here...") },
                        modifier = Modifier.fillMaxWidth(),
                        minLines = 6,
                        maxLines = 10,
                        shape = RoundedCornerShape(12.dp)
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    Button(
                        onClick = {
                            onSaveDirective(customText.trim())
                            onDismiss()
                        },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text(if (isTr) "✍️ Direktifi Kaydet" else "✍️ Save Directive")
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Footer Reset Button
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                OutlinedButton(
                    onClick = {
                        rpName = ""
                        rpRole = ""
                        rpAppearance = ""
                        rpPersonality = ""
                        rpAngst = ""
                        rpScenario = ""
                        rpRelationship = ""
                        rpSpeechStyle = ""
                        rpGreeting = ""
                        customText = ""
                        assistantCustomText = ""
                        onSaveDirective("")
                    },
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text(if (isTr) "Direktifi Temizle" else "Clear Directive", style = MaterialTheme.typography.labelSmall)
                }

                TextButton(onClick = onDismiss) {
                    Text(if (isTr) "Vazgeç" else "Cancel")
                }
            }
        }
    }
}
