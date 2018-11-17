import { EventEmitter } from 'events'

import Room from './room'
import config from './config'
import Logger from './logger'
import Channel from './channel'


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

const log = new Logger('peer')

class Peer extends EventEmitter {

    private usePlanB: boolean = true
    private peerId: string
    private roomId: string
    private closed: boolean = false
    // after Unified Plan is supported, we should set bitrate for every mediasource
    private bitrate: number = 0
    private room: Room

    private incomingStreams: Map<string, any> = new Map()
    private outgoingStreams: Map<string, any> = new Map()

    private localSdp: any
    private remoteSdp: any
    private internal:any
    private channel:Channel

    constructor(peerId: string, channel:Channel,internal:any) {
        super()

        this.peerId = peerId
        this.internal = internal
        this.channel = channel

    }

    public getId() {
        return this.peerId
    }

    public getLocalSDP() {
        return this.localSdp
    }
    
    public getRemoteSDP() {
        return this.remoteSdp
    }

    public getIncomingStreams(): Map<string, any> {
        return this.incomingStreams
    }

    public getOutgoingStreams(): Map<string, any> {
        return this.outgoingStreams
    }


    public async join(room:Room, sdp:string) {

        this.remoteSdp = SDPInfo.process(sdp)

        this.room = room

        const data = {
            room:room.getId(),
            peer:this.peerId,
            name: 'join',
            data: {
                sdp: sdp
            }
        }

        const ret = await this.channel.request(data)

        this.localSdp = SDPInfo.process(ret.sdp)
    }

    public async close() {

        log.debug('peer close')

        if (this.closed) {
            return
        }

        this.closed = true

        this.incomingStreams.clear()
        this.outgoingStreams.clear()

        const data = {
            room: this.room.getId(),
            peer: this.peerId,
            name: 'leave'
        }

        await this.channel.request( data)

        this.emit('close')
    }

    public async addIncomingStream(streamInfo: any) {

        this.incomingStreams.set(streamInfo.getId(), streamInfo)
        this.remoteSdp.addStream(streamInfo)

        const data = {
            room: this.room.getId(),
            peer: this.peerId,
            name: 'addStream',
            data : {
                sdp: this.remoteSdp.toString(),
                stream: {
                    streamId: streamInfo.getId()
                }
            }
        }

        await this.channel.request(data)

    }

    public async removeIncomingStream(streamInfo: any) {

        if (!this.incomingStreams.get(streamInfo.getId())) {
            return
        }

        this.incomingStreams.delete(streamInfo.getId())
        this.remoteSdp.removeStream(streamInfo)

        const data = {
            room: this.room.getId(),
            peer: this.peerId,
            name: 'removeStream',
            data: {
                stream: {
                    streamId: streamInfo.getId()
                }
            }
        }

        await this.channel.request(data)
    }

    public addOutgoingStream(streamInfo: any) {

        this.outgoingStreams.set(streamInfo.getId(), streamInfo)
        this.localSdp.addStream(streamInfo)
        this.emit('renegotiationneeded', streamInfo)
    }

    public removeOutgoingStream(streamInfo:any) {

        if (this.outgoingStreams.get(streamInfo.getId())) {
            this.outgoingStreams.delete(streamInfo.getId())
            this.localSdp.removeStream(streamInfo)
            this.emit('renegotiationneeded', streamInfo)
        }
    }

    public async muteRemote(streamId:string, trackId: string, muting:boolean) {

        const data = {
            room: this.room.getId(),
            peer: this.peerId,
            name: 'muteRemote',
            data: {
                muting: muting,
                streamId: streamId,
                trackId: trackId
            }
        }

        await this.channel.request(data)
    }

    public dumps(): any {

        const incomingStreams = Array.from(this.incomingStreams.values())
        const streams = incomingStreams.map((stream) => {
            return {
                id: stream.getId(),
                bitrate: this.room.getBitrate(stream.getId()),
                attributes: this.room.getAttribute(stream.getId())
            }
        })

        const info = {
            id: this.peerId,
            streams: streams
        }
        return info
    }
}

export default Peer
