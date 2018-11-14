import { EventEmitter } from 'events'


const MediaServer = require('medooze-media-server')
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

interface IncomingInterface {
    id: string
    outgoings: Map<string,any>
}


class Router extends EventEmitter {

    private routerId:string
    private incomingStreams:Map<string,IncomingInterface> 
    private outgoingStreams:Map<string,any>
    private transports:Map<string, any>

    constructor(routerId:string, opt:any) {
        super()
        this.routerId = routerId
        this.incomingStreams = new Map()
        this.outgoingStreams = new Map()
        this.transports = new Map()
    }
    createTransport() {

    }
    addStream(streamInfo:any, transport:any) {
        
    }
    
}

