
import * as cluster from 'cluster'
import { EventEmitter } from 'events'

import Room from './room'
import Peer from './peer'

import config from '../config'
import Message from '../message'

const MediaServer = require('medooze-media-server')

export default class MediaWorker extends EventEmitter {


    private rooms: Map<string, Room> = new Map()
    private peers: Map<string, Peer> = new Map()
    private endpoint: any
    private worker: cluster.Worker
    private id:number


    constructor(worker:cluster.Worker) {
        super()

        this.endpoint = MediaServer.createEndpoint(config.media.endpoint)
        this.worker = worker
        this.id = worker.id

        worker.on('disconnect', () => {

        })

        worker.on('exit', (code:number, signal:string) => {

        })

        worker.on('listening', (address:cluster.Address) => {

            console.log('listening', address.address, address.port)
        })

        worker.on('online', () => {

            console.log('online ', worker.id)
        })

        worker.on('message', async (mess:any) => {

            let message = Message.messageFactory(mess)

            if (message.type === 'newpeer') {

                const peer = new Peer(message.peer,this)
                this.peers.set(peer.getId(), peer)

                peer.on('close', () => {
                    this.peers.delete(peer.getId())
                })
            }

            let peer = this.peers.get(message.peer)
            let room = this.rooms.get(message.room)

            if (message.type === 'join') {

                if(!room) {
                    room = new Room(message.room)
                    this.rooms.set(room.getId(), room)
                }

                peer.init(message.data, room)

                room.addPeer(peer)

                const streams = room.getStreams()

                for (let stream of streams) {
                    peer.addOutgoingStream(stream, false)
                }

                let reply = Message.messageFactory({
                    room: room.getId(),
                    peer: peer.getId(),
                    type: 'joined',
                    data: {
                        sdp: peer.getLocalSdp().toString(),
                        
                    }
                })

            }

            if (message.type === 'addStream') {

            }

            if (message.type === 'removeStream') {

            }

            if (message.type === 'configure') {

            }

            if (message.type === 'leave') {

            }

        })

    }

    public getEndpoint() {
        return this.endpoint
    }

    public run() {

    }

}