
import os  from 'os'
import io from 'socket.io-client'
import { EventEmitter } from 'events'
import Room from './room'
import Peer from './peer'
import Message from './message'

const SemanticSDP = require('semantic-sdp')

const SDPInfo = SemanticSDP.SDPInfo
const MediaInfo = SemanticSDP.MediaInfo
const CandidateInfo = SemanticSDP.CandidateInfo
const DTLSInfo = SemanticSDP.DTLSInfo
const ICEInfo = SemanticSDP.ICEInfo
const StreamInfo = SemanticSDP.StreamInfo
const TrackInfo = SemanticSDP.TrackInfo
const Direction = SemanticSDP.Direction
const CodecInfo = SemanticSDP.CodecInfo


const MediaServer = require('medooze-media-server')

class Worker extends EventEmitter {

    private params:any
    private socket:SocketIOClient.Socket
    private rooms: Map<string, Room>

    constructor(params:any){
        super()

        this.params = params

        this.socket = io.connect(params.uri,{
            reconnection:true,
            reconnectionAttempts:5,
            reconnectionDelay:1000,
            transports:['websocket'],
            query: {
                worker: os.hostname() + '-media-' + process.pid
            }
        })

        this.socket.on('connect', async () => {
            console.log('connect', this.socket.id)
        })

        this.socket.on('disconnect', async () => {
            console.log('disconnect')

            this.close()
        })

        this.socket.on('message', async (data) => {
            this.handleMessage(data)
        })
    }

    /**
     * 
     * @param msg 
     * @param callback 
     */
    async handleMessage(msg:any, callback?:Function) {

        if (msg.name === 'newroom') {

            const capabilities = msg.data.capabilities

            const room = new Room(msg.room, capabilities, this.params.endpoint)
            this.rooms.set(room.getId(), room)

            room.on('close', () => {
                this.rooms.delete(room.getId())
            })

            callback(Message.reply(msg).toJSON())
            return
        } 


        const room = this.rooms.get(msg.room)

        if (!room) {
            callback(Message.error(msg,'can not find room').toJSON())
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

            callback(Message.reply(msg).toJSON())

            peer.on('renegotiationneeded', (outgoingStream) => {

                this.socket.emit('message', {
                    type: 'event',
                    room: room.getId(),
                    peer: peer.getId(),
                    name: 'offer',
                    data: {
                        sdp: peer.getLocalSDP().toString(),
                        room: room.dumps()
                    }
                })

            })

            return
        }

        const peer = room.getPeer(msg.peer)

        if (!peer) {
            callback(Message.error(msg,'can not find peer').toJSON())
            return
        }

        if (msg.name === 'addStream') {

            const sdp = SDPInfo.process(msg.data.sdp)
            const streamId = msg.data.stream.streamId
            const streamInfo = sdp.getStream(streamId)

            peer.addStream(streamInfo)

            callback(Message.reply(msg).toJSON())

            return
        }

        if (msg.name === 'removeStream') {

            const streamId = msg.data.stream.streamId
            
            const stream = peer.getIncomingStreams().get(streamId)

            peer.removeStream(stream.getStreamInfo())

            callback(Message.reply(msg).toJSON())

            return
        }

        if (msg.name === 'muteRemote') {

            const streamId = msg.data.stream.streamId

            const outgoingStream = peer.getOutgoingStreams().get(streamId)

            if (!outgoingStream) {
                callback(Message.error(msg,'can not find streamId' + streamId).toJSON())
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

            callback(Message.reply(msg).toJSON())

            return
        }

        if (msg.name === 'leave') {

            peer.close()
            callback(Message.reply(msg).toJSON())
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