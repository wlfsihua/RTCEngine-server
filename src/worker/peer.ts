import { EventEmitter } from 'events'
import * as uuid from 'uuid'

const MediaServer   = require('medooze-media-server')
const SemanticSDP	= require('semantic-sdp')

const SDPInfo		= SemanticSDP.SDPInfo
const MediaInfo		= SemanticSDP.MediaInfo
const CandidateInfo	= SemanticSDP.CandidateInfo
const DTLSInfo		= SemanticSDP.DTLSInfo
const ICEInfo		= SemanticSDP.ICEInfo
const StreamInfo	= SemanticSDP.StreamInfo
const TrackInfo		= SemanticSDP.TrackInfo
const Direction		= SemanticSDP.Direction
const CodecInfo		= SemanticSDP.CodecInfo

import Logger from '../logger'
import config from '../config'
import Room from './room'
import MediaWorker from './mediaworker'


const log = new Logger('mediaworker:peer')

class Peer extends EventEmitter {

    private room: Room

    private incomingStreams: Map<string, any> = new Map()
    private outgoingStreams: Map<string, any> = new Map()

    private localSdp: any
    private remoteSdp: any

    private userId: string
    private roomId: string 
    private usePlanb: boolean 
    private mediaWorker: MediaWorker
    private transport: any
    private closed: boolean 

    constructor(worker:MediaWorker) {
        super()

        this.closed = false

        this.mediaWorker = this.mediaWorker
    }

    public getId() {
        return this.userId
    }

    public getLocalSdp() {
        return this.localSdp
    }

    public getRemoteSdp() {
        return this.remoteSdp
    }

    public getIncomingStreams(): any {
        return this.incomingStreams.values()
    }

    public getOutgoingStreams(): any {
        return this.outgoingStreams.values()
    }

    public init(data:any) {

        this.roomId = data.room
        this.userId = data.user

        const offer = SDPInfo.process(data.sdp)

        if ('planb' in data) {
            this.usePlanb = !!<boolean>data.planb
        }

        const endpoint = this.mediaWorker.getEndpoint()

        this.transport = endpoint.createTransport(offer)

        this.transport.on('targetbitrate', (bitrate:number) => {

            log.debug('transport:bitrate', bitrate)
        })

        this.transport.setRemoteProperties(offer)

        const dtls = this.transport.getLocalDTLSInfo()
        const ice = this.transport.getLocalICEInfo()
        const candidates = endpoint.getLocalCandidates()

        const answer = new SDPInfo()
        answer.setDTLS(dtls)
        answer.setICE(ice)
        answer.addCandidates(candidates)

        const audioOffer = offer.getMedia('audio')

        if (audioOffer) {
            audioOffer.setDirection(Direction.SENDRECV)
            const audio = audioOffer.answer(config.media.capabilities.audio)
            answer.addMedia(audio)
        }

        const videoOffer = offer.getMedia('video')

        if (videoOffer) {
            videoOffer.setDirection(Direction.SENDRECV)
            const video = videoOffer.answer(config.media.capabilities.video)
            answer.addMedia(video)
        }

        this.transport.setLocalProperties({
            audio: answer.getMedia('audio'),
            video: answer.getMedia('video')
        })

        this.localSdp = answer
        this.remoteSdp = offer

    }

    public addStream(streamInfo: any ) {

        if (!this.transport) {
            log.error('do not have transport')
            return
        }

        const incomingStream = this.transport.createIncomingStream(streamInfo)

        this.incomingStreams.set(incomingStream.id, incomingStream)

        this.emit('stream', incomingStream)

    }

    public removeStream(streamInfo: any) {

        if (!this.transport) {
            log.error('do not have transport')
            return
        }

        
        let incomingStream = this.incomingStreams.get(streamInfo.getId())

        if (incomingStream) {
            incomingStream.stop()
        }
        // delete from incomingStreams
        this.incomingStreams.delete(streamInfo.getId())

    }

    public addOutgoingStream(stream: any, emit = true) {


        if (this.outgoingStreams.get(stream.getId())) {
            log.error("addStream: outstream already exist", stream.getId())
            return
        }

        const outgoingStream = this.transport.createOutgoingStream(stream.getStreamInfo())

        const info = outgoingStream.getStreamInfo()
        
        this.localSdp.addStream(info)

        this.outgoingStreams.set(outgoingStream.getId(), outgoingStream)

        outgoingStream.attachTo(stream)

        if (emit) {
            this.emit('renegotiationneeded', outgoingStream)
        }

        stream.on('stopped', () => {

            if(this.localSdp) {
                this.localSdp.removeStream(info)
            }

            outgoingStream.stop()

            let exist = this.outgoingStreams.delete(outgoingStream.getId())

            if(exist) {
                this.emit('renegotiationneeded', outgoingStream)
            }
        })
        
    }

    public removeOutgoingStream(streamInfo: any) {

        if (this.outgoingStreams.get(streamInfo.getId())) {
            log.error("addStream: outstream already exist", streamInfo.getId())
            return
        }

        const outgoingStream = this.outgoingStreams.get(streamInfo.getId())

        this.localSdp.removeStream(streamInfo)

        outgoingStream.stop()
    }

    public muteOutgingStream(streamId:string,mediaType:string, mute:boolean) {

        const outgoingStream = this.outgoingStreams.get(streamId)

        // we only mute video for now 

        if(!outgoingStream) {
            return
        }

        for (const track of  outgoingStream.getVideoTracks()) {
            track.mute(mute)
        }

    }

    public close() {

        if (this.closed) {
            return
        }

        log.debug('peer close')

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


}


export default Peer