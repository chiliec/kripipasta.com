import process from 'node:process'
import { parseEnv, z } from 'znv'
import 'dotenv/config'

function createConfigFromEnvironment(environment: NodeJS.ProcessEnv) {
    const config = parseEnv(environment, {
        NODE_ENV: z.enum(['development', 'production']),
        LOG_LEVEL: z
            .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent'])
            .default('info'),
        MONGO: z.string(),
        SERVER_HOST: z.string().default('0.0.0.0'),
        SERVER_PORT: z.number().default(3000),
    })

    return {
        ...config,
        isDev: process.env.NODE_ENV === 'development',
    }
}

export type Config = ReturnType<typeof createConfigFromEnvironment>

export const config = createConfigFromEnvironment(process.env)
