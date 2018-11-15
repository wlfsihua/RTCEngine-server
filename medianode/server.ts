import * as dotenv from 'dotenv'
import * as ip from 'ip'

dotenv.config()

import Worker from './worker'

const worker = new Worker({
    endpoint: process.env.ENDPOINT || ip.address()
})

