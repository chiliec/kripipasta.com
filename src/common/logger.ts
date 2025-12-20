import { config } from '#root/common/config'
// import { setLogLevel } from '@typegoose/typegoose'
import { pino, stdSerializers } from 'pino'

// setLogLevel('debug')

export const logger = pino({
    level: config.LOG_LEVEL,
    serializers: {
        err: stdSerializers.err,
    },
    transport: {
        targets: [
            ...(config.isDev
                ? [
                        {
                            target: 'pino-pretty',
                            level: config.LOG_LEVEL,
                            options: {
                                ignore: 'pid,hostname',
                                colorize: false,
                                translateTime: true,

                            },
                        },
                    ]
                : [
                        {
                            target: 'pino-pretty',
                            level: 'error',
                            options: {
                                ignore: 'pid,hostname',
                                colorize: false,
                                translateTime: true,

                            },
                        },
                        {
                            target: 'pino/file',
                            level: config.LOG_LEVEL,
                            options: {},
                        },
                    ]),
        ],
    },
})

export type Logger = typeof logger
