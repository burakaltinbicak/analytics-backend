import { pgTable, uuid, text, timestamp, jsonb } from 'drizzle-orm/pg-core'

export const websites = pgTable('websites', {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    domain: text('domain').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull()
})

export const sessions = pgTable('sessions', {
    id: uuid('id').defaultRandom().primaryKey(),
    website_id: uuid('website_id').notNull().references(() => websites.id),
    referrer: text('referrer'),
    language: text('language'),
    screen: text('screen'),
    country: text('country'),
    browser: text('browser'),
    os: text('os'),
    device: text('device'),
    createdAt: timestamp('created_at').defaultNow().notNull()
})

export const events = pgTable('events', {
    id: uuid('id').defaultRandom().primaryKey(),
    website_id: uuid('website_id').notNull().references(() => websites.id),
    session_id: uuid('session_id').notNull().references(() => sessions.id),
    eventname: text('eventname').notNull(),
    url_path: text('url_path').notNull(),
    event_data: jsonb('event_data'),
    createdAt: timestamp('created_at').defaultNow().notNull()
})