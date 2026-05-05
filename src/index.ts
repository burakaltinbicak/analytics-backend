import Fastify from 'fastify'
import path from 'path'
import fastifyStatic from '@fastify/static'
import { db } from './db/index'
import { sql } from 'drizzle-orm'
import { websiteRoutes } from './routes/websites'
import { toplaRoutes } from './routes/topla'
import { corsMiddleware } from './middlewares/_cors'
import { rateLimitMiddleware } from './middlewares/rateLimit'
import { statsRoutes } from './routes/stats'
import { heatmapRoutes } from './routes/heatmap'
import { errorHandler } from './middlewares/errorHandler'
import { websiteCache, sessionCache } from './db/cache'
import { websites, sessions } from './db/schema'
import { config } from './config'
import { startWorker } from './services/worker'; // Yeni Worker servisi

const app = Fastify()

const start = async () => {
    try {
        // 1. Middlewares & Static Files
        await app.register(corsMiddleware)
        await app.register(errorHandler)
        await app.register(fastifyStatic, {
            root: path.join(process.cwd(), 'public'),
        })

        // Yüksek trafik için rate limit (Redis bağlı olmalı)
        await app.register(rateLimitMiddleware)

        // 2. Health Checks
        app.get('/health', async () => {
            return { status: 'ok' }
        })

        app.get('/db-test', async () => {
            await db.execute(sql`SELECT 1`)
            return { status: 'db ok' }
        })

        // 3. Routes
        await app.register(websiteRoutes)
        await app.register(toplaRoutes)
        await app.register(statsRoutes)
        await app.register(heatmapRoutes)

        // 4. Cache Warmup (Başlangıçta verileri Redis'e yükle)
        const allWebsites = await db.select({ id: websites.id }).from(websites)
        await Promise.all(allWebsites.map(w => websiteCache.add(w.id)))
        console.log(`✅ Website Cache yüklendi: ${allWebsites.length} site`)

        const allSessions = await db.select({ id: sessions.id }).from(sessions)
        await Promise.all(allSessions.map(s => sessionCache.add(s.id)))
        console.log(`✅ Session Cache yüklendi: ${allSessions.length} session`)

        // 5. Shutdown Handling (Kapatılırken temizlik yap)
        const shutdown = async (signal: string) => {
            console.log(`⚠️ ${signal} alındı, servis kapatılıyor...`)
            await app.close()
            process.exit(0)
        }

        process.on('SIGTERM', () => shutdown('SIGTERM'))
        process.on('SIGINT', () => shutdown('SIGINT'))

        // 6. Start Server
        await app.listen({ port: config.PORT, host: '0.0.0.0' })
        console.log(`🚀 Server ${config.PORT} portunda çalışıyor`)

        // 7. Start Background Worker
        // API artık istek almaya hazır, arka planda Redis kuyruğunu işlemeye başlayabiliriz.
        startWorker();

    } catch (err) {
        console.error('❌ Server başlatılamadı:', err)
        process.exit(1)
    }
}

start()