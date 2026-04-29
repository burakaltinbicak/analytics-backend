import { FastifyInstance } from 'fastify'
import { getHeatmapData } from '../services/heatmap.service'

export const heatmapRoutes = async (app: FastifyInstance) => {
    app.get('/api/websites/:id/heatmap', async (request, reply) => {
        const { id } = request.params as { id: string }
        const { urlPath } = request.query as { urlPath?: string }

        const data = await getHeatmapData(id, urlPath)
        return data
    })
}