import fp from 'fastify-plugin'
import { FastifyInstance, FastifyError } from 'fastify'

export const errorHandler = fp(async (fastify: FastifyInstance) => {
    fastify.setErrorHandler((error: FastifyError, request, reply) => {
        fastify.log.error(error)

        if (error.validation) {
            return reply.status(400).send({
                error: 'Geçersiz veri',
                details: error.validation
            })
        }

        reply.status(error.statusCode ?? 500).send({
            error: error.message ?? 'Sunucu hatasi'
        })
    })
})