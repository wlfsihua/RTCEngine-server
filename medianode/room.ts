import { EventEmitter } from 'events'


const MediaServer = require('medooze-media-server')

import Peer from './peer'

class Room extends EventEmitter {

    private roomId: string
    private closed: boolean
    private peers: Map<string, Peer>
    private endpoint: any
    private tracksMap: Map<string, string>
    private activeSpeakerDetector: any
    private capabilities:any

    constructor(roomId:string, capabilities:any) {
        super()

        this.roomId = roomId
        this.closed = false
        this.peers = new Map()
        this.tracksMap = new Map()
        this.endpoint = MediaServer.createEndpoint('')
        this.capabilities = capabilities
        this.activeSpeakerDetector = MediaServer.createActiveSpeakerDetector()
        this.activeSpeakerDetector.setMinChangePeriod(100)

        this.activeSpeakerDetector.on('activespeakerchanged', (track) => {

            let peerId = this.tracksMap.get(track.getId())

            if (peerId) {
                this.emit('activespeakerchanged', peerId)
            }

        })
    }

    getId(): string {
        return this.roomId
    }

    getEndpoint(): any {
        return this.endpoint
    }

    getPeers(): Peer[] {
        return Array.from(this.peers.values())
    }

    hasPeer(peer: string): boolean {
        return this.peers.has(peer)
    }

    getPeer(peer: string): Peer {
        return this.peers.get(peer)
    }

    getCapabilities() {
        return this.capabilities
    }

    getIncomingStreams(): Map<string, any> {
        const streams = new Map()
        for (let peer of this.peers.values()) {
            for (let stream of peer.getIncomingStreams().values()) {
                streams.set(stream.getId(), stream)
            }
        }
        return streams
    }
    
    addPeer(peer: Peer) {

        if (this.peers.has(peer.getId())) {
            return
        }

        this.peers.set(peer.getId(), peer)

        peer.on('stream', (stream) => {
            for (let other of this.peers.values()) {
                if (peer.getId() !== other.getId()) {
                    other.addOutgoingStream(stream)
                }
            }

            let audioTrack = stream.getAudioTracks()[0]

            if (audioTrack) {
                this.activeSpeakerDetector.addSpeaker(audioTrack)
                audioTrack.on('stoped', () => {
                    this.activeSpeakerDetector.removeSpeaker(audioTrack)
                })
            }
        })

        peer.on('close', () => {
            this.peers.delete(peer.getId())
            this.emit('peers', this.peers.values())
            if (this.peers.size == 0) {
                this.close()
            }
        })

        this.emit('peers', this.peers.values())
    }

    close() {
        if (this.closed) {
            return
        }

        this.closed = true

        for (let peer of this.peers.values()) {
            peer.close()
        }

        if (this.activeSpeakerDetector) {
            this.activeSpeakerDetector.stop()
        }

        if (this.endpoint) {
            this.endpoint.stop()
        }

        this.emit('close')
    }

    dumps(): any {
        let info = {
            id: this.roomId,
            peers: []
        }
        for (let peer of this.peers.values()) {
            info.peers.push(peer.dumps())
        }
        return info
    }
}


export default Room