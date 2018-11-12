import dotenv from 'dotenv'
import ip from 'ip'

dotenv.config()

import Worker from './worker'

const worker = new Worker({
    uri: process.env.URI || 'http://localhost:3888/',
    endpoint: process.env.ENDPOINT || ip.address()
})

