import * as bodyParser from 'body-parser'
import * as cookieParser from 'cookie-parser'
import * as express from 'express'
import * as http from 'http'
import * as cors from 'cors'
import * as cluster from 'cluster'
import errorHandler = require('errorhandler')
import methodOverride = require('method-override')

import * as socketio from 'socket.io'

const MediaServer = require('medooze-media-server')

import Room from './room'
import Peer from './peer'
import config from './config'

import apiRouter from './api'
import { EventEmitter } from 'events'


export default class Server extends EventEmitter {

    public app: express.Application
    public endpoint: any
    public rooms: Map<string, Room> = new Map()
    public peers: Map<string, Peer> = new Map()
    public socketServer: socketio.Server
    private httpServer: http.Server


    private _rooms: Map<string, number> = new Map()
    private 

    constructor() {
        //create expressjs application
        super()

        this.app = express()

        // //configure application
        this.config()

        // //add routes
        this.routes()
    }


    private config() {
        //add static paths

        this.app.use(express.static('public'))

        this.app.use(cors())

        //mount json form parser
        this.app.use(bodyParser.json())

        //mount query string parser
        this.app.use(bodyParser.urlencoded({
            extended: true
        }))

        //mount override?
        this.app.use(methodOverride())

        // catch 404 and forward to error handler
        this.app.use(function(err: any, req: express.Request, res: express.Response, next: express.NextFunction) {
            err.status = 404
            next(err)
        })
    }


    private routes() {
        //use router middleware
        this.app.use(apiRouter)
    }

    private startSocketServer() {

        this.socketServer = socketio({
            pingInterval: 10000,
            pingTimeout: 5000,
            transports: ['websocket'] 
        })

        this.socketServer.on('connection', async (socket:SocketIO.Socket) => {

            let peer = new Peer(socket,this)
            this.peers.set(peer.id, peer)

            this.emit('new-peer', peer)

            peer.on('close', () => {
                this.peers.delete(peer.id)
            })
        })

        this.socketServer.attach(this.httpServer)
    }

    private startMediaWorker() {

        this.endpoint = MediaServer.createEndpoint(config.media.endpoint)
        
        console.log('start mediaserver')
    }

    public start(port: number, hostname:string, callback?:Function): Server {


        if (cluster.isMaster) {

            this.httpServer = this.app.listen(port, hostname, callback)

            this.startSocketServer()

            for(let i = 0; i < config.media.numWorkers; i++) {
                cluster.fork()
            }

            cluster.on('exit', (worker:cluster.Worker,code:number, signal:string) => {

                console.log('process exit ', worker.id )
            })

        } else {

            this.startMediaWorker()
        }

        return this
    }

    

    public getRoom(room: string): Room {

        return this.rooms.get(room)
    }

    public addRoom(room: Room, peer:Peer) {

        this.rooms.set(room.getId(), room)

        this.emit('new-room', room, peer)
        
        room.on('close', () => {
            this.rooms.delete(room.getId())
        })
    }

    public dumps() {
        let info = []
        for (const room of this.rooms.values()) {
            info.push(room.dumps)
        }
        return info
    }
}
