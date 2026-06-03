import Redis from 'ioredis';
import { config } from '../config';

// Redis'in o an aktif olup olmadığını takip eden bayrak
let isRedisAvailable = true;

// Redis yoksa verileri geçici olarak tutacağımız lokal bellek (In-Memory)
const memoryDb = new Map<string, any>();

// Gerçek Redis istemcisi
const realRedis = new Redis(config.REDIS_URL, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: true,               // Uygulama başlarken bağlantı yoksa tüm süreci kilitlemesin
    keepAlive: 30000,
    connectTimeout: 4000,            // Lokal testte çok beklememek için timeout sürelerini düşürdük
    commandTimeout: 3000,
    retryStrategy(times) {
        if (times > 3) {
            console.warn('❌ Redis sunucusuna ulaşılamadı! Sistem otomatik olarak "In-Memory (Lokal Bellek)" moduna geçirildi.');
            isRedisAvailable = false; // Modu değiştiriyoruz
            return null;              // Sonsuz yeniden bağlanma döngüsünü tamamen durdurur
        }
        return Math.min(times * 100, 2000);
    }
});

// Event Dinleyicileri
realRedis.on('connect', () => {
    isRedisAvailable = true;
    console.log('✅ Redis bağlantisi basarili');
});

realRedis.on('error', (err) => {
    // Eğer zaten lokal belleğe geçtiysek terminali log kirliliğiyle boğmasın
    if (isRedisAvailable) {
        console.error('Redis bağlanti hatasi:', err.message);
    }
});

realRedis.on('close', () => {
    if (isRedisAvailable) console.warn('⚠️ Redis bağlantisi kapandı');
});


// ─── B PLANI: REDIS YOKSA ÇALIŞACAK YEDEK MEKANİZMA ────────────────────────────────
const inMemoryRedis = {
    get: async (key: string) => memoryDb.get(key) || null,
    set: async (key: string, value: any) => {
        memoryDb.set(key, value);
        return 'OK';
    },
    incr: async (key: string) => {
        const current = Number(memoryDb.get(key) || 0);
        const next = current + 1;
        memoryDb.set(key, next);
        return next;
    },
    del: async (key: string) => {
        return memoryDb.delete(key) ? 1 : 0;
    },
    expire: async (key: string, seconds: number) => {
        setTimeout(() => memoryDb.delete(key), seconds * 1000);
        return 1;
    }
};

// ─── SİHİRLİ KISIM: PROXY İLE AKILLI YÖNLENDİRME ───────────────────────────────────
// Dışarıya yine standart "redis" ismini export ediyoruz. Projenin kalanı farkı anlamayacak.
export const redis = new Proxy(realRedis, {
    get(target, prop) {
        // Eğer Redis bağlantısı koptuysa veya hiç kurulmadıysa istekleri inMemory nesnesine saptır
        if (!isRedisAvailable) {
            if (prop in inMemoryRedis) {
                return (inMemoryRedis as any)[prop];
            }
            // Projede inMemory içine yazmadığımız sıra dışı bir Redis metodu çağrılırsa çökmesin diye boş fonksiyon dönüyoruz
            return async () => {
                console.warn(`⚠️ Redis aktif değil. '${String(prop)}' metodu simüle edilerek pasif geçildi.`);
                return null;
            };
        }

        // Eğer Redis aktifse, ioredis'in orijinal fonksiyonlarını normal şekilde çalıştırır
        const value = Reflect.get(target, prop);
        if (typeof value === 'function') {
            return value.bind(target);
        }
        return value;
    }
}) as unknown as Redis;