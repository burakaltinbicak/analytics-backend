import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { checkCaches } from '../db/cache'
import { redis } from '../db/redis' // Redis instance'ını buradan aldığımızı varsayıyorum

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

/**
 * Bu fonksiyon artık sadece bir "Postacı".
 * Veriyi alıyor, üstüne IP ve zaman ekleyip Redis kuyruğuna fırlatıyor.
 */
async function processEvent(body: z.infer<typeof toplaSchema>, ip: string) {
    try {
        // Sadece websitesi sistemde kayıtlı mı diye hızlıca bakıyoruz (Redis Cache)
        const { websiteExists } = await checkCaches(body.website_id, body.session_id)
        if (!websiteExists) return

        // HIZIN SIRRI: Veriyi işlemeden (parse etmeden) ham halde kuyruğa atıyoruz.
        // .catch kullanarak 'fire and forget' yapıyoruz, yani cevabı beklemiyoruz.
        redis.lpush('tracking_queue', JSON.stringify({
            ...body,
            ip,
            received_at: Date.now()
        })).catch(err => console.error('Redis Kuyruk Hatası:', err))

    } catch (err) {
        console.error('processEvent HATA:', err)
    }
}

export const toplaRoutes = async (app: FastifyInstance) => {
    // Tekli veri toplama
    app.post('/api/topla', async (request, reply) => {
        const body = toplaSchema.parse(request.body)

        // Await kullanmıyoruz! Veriyi fırlat ve devam et.
        processEvent(body, request.ip)

        return reply.code(200).send({ status: 'ok' })
    })

    // Toplu (Batch) veri toplama
    app.post('/api/topla/batch', async (request, reply) => {
        const body = batchSchema.parse(request.body)

        // Verileri topluca kuyruğa fırlatıyoruz
        body.events.forEach(event => {
            processEvent(event, request.ip)
        })

        return reply.code(200).send({ status: 'ok' })
    })

    // Bu endpoint admin paneli/dashboard içindir, hızı etkilemez.
    app.get('/api/topla', async (request, reply) => {
        // Buradaki db sorguları dashboard için kalabilir.
        return { message: "Bu endpoint sadece dashboard erişimi içindir." }
    })
}