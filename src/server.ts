import { EventEmitter } from 'events'
import * as bodyParser from 'body-parser'
import * as cookieParser from 'cookie-parser'
import * as express from 'express'
import * as path from 'path'
import * as http from 'http'
import * as net from 'net'
import * as cors from 'cors'

const SemanticSDP = require('semantic-sdp')
const StreamInfo = SemanticSDP.StreamInfo


import Room from './room'
import Peer from './peer'
import config from './config'

import apiRouter from './api'
import Channel from './channel'
import SocketServer from './socketserver'
import etc from './etcd'

class Server extends EventEmitter {

    private app: express.Application
    private httpServer: http.Server

    private rooms: Map<string, Room> = new Map()
    private peers: Set<Peer> = new Set()
    private channels: Map<string,Channel> = new Map()
    private socketServer: SocketServer

    constructor(params: any) {
        //create expressjs application
        super()

        this.app = express()

        //configure application
        this.config()

        //add routes
        this.routes()
    }

    public start(port: number, hostname: string, callback?: Function) {

        this.httpServer = this.app.listen(port, hostname, callback)

        etc.registerService()

        this.socketServer = new SocketServer(this.httpServer)

        this.socketServer.on('channel', (channel:Channel) => {
            this.addChannel(channel)
        })
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
    }

    private routes() {
        this.app.use(apiRouter)
    }

    public getRooms(): Room[] {
        return Array.from(this.rooms.values())
    }

    public getRoom(roomId: string): Room {
        return this.rooms.get(roomId)
    }

    public Room(roomId: string):Room {

        const internal = {}

        // get a random medianode
        let random = Math.floor(Math.random() * this.channels.size)
        const channel = Array.from(this.channels.values())[random]

        const room = new Room(roomId, channel, internal)

        this.rooms.set(room.getId(), room)

        room.on('close', () => {
            this.rooms.delete(room.getId())
        })

        channel.on('close', () => {
            room.close()
        })
        
        const data = {
            room: roomId,
            name: 'newroom',
            data: {
                capabilities: config.media.capabilities
            }
        }
        
        channel.request(data)
            .then((msg) => {
                
            })
            .catch((error) => {
                room.close()
            })
            
        return room
    }

    private addChannel(channel: Channel) {

        // we should close the old one if we have the same name 
        if (this.channels.get(channel.getId())) {
            const oldChannel = this.channels.get(channel.getId())
            oldChannel.close()
        }

        this.channels.set(channel.getId(),channel)

        channel.on('close', () => { this.channels.delete(channel.getId()) })

        channel.on('event', (msg) => {
            if(this.rooms.get(msg.room) && this.rooms.get(msg.room).getPeer(msg.peer)) {
                const peer = this.rooms.get(msg.room).getPeer(msg.peer)

                if (msg.name === 'addOutgoingStream') {
                    const plaininfo = msg.data.stream
                    const streamInfo = StreamInfo.expand(plaininfo)
                    peer.addOutgoingStream(streamInfo)
                }

                if (msg.name === 'removeOutgoingStream') {
                    const plaininfo = msg.data.stream
                    const streamInfo = StreamInfo.expand(plaininfo)
                    peer.removeOutgoingStream(streamInfo)
                }
            }
        })

    }

}


const server = new Server({})

export default server
