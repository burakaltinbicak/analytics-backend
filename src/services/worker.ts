import { redis } from '../db/redis';
import { db } from '../db/index';
import { sessions, events } from '../db/schema';
import geoip from 'geoip-lite';
import { UAParser } from 'ua-parser-js';
import { sessionCache } from '../db/cache';

const BATCH_SIZE = 1000; // Her seferinde kaç kayıt işlenecek?
const PROCESS_INTERVAL = 2000; // Kaç milisaniyede bir çalışacak?

async function processQueue() {
    try {
        // 1. Redis'ten toplu veri çek (RPOP ile son eklenenlerden başla)
        const rawDatas = await redis.rpop('tracking_queue', BATCH_SIZE);
        if (!rawDatas || rawDatas.length === 0) return;

        console.log(`[Worker] ${rawDatas.length} adet veri işleniyor...`);

        const parsedEvents: any[] = [];
        const newSessions: Map<string, any> = new Map();

        for (const raw of rawDatas) {
            const data = JSON.parse(raw);

            // 2. Ağır işlemler burada, API dışında yapılıyor
            const geo = geoip.lookup(data.ip);
            const parser = new UAParser(data.user_agent);

            // Session kontrolü ve hazırlığı
            if (!newSessions.has(data.session_id)) {
                newSessions.set(data.session_id, {
                    id: data.session_id,
                    website_id: data.website_id,
                    country: geo?.country ?? null,
                    browser: parser.getBrowser().name ?? null,
                    os: parser.getOS().name ?? null,
                    device: parser.getDevice().type ?? 'desktop',
                    referrer: data.referrer ?? null,
                    language: data.language ?? null,
                    screen: data.screen ?? null,
                });
            }

            // Event hazırlığı
            parsedEvents.push({
                website_id: data.website_id,
                session_id: data.session_id,
                eventname: data.event_name,
                url_path: data.url_path,
                event_data: data.event_data ?? null,
                created_at: new Date(data.received_at)
            });
        }

        // 3. Veritabanına (Neon) TOPLU YAZMA (Batch Insert)
        // Sessions (Çakışmaları önleyerek yaz)
        if (newSessions.size > 0) {
            await db.insert(sessions)
                .values(Array.from(newSessions.values()))
                .onConflictDoNothing();
        }

        // Events
        if (parsedEvents.length > 0) {
            await db.insert(events).values(parsedEvents);
        }

        console.log(`[Worker] ${parsedEvents.length} kayıt başarıyla Neon'a aktarıldı.`);

    } catch (err) {
        console.error('[Worker Hata]:', err);
    }
}

// Worker'ı başlatan ana fonksiyon
export function startWorker() {
    console.log('🚀 Arka plan işçisi başlatıldı...');
    setInterval(processQueue, PROCESS_INTERVAL);
}