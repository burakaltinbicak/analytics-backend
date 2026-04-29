import { db } from '../db'
import { events } from '../db/schema'
import { eq, and } from 'drizzle-orm'

export async function getHeatmapData(websiteId: string, urlPath?: string) {
    const conditions = [eq(events.website_id, websiteId)]

    if (urlPath) {
        conditions.push(eq(events.url_path, urlPath))
    }

    const result = await db
        .select()
        .from(events)
        .where(and(...conditions))

    const clicks = result
        .filter(e => e.eventname === 'click' && e.event_data)
        .map(e => {
            const data = e.event_data as Record<string, any>
            return {
                x: data.xPercent,
                y: data.yPercent,
                screenWidth: data.screenWidth,
                screenHeight: data.screenHeight,
                text: data.text,
                tag: data.tag,
            }
        })
        .filter(e => e.x != null && e.y != null)

    const scrollDepths = result
        .filter(e => e.eventname === 'scroll' && e.event_data)
        .map(e => {
            const data = e.event_data as Record<string, any>
            return {
                depth: data.depth as number,
                sessionId: e.session_id
            }
        })
        .filter(e => e.depth != null)

    const sessionMaxDepths = new Map<string, number>()
    scrollDepths.forEach(({ depth, sessionId }) => {
        const current = sessionMaxDepths.get(sessionId) ?? 0
        if (depth > current) sessionMaxDepths.set(sessionId, depth)
    })

    const uniqueDepths = Array.from(sessionMaxDepths.values())

    // Session başına toplam süre
    const sessionDurations = new Map<string, number>()
    result
        .filter(e => e.eventname === 'time_on_page' && e.event_data)
        .forEach(e => {
            const data = e.event_data as Record<string, any>
            const duration = data.duration as number
            if (duration == null) return
            const current = sessionDurations.get(e.session_id) ?? 0
            sessionDurations.set(e.session_id, current + duration)
        })

    const timeOnPage = Array.from(sessionDurations.values())

    return { clicks, scrollDepths: uniqueDepths, timeOnPage }
}