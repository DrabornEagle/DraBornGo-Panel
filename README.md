# DraBornGo Panel v0.0.1

DraBornGo Panel, DraBornGo ana uygulamasından ayrı çalışan ve Google Play yayını hedeflenmeyen işletme operasyon uygulamasıdır. Expo Go / SDK 57 ile test edilir ve DraBornGo ile **aynı Supabase projesini** kullanır.

## v0.0.1 özellikleri

- İşletme sahibi için modern Giriş Yap / Kayıt Ol akışı; admin onayı gerekmez.
- Saatlik, günlük, haftalık ve aylık işletme kazanç paneli.
- Brüt teslimat, kurye maliyeti ve net görünüm.
- Gelen siparişlerde atanan kurye, hedef adres, teslimat durumu ve canlı kurye konumu.
- İşletmeye bağlı kurye listesi ve çevrimiçi durum.
- Ad, plaka, e-posta veya mevcut kurye başvurusundaki tam TC ile birebir eşleşerek kurye arama; TC değeri işletme paneline döndürülmez.
- Kurye başına paket ücreti + saatlik sabit ücret.
- Ücret değişikliklerinde tarihçe; geçmiş kazançlar yeni ücretle geriye dönük değişmez.
- DraBornGo ana uygulamasındaki mevcut `dkd_courier_earnings_summary_dkd` RPC sözleşmesi korunur. Bağlı kurye için panel ücretleri otomatik uygulanır.
- Panel yeni bir plaintext TC kopyası oluşturmaz. Mevcut DraBornGo kurye başvurusundaki `national_id` yalnızca güvenli exact-match RPC içinde okunur ve istemciye dönmez; yeni lookup tablosu ayrıca bcrypt doğrulayıcı + son dört hane modelini destekler.

## Expo Go

Proje Expo SDK 57, React 19.2.3 ve React Native 0.86.x hattındadır. APK/AAB üretmek v0.0.1 test akışının parçası değildir.

```bash
npm install
npx expo install --fix
npx expo-doctor@latest
npm start
```

## Ortam değişkenleri

`.env.example` dosyasını `.env` olarak kopyalayın ve DraBornGo ile aynı public Supabase bağlantısını kullanın:

```env
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

Legacy projelerde `EXPO_PUBLIC_SUPABASE_ANON_KEY` fallback olarak desteklenir.

## Supabase migration

Paylaşılan DraBornGo veritabanı migration dosyası:

`supabase/migrations/` altındaki v0.0.1 migration zinciri.

Migration zinciri; işletme, kurye üyeliği, ücret tarihçesi, güvenli TC exact-match köprüsü, sipariş işletme bağlantısı, RLS, güvenlik/performans sertleştirmeleri ve panel RPC'lerini kurar.

## Sürüm politikası

Her panel sürüm yükseltmesinde:

1. Mevcut `main` tarihli `backup/...` branch'ine alınır.
2. Yeni sürüm `main` üzerine uygulanır.
3. Supabase migration uygulanır ve security/performance advisor kontrol edilir.
4. Termux lokal repo `origin/main` ile birebir eşitlenir.
5. Geri alma için backup branch komutu sürüm notunda tutulur.
