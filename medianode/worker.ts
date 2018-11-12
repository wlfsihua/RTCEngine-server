

import io from 'socket.io-client'
import { EventEmitter } from 'events'

const MediaServer = require('medooze-media-server')

class Worker extends EventEmitter {

    private params:any
    private socket:SocketIOClient.Socket

    constructor(params:any){
        super()

        this.params = params

        this.socket = io.connect(params.uri,{
            reconnection:true,
            reconnectionAttempts:5,
            reconnectionDelay:1000,
            transports:['websocket'],
            query: {
                aa:'aa'
            }
        })

        this.socket.on('connect', async () => {
            console.log('connect', this.socket.id)
        })

        this.socket.on('disconnect', async () => {
            console.log('disconnect')
        })

        this.socket.on('message', async (data) => {

        })
    }

    async handleMessage(data:any, callback?:Function) {


    }

}