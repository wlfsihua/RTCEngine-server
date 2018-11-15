import { EventEmitter } from 'events'
import * as bodyParser from 'body-parser'
import * as cookieParser from 'cookie-parser'
import * as express from 'express'
import * as path from 'path'
import * as http from 'http'
import * as net from 'net'
import * as cors from 'cors'

const SemanticSDP = require('semantic-sdp')

const SDPInfo = SemanticSDP.SDPInfo
const MediaInfo = SemanticSDP.MediaInfo
const CandidateInfo = SemanticSDP.CandidateInfo
const DTLSInfo = SemanticSDP.DTLSInfo
const ICEInfo = SemanticSDP.ICEInfo
const StreamInfo = SemanticSDP.StreamInfo


import Room from './room'
import Peer from './peer'
import config from './config'

import apiRouter from './api'
import socketHandle from './signalling'

import NClient from './channel'

class Server extends EventEmitter {

    private app: express.Application
    private httpServer: http.Server

    private rooms: Map<string, Room> = new Map()
    private peers: Set<Peer> = new Set()
    private channel:NClient 
    private medianode:string


    constructor(params: any) {
        //create expressjs application
        super()

        this.app = express()

        //configure application
        this.config()

        //add routes
        this.routes()

        // medianode 
        this.medianode = 'medianode'

        //channel 
        this.channel = new NClient('nave')

        this.channel.on('event', (msg) => {

            if(this.rooms.get(msg.room) && this.rooms.get(msg.room).getPeer(msg.peer)) {
                const peer = this.getRoom(msg.room).getPeer(msg.peer)
    
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

    public start(port: number, hostname: string, callback?: Function) {

        this.httpServer = this.app.listen(port, hostname, callback)

        this.startSocketServer()

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
        //use router middleware
        this.app.use(apiRouter)
    }

    private startSocketServer() {
        socketHandle.socketServer.attach(this.httpServer)
        socketHandle.setupSocketServer()
    }

    public getRooms(): Room[] {
        return Array.from(this.rooms.values())
    }

    public getRoom(roomId: string): Room {
        return this.rooms.get(roomId)
    }

    public Room(roomId: string):Room {

        // todo, random this  
        const internal = {
            medianode:this.medianode
        }

        const room = new Room(roomId, this.channel, internal)

        this.rooms.set(room.getId(), room)

        room.on('close', () => {
            this.rooms.delete(room.getId())
        })

        const data = {
            room: roomId,
            name: 'newroom',
            data: {
                capabilities: config.media.capabilities
            }
        }

        this.channel.request(this.medianode,data)
            .then((msg) => {

            })
            .catch((error) => {
                room.close()
            }) 

        return room
    }

    public dumps() {
        let info = []
        for (const room of this.rooms.values()) {
            info.push(room.dumps)
        }
        return info
    }
}


const server = new Server({})

export default server
