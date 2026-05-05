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
import { websiteCache } from './db/cache' // sessionCache kaldırıldı
import { websites } from './db/schema' // sessions kaldırıldı
import { config } from './config'
import { startWorker } from './services/worker'
import { startBuffer } from './db/writeBuffer'


const app = Fastify()

const start = async () => {
    try {
        // 1. Middlewares & Static Files
        await app.register(corsMiddleware)
        await app.register(errorHandler)
        await app.register(fastifyStatic, {
            root: path.join(process.cwd(), 'public'),
        })

        await app.register(rateLimitMiddleware)

        // 2. Health Checks
        app.get('/health', async () => ({ status: 'ok' }))

        app.get('/db-test', async () => {
            await db.execute(sql`SELECT 1`)
            return { status: 'db ok' }
        })

        // 3. Routes
        await app.register(websiteRoutes)
        await app.register(toplaRoutes)
        await app.register(statsRoutes)
        await app.register(heatmapRoutes)

        // 4. Cache Warmup (Sadece Websiteleri yükle, Session'lar silindi)
        const allWebsites = await db.select({ id: websites.id }).from(websites)
        await Promise.all(allWebsites.map(w => websiteCache.add(w.id)))
        console.log(`✅ Website Cache yüklendi: ${allWebsites.length} site`)

        // 5. Shutdown Handling
        const shutdown = async (signal: string) => {
            console.log(`⚠️ ${signal} alındı, servis kapatılıyor...`)
            await app.close()
            process.exit(0)
        }

        process.on('SIGTERM', () => shutdown('SIGTERM'))
        process.on('SIGINT', () => shutdown('SIGINT'))

        // 6. Start Background Services
        // Önce buffer'ı başlatıyoruz ki gelen ilk istekler boşa gitmesin
        startBuffer()
        console.log('🚀 Write Buffer başlatıldı')

        // 7. Start Server
        await app.listen({ port: config.PORT, host: '0.0.0.0' })
        console.log(`🚀 Server ${config.PORT} portunda çalışıyor`)

        // 8. Start Background Worker
        startWorker()
        console.log('👷 Worker arka planda çalışmaya başladı')

    } catch (err) {
        console.error('❌ Server başlatılamadı:', err)
        process.exit(1)
    }
}

start()