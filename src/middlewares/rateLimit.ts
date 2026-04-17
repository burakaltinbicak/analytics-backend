import { FastifyInstance } from 'fastify'
import rateLimit from '@fastify/rate-limit'
import fp from 'fastify-plugin'

export const rateLimitMiddleware = fp(async (app: FastifyInstance) => {
    await app.register(rateLimit, {
        max: 10000000000,
        timeWindow: '1 minute'
    })
})