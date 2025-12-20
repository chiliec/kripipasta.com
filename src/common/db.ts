import { config } from '#root/common/config'
import { logger } from '#root/common/logger'
import mongoose from 'mongoose'

let isConnected = false
let isConnecting = false

export async function connectDb(timeout = 10_000): Promise<mongoose.Connection['db']> {
    if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
        return mongoose.connection.db
    }

    if (isConnected) {
        return mongoose.connection.db
    }

    if (!isConnecting) {
        isConnecting = true
        try {
            const connectionString = config.MONGO
            try {
                await mongoose.connect(connectionString)
            } catch (error: unknown) {
                throw new Error(`Failed to connect to MongoDB: ${error instanceof Error ? error.message : String(error)}`)
            }

            isConnected = true
            logger.debug('MongoDB connected successfully')
        } catch (error) {
            logger.error(`Error connecting to MongoDB: ${error instanceof Error ? error.message : error}`)
            isConnected = false
            throw error
        } finally {
            isConnecting = false
        }

        mongoose.connection.on('error', (error) => {
            logger.error('MongoDB connection error:', error)
        })

        mongoose.connection.on('disconnected', () => {
            logger.warn('MongoDB disconnected')
            isConnected = false
        })
    }

    // Ждём максимум timeout мс, пока соединение станет готовым
    const start = Date.now()
    while (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
        if (Date.now() - start > timeout) {
            throw new Error('MongoDB connection timeout')
        }
        await new Promise(resolve => setTimeout(resolve, 100))
    }

    return mongoose.connection.db
}

export async function disconnectDb() {
    await mongoose.disconnect()
}
