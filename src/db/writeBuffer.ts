import { db } from './index'
import { events } from './schema'

type BufferedEvent = {
    website_id: string
    session_id: string
    eventname: string
    url_path: string
    event_data: Record<string, any> | null
}

const buffer: BufferedEvent[] = []
const FLUSH_INTERVAL = 2000
const FLUSH_SIZE = 500
const MAX_RETRIES = 3
let isFlushing = false

export const addToBuffer = (event: BufferedEvent) => {
    buffer.push(event)
    if (buffer.length >= FLUSH_SIZE) flush()
}

export const flush = async () => {
    if (buffer.length === 0) return
    if (isFlushing) return

    isFlushing = true
    const toWrite = buffer.splice(0, buffer.length)

    try {
        await db.insert(events).values(toWrite)
    } catch (err) {
        console.error('Flush hatasi:', err)

        // Sadece MAX_RETRIES'dan az denenenler geri konulsun
        const retryable = toWrite
            .map((event: any) => ({
                ...event,
                _retries: (event._retries ?? 0) + 1
            }))
            .filter((event: any) => event._retries < MAX_RETRIES)

        if (retryable.length > 0) {
            buffer.unshift(...retryable)
        }

        const dropped = toWrite.length - retryable.length
        if (dropped > 0) {
            console.warn(`[Buffer] ${dropped} event max retry aşıldı, silindi.`)
        }
    } finally {
        isFlushing = false
    }
}

export const startBuffer = () => {
    setInterval(flush, FLUSH_INTERVAL)
    console.log('Write buffer başlatildi')
}