


const randomstring = require('randomstring')

class Message {
    id: string
    peer: string
    room: string
    type: string
    name: string
    data: any

    toJSON(): any {
        return {
            id: this.id,
            peer: this.peer,
            room: this.room,
            name: this.name,
            type: this.type,
            data: this.data
        }
    }
    
    static parse(raw: string): Message {
        let message: Message = new Message()
        let object = JSON.parse(raw)
        message.id = object.id
        message.peer = object.peer
        message.room = object.room
        message.type = object.type
        message.name = object.name
        message.data = object.data || {}
        return message
    }

    static messageFactory(params: any): Message {

        let message = new Message()
        message.id = params.id ? params.id : randomstring.generate(10)
        message.peer = params.peer
        message.room = params.room
        message.type = params.type
        message.name = params.name
        message.data = params.data || {}

        return message
    }

    static reply(message:any, data?:any): Message {
        let msg = new Message()
        msg.id = message.id
        msg.peer = message.peer
        msg.room = message.room
        msg.name = message.name
        msg.type = 'response'
        msg.data = data || {}
        return msg
    }

    static error(message:any,error?:string): Message {

        let msg = new Message()
        msg.id = message.id
        msg.peer = message.peer
        msg.room = message.room
        msg.name = message.name
        msg.type = 'error'
        msg.data = {
            error: error
        }
        return msg
    } 
}

export default Message


