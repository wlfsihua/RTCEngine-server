import { EventEmitter } from 'events'

import * as uuid from 'uuid'

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
    private endpoint:any
    private capabilities:any

    constructor(routerId:string,capabilities:any,opt:any) {
        super()
        this.routerId = routerId
        this.incomingStreams = new Map()
        this.outgoingStreams = new Map()
        this.transports = new Map()
        this.capabilities = capabilities
        this.endpoint = MediaServer.createEndpoint(opt.endpoint)
    }
    createTransport(sdp:string) {
        const offer = SDPInfo.process(sdp)
        const transport = this.endpoint.createTransport(offer)
        transport.id = uuid.v4()
        this.transports.set(transport.id, transport)
        transport.on('stopped', () => {
            this.transports.delete(transport.id)
        })
    }
    addIncomingStream(streamInfo:any, transport:string) {
        
    }
    removeIncomingStream(streamInfo:any, transport:string) {

    } 
    addOutgoingStream() {

    }
    removeOutgoingStream() {
        
    }
}

