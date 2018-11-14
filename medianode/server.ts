import * as dotenv from 'dotenv'
import * as ip from 'ip'

dotenv.config()

import Worker from './worker'

const worker = new Worker({
    port: process.env.PORT ? parseInt(process.env.PORT) : 4000,
    endpoint: process.env.ENDPOINT || ip.address()
})

