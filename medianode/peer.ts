
import { EventEmitter } from 'events'


const MediaServer = require('medooze-media-server')
const SemanticSDP = require('semantic-sdp')

import Room from './room'

const SDPInfo = SemanticSDP.SDPInfo
const MediaInfo = SemanticSDP.MediaInfo
const CandidateInfo = SemanticSDP.CandidateInfo
const DTLSInfo = SemanticSDP.DTLSInfo
const ICEInfo = SemanticSDP.ICEInfo
const StreamInfo = SemanticSDP.StreamInfo
const TrackInfo = SemanticSDP.TrackInfo
const Direction = SemanticSDP.Direction
const CodecInfo = SemanticSDP.CodecInfo




class Peer extends EventEmitter {

    private peerId: string
    private roomId: string
    private closed: boolean = false

    private room: Room
    private localSdp: any
    private remoteSdp: any
    private transport: any

    private incomingStreams: Map<string, any> = new Map()
    private outgoingStreams: Map<string, any> = new Map()

    constructor(peerId:string) {
        super()

        this.peerId = peerId
    }

    getId(): string  {
        return this.peerId
    }

    getLocalSDP() {
        return this.localSdp
    }

    getRemoteSDP() {
        return this.remoteSdp
    }

    getIncomingStreams(): Map<string, any> {
        return this.incomingStreams
    }

    getOutgoingStreams(): Map<string, any> {
        return this.outgoingStreams
    }



    init(sdp:string, room:Room) {
        
        this.room = room

        const offer = SDPInfo.process(sdp)
        
    }

    addOutgoingStream(stream:any) {

    }


    close() {

    }
    
    dumps() {

    }
}


export default Peer