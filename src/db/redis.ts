import Redis from 'ioredis';
import { config } from '../config';

export const redis = new Redis(config.REDIS_URL)

redis.on('connect', () => console.log('✅ Redis bağlantisi basarili'))
redis.on('error', (err) => console.error('Redis bağlanti hatasi:', err))