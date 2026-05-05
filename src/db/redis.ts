import Redis from 'ioredis';
import { config } from '../config';

export const redis = new Redis(config.REDIS_URL, {
    maxRetriesPerRequest: 3,        // hata durumunda 3 kez dene
    enableReadyCheck: true,         // bağlantı hazır olmadan istek atma
    lazyConnect: false,             // uygulama başlarken bağlan
    keepAlive: 30000,               // 30s'de bir keep-alive gönder
    connectTimeout: 10000,          // 10s bağlantı timeout
    commandTimeout: 5000,           // 5s komut timeout
})

redis.on('connect', () => console.log('✅ Redis bağlantisi basarili'))
redis.on('error', (err) => console.error('Redis bağlanti hatasi:', err))
redis.on('close', () => console.warn('⚠️ Redis bağlantisi kapandı'))
redis.on('reconnecting', () => console.log('🔄 Redis yeniden bağlanıyor...'))