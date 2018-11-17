import { EventEmitter } from 'events'

import * as randomstring from 'randomstring'


interface ChannelInterface {

}


interface Message {
    transaction?: string
    data: any
    resolve?: any
    reject?: any
    expire?:number 
}

class Channel extends EventEmitter {

    private id:string
    private socket: SocketIO.Socket 
    private requestMap: Map<string,Message> = new Map()

    constructor(id:string,socket:SocketIO.Socket) {
        super()

        this.id = id
        this.socket = socket
        this.socket.on('channel', async (data:any) => {
            if (data.id) {
                const message = this.requestMap.get(data.id)
                if(message) {
                    this.requestMap.delete(data.id)
                    message.resolve(data.data)
                }
            } else {
                this.emit('event', data)
            }
        })

        this.socket.on('disconnect', async () => {
            for (let msg of this.requestMap.values()) {
                msg.reject && msg.reject()
            }
            this.requestMap.clear()
            this.emit('close')
        })
    }
    
    getId(): string {
        return this.id
    }

    async request(data) {

        return new Promise((resolve:(data:any) => void,reject) => {

            const uid = randomstring.generate(12)
            const message:Message = {
                transaction:uid,
                expire: Date.now() + 10000,
                data: {
                    id:uid,
                    room:data.room,
                    peer:data.peer,
                    type:'message',
                    name:data.name,
                    data: data.data || {}
                }
            }
            message.resolve = resolve
            message.reject = reject
            
            this.requestMap.set(uid, message)
            this.socket.emit('channel', message.data)
        })
    }

    close() {
        this.socket.disconnect()
        this.emit('close')
    }
}

export default Channel