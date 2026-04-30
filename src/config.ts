import { z } from 'zod'
import dotenv from 'dotenv'
dotenv.config()

const envSchema = z.object({
    DATABASE_URL: z.string().url(),
    PORT: z.coerce.number().default(5000),
    API_URL: z.string().url()
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
    console.error('❌ Geçersiz environment variables:', parsed.error.format())
    process.exit(1)
}

export const config = parsed.data