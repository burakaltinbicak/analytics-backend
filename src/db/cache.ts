import { redis } from './redis'

const WEBSITE_CACHE_KEY = 'website_ids'
const SESSION_TTL = 60 * 60 * 24

export const websiteCache = {
    has: async (id: string) => {
        const result = await redis.sismember(WEBSITE_CACHE_KEY, id)
        return result === 1
    },
    add: async (id: string) => {
        await redis.sadd(WEBSITE_CACHE_KEY, id)
    }
}

export const sessionCache = {
    has: async (id: string) => {
        const result = await redis.exists(`session:${id}`)
        return result === 1
    },
    add: async (id: string) => {
        await redis.set(`session:${id}`, '1', 'EX', SESSION_TTL)
    }
}

export async function checkCaches(websiteId: string, sessionId: string) {
    const pipeline = redis.pipeline()
    pipeline.sismember(WEBSITE_CACHE_KEY, websiteId)
    pipeline.exists(`session:${sessionId}`)
    const results = await pipeline.exec()
    return {
        websiteExists: results?.[0]?.[1] === 1,
        sessionExists: results?.[1]?.[1] === 1
    }
}