"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
exports.errorHandler = (0, fastify_plugin_1.default)(async (fastify) => {
    fastify.setErrorHandler((error, request, reply) => {
        fastify.log.error(error);
        if (error.validation) {
            return reply.status(400).send({
                error: 'Geçersiz veri',
                details: error.validation
            });
        }
        reply.status(error.statusCode ?? 500).send({
            error: error.message ?? 'Sunucu hatasi'
        });
    });
});
