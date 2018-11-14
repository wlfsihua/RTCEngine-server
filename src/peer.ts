import { EventEmitter } from 'events'

import Room from './room'
import config from './config'
import Logger from './logger'


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


    constructor(peerId: string) {
        super()

        this.peerId = peerId
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

    public init(remoteSdp:string, planb:boolean,localSdp:string,room: Room) {

        this.room = room

        const offer = SDPInfo.process(remoteSdp)

        this.usePlanB = planb

        this.remoteSdp = offer

        this.localSdp = SDPInfo.process(localSdp)
    }

    public close() {

        log.debug('peer close')

        if (this.closed) {
            return
        }

        this.closed = true

        this.incomingStreams.clear()
        this.outgoingStreams.clear()

        this.emit('close')
    }

    public addIncomingStream(streamInfo: any) {

        this.incomingStreams.set(streamInfo.getId(), streamInfo)
        this.remoteSdp.addStream(streamInfo)
    }

    public removeIncomingStream(streamInfo: any) {

        if (this.incomingStreams.get(streamInfo.getId())) {
            this.incomingStreams.delete(streamInfo.getId())
            this.remoteSdp.removeStream(streamInfo)
        }
    }

    public addOutgoingStream(streamInfo: any) {

        this.outgoingStreams.delete(streamInfo.getId())

        this.localSdp.addStream(streamInfo)
    }

    public removeOutgoingStream(streamInfo:any) {

        if (this.outgoingStreams.get(streamInfo.getId())) {
            this.outgoingStreams.delete(streamInfo.getId())
            this.localSdp.removeStream()
        }
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
