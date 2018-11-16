import { EventEmitter } from 'events'
import Room from './room'
import Peer from './peer'
import Message from './message'
import Channel from './channel'
import * as io from 'socket.io-client'
import * as os  from 'os'

const SemanticSDP = require('semantic-sdp')
const SDPInfo = SemanticSDP.SDPInfo

class Worker extends EventEmitter {

    private params:any
    private rooms: Map<string, Room>
    private publicTopic: string
    private channel:Channel

    constructor(params:any){
        super()

        this.params = params

        this.rooms = new Map()

        const socket = io(params.uri, {
            transports: ['websocket'],
            query: {
                id : os.hostname() + 'medianode' + process.pid
            }
        })

        socket.on('disconnect', () => {
            this.close()
        })

        socket.on('connect', () => {
            console.log('connected to remote server')
        })

        this.channel = new Channel(socket)

        this.channel.on('request', async (msg:Message) => {
            this.handleMessage(msg)
        })

    }
    /**
     * 
     * @param msg 
     * @param callback 
     */
    async handleMessage(msg:Message) {

        console.dir(msg)

        if (msg.name === 'newroom') {
            const capabilities = msg.data.capabilities

            const room = new Room(msg.room, capabilities, this.params.endpoint)
            this.rooms.set(room.getId(), room)

            room.on('close', () => {
                this.rooms.delete(room.getId())
            })

            this.channel.send(Message.reply(msg,{}))
            return
        } 

        const room = this.rooms.get(msg.room)

        if (!room) {
            this.channel.send(Message.error(msg,'can not find room'))
            return 
        }

        if (msg.name === 'removeroom') {
            room.close()
            this.channel.send(Message.reply(msg))
            return
        }

        if (msg.name === 'join') {
            
            const peer = new Peer(msg.peer)
            const sdp = msg.data.sdp

            room.addPeer(peer)

            peer.init(sdp, room)

            const streams = room.getIncomingStreams()

            for (let stream of streams.values()) {
                peer.addOutgoingStream(stream)
            }

            this.channel.send(Message.reply(msg, {sdp: peer.getLocalSDP().toString()}))

            peer.on('addOutgoingStream', (outgoingStream) => {

                const message = Message.event({
                    room: room.getId(),
                    peer: peer.getId(),
                    name: 'addOutgoingStream',
                    data: {
                        stream: outgoingStream.getStreamInfo().plain()
                    }
                })
                this.channel.send(message)
            })

            peer.on('removeOutgoingStream', (outgoingStream) => {

                const message = Message.event({
                    room: room.getId(),
                    peer: peer.getId(),
                    name: 'removeOutgoingStream',
                    data: {
                        stream: outgoingStream.getStreamInfo().plain()
                    }
                })
                console.log('removeOutgoingStream =============================')
                console.dir(message)
                this.channel.send(message)
            })

            return
        }

        const peer = room.getPeer(msg.peer)

        if (!peer) {
            this.channel.send(Message.error(msg,'can not find peer'))
            return
        }

        if (msg.name === 'addStream') {
            const sdp = SDPInfo.process(msg.data.sdp)
            const streamId = msg.data.stream.streamId
            const streamInfo = sdp.getStream(streamId)
            peer.addStream(streamInfo)
            this.channel.send(Message.reply(msg))
            return
        }

        if (msg.name === 'removeStream') {

            const streamId = msg.data.stream.streamId
            const stream = peer.getIncomingStreams().get(streamId)
            peer.removeStream(stream.getStreamInfo())
            this.channel.send(Message.reply(msg))
            return
        }

        if (msg.name === 'muteRemote') {

            const streamId = msg.data.stream.streamId
            const outgoingStream = peer.getOutgoingStreams().get(streamId)

            if (!outgoingStream) {
                this.channel.send(Message.error(msg,'can not find streamId' + streamId))
                return
            }

            if ('video' in msg.data) {
                let muting = msg.data.muting
                for (let track of outgoingStream.getVideoTracks()) {
                    track.mute(muting)
                }
            }

            if ('audio' in msg.data) {
                let muting = msg.data.muting

                for (let track of outgoingStream.getAudioTracks()) {
                    track.mute(muting)
                }
            }

            this.channel.send(Message.reply(msg))
            return
        }

        if (msg.name === 'leave') {
            this.channel.send(Message.reply(msg))
            peer.close()
            return
        }
    }

    close() {

        for(let room of this.rooms.values()) {
            room.close()
        }

        this.rooms.clear()

    }
}

export default Worker