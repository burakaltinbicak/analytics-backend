import fp from 'fastify-plugin'
import cors from '@fastify/cors'

export const corsMiddleware = fp(async (app) => {
    await app.register(cors, {
        origin: '*'
    })
})