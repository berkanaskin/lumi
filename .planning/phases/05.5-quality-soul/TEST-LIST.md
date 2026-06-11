# Lumi 05.5 — Founder Test Listesi

> Hepsi `lumi-jade.vercel.app` üzerinde. Sırayla git; her madde "aç → bas → şunu görmelisin" formatında.
> Bir madde patlarsa not al, geri kalanına devam et — topluca düzeltirim.

## A. Hız hissi
1. **Soğuk açılış:** Tarayıcı önbelleğini temizle (veya gizli sekme) → uygulamayı aç.
   ✅ İlk içerik belirgin şekilde daha hızlı gelmeli (font/SDK blokajı kalktı; ölçümde ilk boya %39 hızlandı).
2. **Detay sayfası:** Ana sayfada herhangi bir karta bas.
   ✅ Spinner YOK — anında film adı/yılıyla iskelet, ardından içerik tek seferde dolar (5 istek → 1).
3. **Detay → kapat → başka detay** hızlıca arka arkaya.
   ✅ Yanlış filmin bilgisi asla görünmemeli (yarış guard'ı).

## B. Bug fix doğrulamaları
4. **AI arama tip karışıklığı:** "Öner Bana"ya dizi+film karışık dönecek bir şey yaz (örn. "distopik bilim kurgu").
   ✅ Bir DİZİ kartına bas → o dizinin sayfası açılmalı (eskiden aynı ID'li alakasız film açılıyordu).
5. **"From" / Epix:** From dizisini arat, detayına gir.
   ✅ "Yayın Kanalı" bölümünde Epix/MGM+ GÖRÜNMEMELİ (TR'de bölüm ya TR kanalı gösterir ya hiç görünmez).
   ✅ Bir TR dizisinde (örn. aktif bir Show TV/ATV dizisi) "Yayın Kanalı" hâlâ doğru kanalla görünmeli.

## C. Fragman
6. Bir filmin detayında fragman küçük resmine bas.
   ✅ Sayfanın dibine atmak yerine üstte karartılmış overlay'de oynamalı.
   ✅ Kapat (✕ / boşluğa dokun / ESC) → tam kaldığın yerdesin.
   ✅ Birden çok fragman varsa altta küçük geçiş şeridi var.

## D. Eritme — Lumi Agent yok artık
7. ✅ Köşedeki pembe FAB tamamen GİTTİ.
8. **Keşfet (Wizard) sekmesi:** "Öner Bana"/"Sürpriz Yap"ın altında mor **"Kararsızım — Lumi Seçsin"** butonu var.
   - Free kullanıcı: bas → paywall açılır.
   - Premium (Firestore'da `users/{uid}.premium=true`): bas → mood çipleri + "Karar Ver ✨" sheet'i; tek film önerir; "Detayına bak" çalışır.
9. Hiçbir yerde "Lumi Agent" yazısı kalmadı (premium yüzeylerde "Lumi Premium").

## E. Kitaplık (eski Favoriler)
10. Alt menüden Favoriler sekmesi.
    ✅ Başlık "Kitaplığın"; segmentli **Beğendiklerim / İzleme Listem** sekmeleri; altında "X film · Y dizi" satırı.
    ✅ Üstte mor "Bu akşam ne izlesen?" bandı → (premium'da) Decide sheet'i, free'de paywall.
    ✅ Posterler köşe rozetli (❤/🔖), alt gradyanda ad · yıl · tip; karta bas → doğru detay.
11. Detaydan bir içeriği beğen/listeye ekle → Kitaplığa dön.
    ✅ Yeni öğe görünür, sayılar güncel.

## F. Profil
12. Profil sekmesi:
    ✅ "ÜCRETSİZ" pili (premium'da yerine LUMI PREMIUM rozeti).
    ✅ 3'lü istatistik kartı: İzlenen / Beğenilen / Listemde.
    ✅ Beğenilerin varsa "Son Beğendiklerin" raf — postere bas → detay açılır.
    ✅ (Yeni beğeniler biriktikçe) zevk DNA'sı çipleri başlığın altında belirir — eski beğenilerde tür verisi yok, 2-3 yeni beğeniden sonra görünür.
13. Ayarlar:
    ✅ **Dil** satırı: dile bas → değişir (UI metinleri güncellenir).
    ✅ **Platformlarım** satırı: bas → onboarding açılır (platform seçimini oradan günceller).
    ✅ **Çift Modu** satırı: free→paywall; premium→Pair sheet (kod üret/kod gir akışı eskisi gibi).
    ✅ En altta mor **Lumi Premium** kartı (premium kullanıcıda görünmez) → "3 gün ücretsiz dene" → paywall.

## G. Trivia
14. Tanınmış bir yabancı filmin (örn. Inception) detayında "Biliyor muydunuz?" bölümü.
    ✅ Maddeler artık daha "sohbette anlatılır" olmalı (Wikipedia yapım/çekim bölümlerinden seçiliyor).
    ✅ Kaynak satırında wikipedia ibaresi görünebilir; obskür içerikte eski davranış (OMDB/TMDB) sürer.

## H. TR platformları
15. Bir Gain/Puhu/Tabii içeriğinin detayına gir (örn. Gain: "Bizi Ayıran Çizgi", Tabii: "Leyla ile Mecnun", Puhu sitesindeki güncel bir dizi).
    ✅ "Nerede izlenir" bölümünde ilgili TR platformu görünmeli (katalog ~2.000 başlıkla dolduruldu).
16. (GitHub) Repo → Settings → Secrets → Actions → **TMDB_API_KEY** ekle.
    ✅ Actions sekmesinde "TR platform catalog refresh" workflow'u manuel tetiklenebilir (workflow_dispatch) — her ayın 1'i otomatik PR açar; site yapısı bozulursa workflow kırmızı düşer.

## Notlar
- Exxen: robots.txt taramayı yasaklıyor — otomasyona dahil değil; Exxen yapımları için mevcut yapımcı-sezgisi + manuel katalog sürüyor.
- Yeni hatırladığın her bug'ı buraya yaz/bana gönder; ikinci dalgada topluca kapatırım.
