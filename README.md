# Analytics Backend

[Analytics Tracker](https://github.com/burakaltinbicak/analytics-tracker)'dan gelen event verilerini toplayan, işleyen ve depolayan REST API.

## Özellikler

- ⚡ Fastify ile yüksek performanslı API (60.000+ istek/saniye)
- 📦 Write buffer sistemi ile toplu DB yazımı
- 🗄️ PostgreSQL (Neon) + Redis cache
- 🌍 GeoIP ile ülke tespiti
- 📱 User-Agent parsing (tarayıcı, OS, cihaz)
- 🔄 Session yönetimi
- 🛡️ Rate limiting ve CORS koruması

## Teknolojiler

| Teknoloji | Kullanım |
|---|---|
| Fastify | Web framework |
| Drizzle ORM | Veritabanı |
| Neon PostgreSQL | Veritabanı (cloud) |
| Redis | Cache |
| Zod | Validasyon |
| GeoIP Lite | Ülke tespiti |
| UA Parser | Cihaz tespiti |

## Kurulum

```bash
npm install
```

## Ortam Değişkenleri

`.env` dosyası oluştur:

```env
DATABASE_URL=postgresql://...
PORT=5000
API_URL=http://localhost:5000       
REDIS_URL=redis://...
```

## Geliştirme

```bash
npm run dev
```

## Build ve Deploy

```bash
npm run build
node dist/index.js
```

PM2 ile çoklu instance:

```bash
npm run build
pm2 start dist/index.js -i max
```

## API Endpoints

| Method | Endpoint | Açıklama |
|---|---|---|
| POST | `/api/topla` | Tekil event (Beacon API için) |
| POST | `/api/topla/batch` | Toplu event gönderimi |
| GET | `/api/websites` | Tüm siteler |
| POST | `/api/websites` | Yeni site ekle |
| GET | `/api/websites/:id/stats` | Site istatistikleri |
| GET | `/api/websites/:id/heatmap` | Isı haritası verisi |
| GET | `/health` | Sağlık kontrolü |

## Performans

Lokalde yapılan yük testi sonuçları (k6, 500 VU, 30 saniye):

- **60.508 istek/saniye**
- **%0 hata oranı**
- **Ortalama yanıt süresi: 6.79ms**

## Deploy

Render.com üzerinde deploy edilmiştir:

```
https://analytics-backend-kss2.onrender.com
```

## Bağlantılı Projeler

- [Analytics Tracker](https://github.com/burakaltinbicak/analytics-tracker) — Sitelere eklenen tracker script
- [Analytics Dashboard](https://github.com/burakaltinbicak/analytics-dashboard) — Verileri görselleştiren arayüz