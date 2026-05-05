import { redis } from './redis'

const WEBSITE_CACHE_KEY = 'website_ids'
const SESSION_TTL = 60 * 60 * 24
const localWebsiteCache = new Set<string>()

export async function checkCaches(websiteId: string, sessionId: string) {
    if (!localWebsiteCache.has(websiteId)) {
        const exists = await redis.sismember(WEBSITE_CACHE_KEY, websiteId)
        if (exists) localWebsiteCache.add(websiteId)
        else return { websiteExists: false, sessionExists: false }
    }

    const sessionExists = await redis.exists(`session:${sessionId}`)
    return {
        websiteExists: true,
        sessionExists: sessionExists === 1
    }
}

export const websiteCache = {
    has: async (id: string) => redis.sismember(WEBSITE_CACHE_KEY, id).then(r => r === 1),
    add: async (id: string) => {
        await redis.sadd(WEBSITE_CACHE_KEY, id)
        localWebsiteCache.add(id) // local cache'i de güncelle
    }
}

export const sessionCache = {
    has: async (id: string) => redis.exists(`session:${id}`).then(r => r === 1),
    add: async (id: string) => redis.set(`session:${id}`, '1', 'EX', SESSION_TTL)
}