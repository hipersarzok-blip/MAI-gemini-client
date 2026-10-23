# Uygulama Planı: Google ile Giriş, Bulut Sohbet Senkronizasyonu ve Direktif Düzenleme İyileştirmesi

## 1. Google ile Giriş ve Gmail Hesabına Otomatik Sohbet Kaydı (Bulut Senkronizasyonu)
- **Google Hesabı ile Tek Tıkla Giriş**: Üst barda, yan menüde (Sohbetler çekmecesi) ve Ayarlar menüsünde **Google ile Giriş Yap** butonu yer alacak. İsteyen kullanıcılar giriş yapmadan misafir modunda da kullanmaya devam edebilecek.
- **Otomatik Bulut Yedekleme (Firebase Auth & Firestore)**:
  - Kullanıcı Google (Gmail) hesabıyla giriş yaptığında tüm sohbetleri, mesaj geçmişi, seçili karakter/roleplay profilleri ve özel direktifleri gerçek zamanlı olarak kendi Google hesabına bağlı bulut veritabanına kaydedilecek.
  - Farklı bir tarayıcıdan, cihazdan veya sayfayı yeniledikten sonra aynı Gmail hesabıyla giriş yapıldığında tüm eski sohbetler ve karakter ayarları otomatik olarak geri yüklenecek.
- **Mevcut Yerel Sohbetlerin Aktarımı**: Cihazda misafir olarak oluşturulmuş mevcut sohbetler, ilk Google girişinde kaybolmadan otomatik olarak kullanıcının Gmail hesabına senkronize edilecek.

## 2. Direktif ve Roleplay Kısmının Kaybolması Sorununun Çözümü ve İyileştirmeler
- **Sohbet Esnasında Kaybolmayan Sabit Direktif & Karakter Çubuğu**:
  - Mevcut durumda ilk mesaj gönderildikten sonra sohbet ekranındaki aktif direktif/karakter göstergesi kayboluyordu. Artık hem **Üst Barda (TopAppBar)** hem de **Sohbet Ekranının Üst Kısmında** aktif karakteri veya direktifi gösteren sabit bir **"Direktif / Karakteri Düzenle"** butonu yer alacak.
  - Konuşma devam ederken bile tek tıkla direktif penceresi açılabilecek, karakterin kişiliği, senaryosu, konuşma tarzı veya serbest direktif metni anında düzenlenebilecek ve yapılan değişiklikler bir sonraki mesajdan itibaren hemen geçerli olacak.
- **Direktif ve Roleplay Verilerinin Tam Korunması (Web & Android)**:
  - Web ve Android (`DirectiveModal.tsx` ve `DirectiveSheet.kt`) bileşenlerinde direktif uygulandıktan ve sohbet edildikten sonra pencere tekrar açıldığında seçili sekmenin (`Roleplay`, `Uzman Asistan` veya `Serbest Direktif`) ve tüm karakter alanlarının (isim, kişilik, angst/zaaflar, senaryo, ilişki dinamiği, açılış mesajı ve serbest direktif) sıfırlanmadan eksiksiz olarak dolu gelmesi sağlanacak.
  - Roleplay veya Uzman Asistan modunda oluşturulan tam sistem talimatı önizlenebilecek ve istenirse üzerinde serbest değişiklik yapılabilecek.
