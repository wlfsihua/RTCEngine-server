import { EventEmitter } from 'events'
import * as io from 'socket.io-client'
import Message from './message'

class Channel extends EventEmitter {

    private socket:SocketIOClient.Socket

    constructor(socket:SocketIOClient.Socket) {
        super()

        this.socket = socket
        this.socket.on('channel', (data:any) => {
            if (data.id) {
                const message = Message.messageFactory(data)
                this.emit('request', message)
            } else {
                this.emit('message', data)
            }
        })
    }

    send(message:Message) {
        this.socket.emit('channel', message.toJSON())
    }
    
    close() {
        this.socket.close()
        this.emit('close')
    }
}

export default Channel
