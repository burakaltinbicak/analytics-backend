import Fastify from 'fastify'
import dotenv from 'dotenv'
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
import { startBuffer, flush } from './db/writeBuffer'

dotenv.config()

const app = Fastify()

const start = async () => {
    try {
        await app.register(corsMiddleware)
        await app.register(errorHandler)
        await app.register(fastifyStatic, {
            root: path.join(process.cwd(), 'public'),
        })

        await app.register(rateLimitMiddleware)

        app.get('/health', async () => {
            return { status: 'ok' }
        })

        app.get('/db-test', async () => {
            const result = await db.execute(sql`SELECT 1`)
            return { status: 'db ok' }
        })

        await app.register(websiteRoutes)
        await app.register(toplaRoutes)
        await app.register(statsRoutes)
        await app.register(heatmapRoutes)

        const allWebsites = await db.select({ id: websites.id }).from(websites)
        allWebsites.forEach(w => websiteCache.add(w.id))
        console.log(`Cache yüklendi: ${websiteCache.size} site`)

        const allSessions = await db.select({ id: sessions.id }).from(sessions)
        allSessions.forEach(s => sessionCache.add(s.id))
        console.log(`Cache yüklendi: ${sessionCache.size} session`)

        startBuffer()

        const shutdown = async (signal: string) => {
            console.log(`${signal} alindi, buffer flush ediliyor...`)
            await flush()
            await app.close()
            process.exit(0)
        }

        process.on('SIGTERM', () => shutdown('SIGTERM'))
        process.on('SIGINT', () => shutdown('SIGINT'))

        await app.listen({ port: Number(process.env.PORT) || 5000 })
        console.log('Server 5000 portunda calisiyor')
    } catch (err) {
        console.error(err)
        process.exit(1)
    }
}

start()