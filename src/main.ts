import process from 'node:process'
import { config } from '#root/common/config'
import { connectDb } from '#root/common/db'
import { logger } from '#root/common/logger'
import { createServer, createServerManager } from '#root/server/server'

function onShutdown(cleanUp: () => Promise<void>) {
    let isShuttingDown = false
    const handleShutdown = async () => {
        if (isShuttingDown) {
            return
        }
        isShuttingDown = true
        logger.info('Shutdown')
        await cleanUp()
    }
    process.on('SIGINT', handleShutdown)
    process.on('SIGTERM', handleShutdown)
}

async function startServer() {
    const server = await createServer()
    const serverManager = createServerManager(server)

    onShutdown(async () => {
        await serverManager.stop()
        throw new Error('Shutdown complete')
    })

    const info = await serverManager.start(
        config.SERVER_HOST,
        config.SERVER_PORT,
    )
    logger.info({
        msg: '🐷 Server started',
        url: info.family === 'IPv6'
            ? `http://[${info.address}]:${info.port}`
            : `http://${info.address}:${info.port}`,
    })
}

async function initialize() {
    try {
        logger.info('🔌 Initializing server...')
        await connectDb()
        await startServer()
    } catch (error) {
        logger.error(`Error in main try block: ${(error as Error)?.message}`)
        process.exit(1)
    }
}

initialize()
