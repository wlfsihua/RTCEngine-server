import * as socketio from 'socket.io'
import * as jwt from 'jwt-simple'
import * as http from 'http'
import { EventEmitter } from 'events' 



class SocketServer extends EventEmitter {

    private socketServer: SocketIO.Server

    constructor(httpserver:http.Server) {
        super()

        this.socketServer = socketio({
            pingInterval: 10000,
            pingTimeout: 5000,
            transports: ['websocket']
        })

        this.socketServer.attach(httpserver) 

        this.socketServer.of('/media').on('connection', async (socket: SocketIO.Socket) => {

        })

        this.socketServer.of('/channel').on('connection', async (socket: SocketIO.Socket) => {


        })
        
    }
    
    close() {

    }
}


export default SocketServer