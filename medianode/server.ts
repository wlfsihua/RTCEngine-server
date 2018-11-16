import * as dotenv from 'dotenv'

dotenv.config()

import Worker from './worker'

console.log(process.env)

const worker = new Worker({
    uri: process.env.URI || 'http://localhost:3888/media',
    endpoint: process.env.ENDPOINT || '127.0.0.1'
})

