import JSZip from 'jszip';
import { ANDROID_PROJECT_FILES } from '../data/androidProjectData.ts';

export async function downloadAndroidProjectZip(): Promise<void> {
  // Try server endpoint first for 100% true-to-disk directory packaging
  try {
    const res = await fetch('/api/download-android-zip');
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mAI-Android-Project.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
    }
  } catch (err) {
    console.warn('Backend zip endpoint unavailable, using client-side JSZip:', err);
  }

  const zip = new JSZip();
  const root = zip.folder('mAI-Android-Project');

  if (!root) {
    throw new Error('Failed to create project folder inside zip');
  }

  // Add all files
  for (const file of ANDROID_PROJECT_FILES) {
    root.file(file.path, file.content);
  }

  // Bundle official mAI launcher icons into Android mipmap directories
  try {
    const iconRes = await fetch('/icon-192.png');
    if (iconRes.ok) {
      const iconBuffer = await iconRes.arrayBuffer();
      const mipmapFolders = [
        'mipmap-mdpi',
        'mipmap-hdpi',
        'mipmap-xhdpi',
        'mipmap-xxhdpi',
        'mipmap-xxxhdpi'
      ];
      for (const folder of mipmapFolders) {
        root.file(`app/src/main/res/${folder}/ic_launcher.png`, iconBuffer);
        root.file(`app/src/main/res/${folder}/ic_launcher_round.png`, iconBuffer);
      }
    }
  } catch (e) {
    console.warn('Could not bundle mipmap icons into zip:', e);
  }

  // Add gradle wrapper properties template
  root.file('gradle/wrapper/gradle-wrapper.properties', 
`distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\\://services.gradle.org/distributions/gradle-8.11.1-bin.zip
networkTimeout=10000
validateDistributionUrl=true
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
`);

  // Add gradlew shell scripts
  root.file('gradlew', `#!/bin/sh
app_path=$0
while [ -h "$app_path" ]; do
    ls=\`ls -ld "$app_path"\`
    link=\`expr "$ls" : '.*-> \\(.*\\)$'\`
    if expr "$link" : '/.*' > /dev/null; then
        app_path="$link"
    else
        app_path=\`dirname "$app_path"\`"/$link"
    fi
done
APP_HOME=\`cd "\`dirname "$app_path"\`" > /dev/null && pwd\`
CLASSPATH=$APP_HOME/gradle/wrapper/gradle-wrapper.jar
JAVACMD=java
if [ -n "$JAVA_HOME" ]; then
    JAVACMD="$JAVA_HOME/bin/java"
fi
exec "$JAVACMD" -jar "$CLASSPATH" "$@"
`, { unixPermissions: '755' });

  root.file('gradlew.bat', `@rem Gradle startup script for Windows
@if "%DEBUG%" == "" @echo off
set DIRNAME=%~dp0
if "%DIRNAME%" == "" set DIRNAME=.
set APP_HOME=%DIRNAME%
set JAVACMD=java.exe
if defined JAVA_HOME set JAVACMD=%JAVA_HOME%\\bin\\java.exe
"%JAVACMD%" -classpath "%APP_HOME%\\gradle\\wrapper\\gradle-wrapper.jar" org.gradle.wrapper.GradleWrapperMain %*
`);

  // Add README
  root.file('README.md',
`# mAI - Minimalist AI Chat Client (Android Native)

Modern, native Android client for Google Gemini built with Kotlin 2.0, Jetpack Compose, Room Database, and the Google Generative AI SDK.

## Features
- **Clean Minimal Top Bar**:
  - Hamburger Drawer (≡) for conversation threads
  - Model Selector (Gemini Flash-Lite, Gemini Flash, Gemini 3.8 Flash)
  - Unified **Ayarlar (Settings ⚙️)** sheet containing:
    - C.ai & Emochi Hyper-Realistic Roleplay & System Directives
    - Secure Google Gemini API Key input
    - Model selection
    - Dark / Light theme toggle
    - Clear chat history
- **C.ai / Emochi Roleplay Engine**:
  - Unbreakable persona immersion (Zero 4th-wall breaking)
  - Asterisk action formatting (\`*actions & emotions*\`)
  - Emotional angst, vulnerabilities, flaws, and realistic dialogue
- **Models**:
  - \`gemini-3.1-flash-lite\` (Ultra-fast, lowest latency)
  - \`gemini-flash-latest\` (General multi-turn reasoning)
  - \`gemini-3.8-flash\` (High-fidelity responses)
- **Local Persistence**: Room Database (Conversations & Messages)
- **Security**: EncryptedSharedPreferences for API key storage
- **Clean Architecture**: Repository pattern + ViewModel + StateFlow

## Android Studio (Rabbit / Meerkat / Ladybug) APK Derleme Adımları:
1. ZIP dosyasını bilgisayarınızda bir klasöre çıkartın.
2. Android Studio'yu açın (**Android Studio Rabbit 1**, Ladybug, Meerkat veya daha yeni bir sürüm).
3. **File > Open...** menüsünden çıkarttığınız \`mAI-Android-Project\` klasörünü seçin.
4. Gradle senkronizasyonunun tamamlanmasını bekleyin (gerekli kütüphaneler otomatik indirilir).
5. APK oluşturmak için üst menüden:
   **Build > Build Bundle(s) / APK(s) > Build APK(s)** seçeneğine tıklayın.
6. Derleme bittiğinde sağ altta çıkan bildirimdeki **locate** bağlantısına tıklayın.
7. Oluşan \`app-debug.apk\` dosyasını telefonunuza veya cihazınıza yükleyin!
8. Uygulamayı açıp sağ üstteki **Ayarlar (⚙️)** butonundan Gemini API anahtarınızı girerek sohbet etmeye başlayabilirsiniz.
`);

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'mAI-Android-Project.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
