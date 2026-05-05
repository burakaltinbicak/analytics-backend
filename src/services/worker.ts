import { redis } from '../db/redis';
import { db } from '../db/index';
import { sessions, events } from '../db/schema';
import geoip from 'geoip-lite';
import { UAParser } from 'ua-parser-js';

const BATCH_SIZE = 1000;
const PROCESS_INTERVAL = 2000;

const parser = new UAParser()

async function processQueue() {
    try {
        const rawDatas = await redis.rpop('tracking_queue', BATCH_SIZE);
        if (!rawDatas || rawDatas.length === 0) return;

        console.log(`[Worker] ${rawDatas.length} adet veri işleniyor...`);

        const parsedEvents: any[] = [];
        const newSessions: Map<string, any> = new Map();

        for (const raw of rawDatas) {
            const data = JSON.parse(raw);

            const geo = geoip.lookup(data.ip);
            parser.setUA(data.user_agent)

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

            parsedEvents.push({
                website_id: data.website_id,
                session_id: data.session_id,
                eventname: data.event_name,
                url_path: data.url_path,
                event_data: data.event_data ?? null,
                created_at: new Date(data.received_at)
            });
        }

        if (newSessions.size > 0) {
            await db.insert(sessions)
                .values(Array.from(newSessions.values()))
                .onConflictDoNothing();
        }

        if (parsedEvents.length > 0) {
            await db.insert(events).values(parsedEvents);
        }

        console.log(`[Worker] ${parsedEvents.length} kayıt başarıyla Neon'a aktarıldı.`);

    } catch (err) {
        console.error('[Worker Hata]:', err);
    }
}

export function startWorker() {
    console.log('🚀 Arka plan işçisi başlatıldı...');
    setInterval(processQueue, PROCESS_INTERVAL);
}