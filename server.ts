import * as program from 'commander'
import * as dotenv from 'dotenv'


dotenv.config()

import server from './src/server'

const port = process.env.PORT ? parseInt(process.env.PORT) :3888
const host = process.env.HOST ? process.env.HOST : '127.0.0.1'


server.start(port, host, () => {
    console.log('start')
})





