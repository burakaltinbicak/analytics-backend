"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimitMiddleware = void 0;
const rate_limit_1 = __importDefault(require("@fastify/rate-limit"));
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
exports.rateLimitMiddleware = (0, fastify_plugin_1.default)(async (app) => {
    await app.register(rate_limit_1.default, {
        max: 100000000000,
        timeWindow: '1 minute'
    });
});
