import { FastifyInstance } from 'fastify'
import { db } from '../db/index'
import { sessions, events } from '../db/schema'
import { z } from 'zod'
import geoip from 'geoip-lite'
import { UAParser } from 'ua-parser-js'
import { websiteCache, sessionCache } from '../db/cache'
import { addToBuffer } from '../db/writeBuffer'

const toplaSchema = z.object({
    website_id: z.string().uuid(),
    session_id: z.string(),
    event_name: z.string().min(1),
    url_path: z.string().min(1),
    referrer: z.string().nullable().optional(),
    language: z.string().optional(),
    screen: z.string().optional(),
    user_agent: z.string().optional(),
    event_data: z.record(z.string(), z.any()).optional()
})

const batchSchema = z.object({
    events: z.array(toplaSchema).min(1).max(50)
})

async function processEvent(body: z.infer<typeof toplaSchema>, ip: string) {
    if (!websiteCache.has(body.website_id)) return

    if (sessionCache.has(body.session_id)) {
        addToBuffer({
            website_id: body.website_id,
            session_id: body.session_id,
            eventname: body.event_name,
            url_path: body.url_path,
            event_data: body.event_data ?? null
        })
        return
    }

    const geo = geoip.lookup(ip)
    const country = geo?.country ?? null

    const parser = new UAParser(body.user_agent)
    const browser = parser.getBrowser().name ?? null
    const os = parser.getOS().name ?? null
    const device = parser.getDevice().type ?? 'desktop'

    const session = await db.insert(sessions).values({
        id: body.session_id,
        website_id: body.website_id,
        referrer: body.referrer ?? null,
        language: body.language ?? null,
        screen: body.screen ?? null,
        country,
        browser,
        os,
        device,
    }).returning()

    sessionCache.add(session[0].id)

    addToBuffer({
        website_id: body.website_id,
        session_id: session[0].id,
        eventname: body.event_name,
        url_path: body.url_path,
        event_data: body.event_data ?? null
    })
}

export const toplaRoutes = async (app: FastifyInstance) => {
    app.post('/api/topla', async (request, reply) => {
        const body = toplaSchema.parse(request.body)
        await processEvent(body, request.ip)
        return reply.code(200).send({ status: 'ok' })
    })

    app.post('/api/topla/batch', async (request, reply) => {
        const body = batchSchema.parse(request.body)

        let processed = 0
        for (const event of body.events) {
            await processEvent(event, request.ip)
            processed++
        }

        return reply.code(200).send({ status: 'ok', processed })
    })

    app.get('/api/topla', async (request, reply) => {
        const sessionsResult = await db.select().from(sessions)
        const eventsResult = await db.select().from(events)
        return { sessions: sessionsResult, events: eventsResult }
    })
}