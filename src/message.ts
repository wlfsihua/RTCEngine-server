


const randomstring = require('randomstring')

class Message {
    id:string
    type:string
    room:string
    peer:string
    data:any


    toJSON():any
    {
        return {
            id: this.id,
            room: this.room,
            peer: this.peer,
            type: this.type,
            data: this.data
        }
    }

    static messageFactory(params:any): Message {
            
        let message = new Message()
        message.id = params.id ? params.id : randomstring.generate(10)
        message.peer = params.peer
        message.room = params.room
        message.type = params.type
        message.data = params.data || {}

        return message
    }
}

export default Message


