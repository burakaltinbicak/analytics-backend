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
import { errorHandler } from './middlewares/errorHandler'

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
        await app.listen({ port: Number(process.env.PORT) || 5000 })
        console.log('Server 5000 portunda calisiyor')
    } catch (err) {
        console.error(err)
        process.exit(1)
    }
}

start()