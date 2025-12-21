import type { Context, Env } from 'hono'
import type { AddressInfo } from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from '#root/common/config'
import { requestLogger } from '#root/backend/middlewares/requestLogger'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { bearerAuth } from 'hono/bearer-auth'
import { cors } from 'hono/cors'
import { HTTPException } from 'hono/http-exception'
import { prettyJSON } from 'hono/pretty-json'
import { getPath } from 'hono/utils/url'
import { createServer as createViteServer } from 'vite'
import { loggerMiddleware } from './middlewares/logger'
import { requestId } from './middlewares/requestId'

export async function createServer() {
    const server = new Hono<Env>()

    server.use(requestId())
    server.use(loggerMiddleware())

    if (config.isDev) {
        server.use(requestLogger())
    }

    server.onError(async (error: any, c: Context) => {
        if (error instanceof HTTPException) {
            if (error.status < 500) {
                c.var.logger.info(error)
            } else {
                c.var.logger.error(error)
            }
            return error.getResponse()
        }
        // unexpected error
        c.var.logger.error({
            err: error,
            method: c.req.raw.method,
            path: getPath(c.req.raw),
        })
        return c.json({ error: 'Oops! Something went wrong.' }, 500)
    })

    const api = new Hono<Env>()
    api.use('/*', cors({ origin: '*' }))
    // if (!config.isDev) {
    //     api.use('/*', bearerAuth({ verifyToken }))
    // }
    api.use('/*', prettyJSON())
    // api.get('/status', c => statusHandler(c))
    server.route('/api', api)

    if (config.isDev) {
        const __filename = fileURLToPath(import.meta.url)
        const __dirname = path.dirname(__filename)
        const frontendPath = path.join(__dirname, 'frontend')
        const vite = await createViteServer({
            root: frontendPath,
            server: { middlewareMode: true },
        })

        server.use('*', async (c, next) => {
            if (c.req.path.startsWith('/api')) {
                return next()
            }
            const html = await vite.transformIndexHtml(
                c.req.path,
                '<!DOCTYPE html><html><head></head><body></body></html>',
            )
            return c.html(html)
        })
    } else {
        server.use('/*', serveStatic({ path: './src/server/frontend/dist/index.html' }))
    }

    return server
}

export type Server = Awaited<ReturnType<typeof createServer>>

export function createServerManager(server: Server) {
    let handle: undefined | ReturnType<typeof serve>
    return {
        start: (host: string, port: number) =>
            new Promise<AddressInfo>((resolve) => {
                handle = serve(
                    {
                        fetch: server.fetch,
                        hostname: host,
                        port,
                    },
                    info => resolve(info),
                )
            }),
        stop: () =>
            new Promise<void>((resolve) => {
                if (handle)
                    handle.close(() => resolve())
                else
                    resolve()
            }),
    }
}
