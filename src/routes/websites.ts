import { FastifyInstance } from 'fastify'
import { db } from '../db/index'
import { websites } from '../db/schema'
import { z } from 'zod'

const createWebsiteSchema = z.object({
    name: z.string().min(1),
    domain: z.string().min(1)
})

export const websiteRoutes = async (app: FastifyInstance) => {

    app.post('/api/websites', async (request, reply) => {
        try {
            const body = createWebsiteSchema.parse(request.body)

            const result = await db.insert(websites).values({
                name: body.name,
                domain: body.domain
            }).returning()

            const website = result[0]

            return {
                id: website.id,
                name: website.name,
                domain: website.domain,
                script: `<script async src="http://localhost:5000/tracker.js" data-website-id="${website.id}" data-api-url="http://localhost:5000"></script>`
            }
        } catch (err) {
            return reply.code(400).send({ error: "geçersiz veri." })
        }
    })

    app.get('/api/websites', async (request, reply) => {
        const result = await db.select().from(websites)
        return result
    })

}