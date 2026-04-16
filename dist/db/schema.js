"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.events = exports.sessions = exports.websites = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.websites = (0, pg_core_1.pgTable)('websites', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    name: (0, pg_core_1.text)('name').notNull(),
    domain: (0, pg_core_1.text)('domain').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull()
});
exports.sessions = (0, pg_core_1.pgTable)('sessions', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    website_id: (0, pg_core_1.uuid)('website_id').notNull().references(() => exports.websites.id),
    referrer: (0, pg_core_1.text)('referrer'),
    language: (0, pg_core_1.text)('language'),
    screen: (0, pg_core_1.text)('screen'),
    country: (0, pg_core_1.text)('country'),
    browser: (0, pg_core_1.text)('browser'),
    os: (0, pg_core_1.text)('os'),
    device: (0, pg_core_1.text)('device'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull()
});
exports.events = (0, pg_core_1.pgTable)('events', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    website_id: (0, pg_core_1.uuid)('website_id').notNull().references(() => exports.websites.id),
    session_id: (0, pg_core_1.uuid)('session_id').notNull().references(() => exports.sessions.id),
    eventname: (0, pg_core_1.text)('eventname').notNull(),
    url_path: (0, pg_core_1.text)('url_path').notNull(),
    event_data: (0, pg_core_1.jsonb)('event_data'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull()
});
