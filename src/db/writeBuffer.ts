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

export const addToBuffer = (event: BufferedEvent) => {
    buffer.push(event)
    if (buffer.length >= FLUSH_SIZE) flush()
}

export const flush = async () => {
    if (buffer.length === 0) return
    const toWrite = buffer.splice(0, buffer.length)
    try {
        await db.insert(events).values(toWrite)
    } catch (err) {
        console.error('Flush hatasi:', err)
    }
}

export const startBuffer = () => {
    setInterval(flush, FLUSH_INTERVAL)
    console.log('Write buffer başlatildi')
}