
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

        const endpoint = room.getEndpoint()

        this.transport = endpoint.createTransport(offer)

        this.transport.setRemoteProperties(offer)

        if (offer.getMedia('audio')) {
            offer.getMedia('audio').setDirection(Direction.SENDRECV)
        }

        if (offer.getMedia('video')) {
            offer.getMedia('video').setDirection(Direction.SENDRECV)
        }

        // todo 
        const answer = offer.answer({
            dtls: this.transport.getLocalDTLSInfo(),
            ice: this.transport.getLocalICEInfo(),
            candidates: endpoint.getLocalCandidates(),
            capabilities: room.getCapabilities()
        })

        this.transport.setLocalProperties({
            audio: answer.getMedia('audio'),
            video: answer.getMedia('video')
        })

        this.localSdp = answer
        this.remoteSdp = offer
    }

    addStream(streamInfo:any) {

        if (!this.transport) {
            return
        }

        const incomingStream = this.transport.createIncomingStream(streamInfo)

        this.incomingStreams.set(incomingStream.getId(), incomingStream)

        process.nextTick(() => {
            this.emit('stream', incomingStream)
        })
        this.remoteSdp.addStream(streamInfo)

        return incomingStream
    }

    removeStream(streamInfo:any) {

        if (!this.transport) {
            return
        }

        let incomingStream = this.incomingStreams.get(streamInfo.getId())

        if (incomingStream) {
            incomingStream.stop()
        }
        this.incomingStreams.delete(streamInfo.getId())
        this.remoteSdp.removeStream(streamInfo)
    }

    addOutgoingStream(incomingStream:any, emit = true) {

        if (this.outgoingStreams.get(incomingStream.getId())) {
            return
        }

        const outgoingStream = this.transport.createOutgoingStream(incomingStream.getStreamInfo())

        const info = outgoingStream.getStreamInfo()

        this.localSdp.addStream(info)

        this.outgoingStreams.set(outgoingStream.getId(), outgoingStream)

        outgoingStream.attachTo(incomingStream)

        incomingStream.on('stopped', () => {

            if (this.localSdp) {
                this.localSdp.removeStream(info)
            }

            outgoingStream.stop()

            let exist = this.outgoingStreams.delete(outgoingStream.getId())

            if (exist) {
                this.emit('renegotiationneeded', outgoingStream)
            }

        })

        if (emit) {
            this.emit('renegotiationneeded', outgoingStream)
        }

        return outgoingStream
    }

    removeOutgoingStream(streamInfo:any) {

        if (this.outgoingStreams.get(streamInfo.getId())) {
            return
        }

        const outgoingStream = this.outgoingStreams.get(streamInfo.getId())

        this.localSdp.removeStream(outgoingStream.getStreamInfo())

        outgoingStream.stop()

    }

    close() {

        if (this.closed) {
            return
        }

        this.closed = true

        for (let stream of this.incomingStreams.values()) {
            stream.stop()
        }

        for (let stream of this.outgoingStreams.values()) {
            stream.stop()
        }

        if (this.transport) {
            this.transport.stop()
        }

        this.incomingStreams.clear()
        this.outgoingStreams.clear()

        this.emit('close')
    }

    dumps() {

        const incomingStreams = Array.from(this.incomingStreams.values())
        const streams = incomingStreams.map((stream) => {
            return {
                id: stream.getId(),
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