import * as SocketServer from 'socket.io'
import { EventEmitter } from 'events'
import Room from './room'
import Peer from './peer'
import Message from './message'

const SemanticSDP = require('semantic-sdp')

import * as NATS from 'nats'
import * as os  from 'os'

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
    private rooms: Map<string, Room>
    private nats: NATS.Client
    private publicTopic: string

    constructor(params:any){
        super()

        this.params = params

        this.rooms = new Map()

        this.publicTopic = params.publicTopic || 'nave'

        this.nats = NATS.connect({
            reconnect:true
        })

        //const subTopic = os.hostname() + 'medianode' + process.pid

        const subTopic = 'medianode'

        this.nats.subscribe(subTopic, async (msg) => {
            msg = JSON.parse(msg)
            console.log('receive ===============')
            console.dir(msg)
            
            this.handleMessage(msg)
        })

    }

    /**
     * 
     * @param msg 
     * @param callback 
     */
    async handleMessage(msg:any) {

        console.dir(msg)

        if (msg.name === 'newroom') {
            const capabilities = msg.data.capabilities

            const room = new Room(msg.room, capabilities, this.params.endpoint)
            this.rooms.set(room.getId(), room)

            room.on('close', () => {
                this.rooms.delete(room.getId())
            })

            this.nats.publish(this.publicTopic, Message.reply(msg, {}).toString())
            return
        } 

        const room = this.rooms.get(msg.room)

        if (!room) {
            this.nats.publish(this.publicTopic,Message.error(msg,'can not find room').toString())
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

            this.nats.publish(this.publicTopic, Message.reply(msg, {
                sdp: peer.getLocalSDP().toString()
            }).toString())

            peer.on('addOutgoingStream', (outgoingStream) => {

                console.log('addOutgoingStream')
                console.dir(outgoingStream.getStreamInfo())

                this.nats.publish(this.publicTopic, JSON.stringify({
                    type: 'event',
                    room: room.getId(),
                    peer: peer.getId(),
                    name: 'addOutgoingStream',
                    data: {
                        stream: outgoingStream.getStreamInfo().plain()
                    }
                }))
            })

            peer.on('removeOutgoingStream', (outgoingStream) => {

                console.log('removeOutgoingStream')
                console.dir(outgoingStream.getStreamInfo())

                this.nats.publish(this.publicTopic, JSON.stringify({
                    type: 'event',
                    room: room.getId(),
                    peer: peer.getId(),
                    name: 'removeOutgoingStream',
                    data: {
                        stream: outgoingStream.getStreamInfo().plain()
                    }
                }))
            })

            return
        }

        const peer = room.getPeer(msg.peer)

        if (!peer) {
            this.nats.publish(this.publicTopic,Message.error(msg,'can not find peer').toString())
            return
        }

        if (msg.name === 'addStream') {

            const sdp = SDPInfo.process(msg.data.sdp)
            const streamId = msg.data.stream.streamId
            const streamInfo = sdp.getStream(streamId)
            peer.addStream(streamInfo)
            this.nats.publish(this.publicTopic,Message.reply(msg).toString())
            return
        }

        if (msg.name === 'removeStream') {

            const streamId = msg.data.stream.streamId
            const stream = peer.getIncomingStreams().get(streamId)
            peer.removeStream(stream.getStreamInfo())
            this.nats.publish(this.publicTopic, Message.reply(msg).toString())
            return
        }

        if (msg.name === 'muteRemote') {

            const streamId = msg.data.stream.streamId

            const outgoingStream = peer.getOutgoingStreams().get(streamId)

            if (!outgoingStream) {
                this.nats.publish(this.publicTopic, Message.error(msg,'can not find streamId' + streamId).toString())
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

            this.nats.publish(this.publicTopic, Message.reply(msg).toString())
            return
        }

        if (msg.name === 'leave') {
            this.nats.publish(this.publicTopic,Message.reply(msg).toString())
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