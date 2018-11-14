
import * as NATS from 'nats'
import { EventEmitter } from 'events'

import * as randomstring from 'randomstring'


interface Message {
    transaction?: string
    data: any
    resolve?: any
    reject?: any
    expire?:number 
}


class NClient extends EventEmitter {

    private nats:NATS.Client
    private requestMap: Map<string,Message> = new Map()
    private subTopic:string

    constructor(subTopic:string) {
        super()

        this.nats = NATS.connect({
            reconnect:true
        })

        this.subTopic = subTopic

        this.nats.subscribe(this.subTopic, async (msg) => {
            msg = JSON.parse(msg)
            if (msg.id) {
                const message = this.requestMap.get(msg.id)
                if(message) {
                    this.requestMap.delete(msg.id)
                    message.resolve(msg.data)
                }
            } else {
                this.emit('event', msg)
            }
        })
    }
    async request(node:string,room:string,peer:string,name:string, data:any) {

        return new Promise((resolve:(data:any) => void,reject) => {
            const uid = randomstring.generate(12)
            const message:Message = {
                transaction:uid,
                expire: Date.now() + 10000,
                data: {
                    id:uid,
                    room:room,
                    peer:peer,
                    type:'message',
                    name:name,
                    data: data || {}
                }
            }
            message.resolve = resolve
            message.reject = reject

            this.requestMap.set(uid, message)

            this.nats.publish(node, JSON.stringify(message.data), () => {
            })
        })

    }
}

export default NClient



