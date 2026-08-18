# Nöbet Listesi Oluşturucu

Radyoloji birimleri için vardiya planlama uygulamasıdır. Personel ve izin yönetimi, cihaz/gün/hafta kısıtları, otomatik çizelge üretimi, manuel düzenleme, Excel/PDF dışa aktarma, sürüm geçmişi, gece riski analizi ve vardiya dengesi özelliklerini içerir.

## Tam işlevli uygulama

Uygulama; Express sunucusu, tRPC API'si, Manus OAuth oturumu ve MySQL/TiDB veritabanı kullandığı için **GitHub Pages üzerinde tek başına çalışmaz**. Güncel tam işlevli sürüm aşağıdaki adreste barındırılır:

<https://nobetlist-vbfkk97a.manus.space>

GitHub Pages, `github-static/` klasöründeki bağımsız statik uygulamayı yayınlar. Bu sürüm giriş ve veritabanı kullanmaz; verileri yalnızca kullanıcının tarayıcısının yerel depolamasında tutar.

## Yerel çalışma

Node.js 22+, pnpm ve MySQL/TiDB bağlantısına ihtiyaç vardır.

```bash
pnpm install
pnpm check
pnpm test
pnpm dev
```

Gerekli ortam değişkenleri şunlardır: `DATABASE_URL`, `JWT_SECRET`, `VITE_APP_ID`, `OAUTH_SERVER_URL`, `VITE_OAUTH_PORTAL_URL`, `OWNER_OPEN_ID`, `OWNER_NAME`, `BUILT_IN_FORGE_API_URL` ve `BUILT_IN_FORGE_API_KEY`. Bu değerler depoya eklenmemeli; yerel `.env` dosyası veya seçilen barındırma ortamının gizli değişken yönetimi üzerinden sağlanmalıdır.

## Tam işlevli dağıtım

GitHub Pages yalnızca statik dosyaları sunar. Tam uygulamayı farklı bir sağlayıcıda çalıştırmak için Node.js sunucusu, kalıcı veritabanı, OAuth yönlendirme adresi ve yukarıdaki gizli değişkenler yapılandırılmalıdır. Yerleşik barındırma bu bileşenleri hazır olarak sağladığından önerilen çalışan dağıtım hedefidir.

## Kalite denetimleri

```bash
pnpm check
pnpm test
pnpm build
```

Test kapsamı; vardiya dinlenme kuralları, cihaz ve cinsiyet kısıtları, sürüm/taslak akışı, zorunlu atama onayı, gece riski ve toplam-akşam-gece dağılım dengelemesini içerir.
