import * as socketio from 'socket.io'
import * as jwt from 'jwt-simple'

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

import server from './server'
import Room from './room'
import Peer from './peer'
import config from './config'
import NClient from './nats'


const socketServer = socketio({
    pingInterval: 10000,
    pingTimeout: 5000,
    transports: ['websocket']
})

const nclient = new NClient('nave')

nclient.on('event', (msg) => {

    console.dir(msg)

    const room = server.getRoom(msg.room)
    const peer = room.getPeer(msg.peer)
    
    if (msg.name === 'addOutgoingStream') {
        const plaininfo = msg.data.stream
        const streamInfo = StreamInfo.expand(plaininfo)
        peer.addOutgoingStream(streamInfo)

    }

    if (msg.name === 'removeOutgoingStream') {
        const plaininfo = msg.data.stream
        const streamInfo = StreamInfo.expand(plaininfo)
        peer.removeOutgoingStream(streamInfo)
    }

})

const medianode = 'medianode'

const setupSocketServer = async () => {


    socketServer.on('connection', async (socket: SocketIO.Socket) => {

        let token = socket.handshake.query.token

        let data = jwt.decode(token, null, true)

        const userId = data.user
        const roomId = data.room

        let room = server.getRoom(roomId)

        if (!room) {

            let msg = await nclient.request(medianode, roomId, userId, 'newroom', {
                capabilities: config.media.capabilities
            })
            room = server.Room(roomId)
        }

        const peer = new Peer(userId)

        socket.on('join', async (data: any, callback?: Function) => {

            socket.join(roomId)

            peer.join(room)

            let msg = await nclient.request(medianode, roomId, userId, 'join', {
                sdp: data.sdp
            })

            // todo add outgoing stream 


            peer.init(data.sdp, msg.sdp)

            socket.emit('joined', {
                sdp: peer.getLocalSDP().toString(),
                room: room.dumps()
            })

            socket.to(roomId).emit('peerConnected', {
                peer: peer.dumps()
            })

            peer.on('renegotiationneeded', () => {

                socket.emit('offer', {
                    sdp: peer.getLocalSDP().toString(),
                    room: room.dumps()
                })

            })

        })

        socket.on('addStream', async (data: any, callback?: Function) => {

            const sdp = SDPInfo.process(data.sdp)
            const streamId = data.stream.msid
            const bitrate = data.stream.bitrate
            const attributes = data.stream.attributes

            room.setBitrate(streamId, bitrate)
            room.setAttribute(streamId, attributes)

            const streamInfo = sdp.getStream(streamId)

            if (!streamInfo) {
                // this should not happen
                return
            }

            peer.addIncomingStream(streamInfo)

            let msg = await nclient.request(medianode, roomId, userId, 'addStream', {
                sdp: data.sdp,
                stream: {
                    streamId: streamId
                }
            })

            console.log('after add stream', msg)

            // we set bitrate, need find a better way to do this
            for (let media of peer.getLocalSDP().getMediasByType('video')) {
                media.setBitrate(bitrate)
            }

            socket.emit('streamAdded', {
                msid: streamInfo.getId()
            })

        })

        socket.on('removeStream', async (data: any, callback?: Function) => {

            const streamId = data.stream.msid

            const streamInfo = peer.getIncomingStreams().get(streamId)

            peer.removeIncomingStream(streamInfo)

            let msg = await nclient.request(medianode, roomId, userId, 'removeStream', {
                stream: {
                    streamId: streamId
                }
            })
            console.dir(msg)
        })

        socket.on('configure', async (data: any, callback?: Function) => {

            const streamId = data.msid

            // localstream 
            if (peer.getIncomingStreams().get(streamId)) {
                socket.to(room.getId()).emit('configure', data)
                return
            }

            // remotestream 
            let msg = await nclient.request(medianode, roomId, userId, 'muteRemote', {
                muting: data.muting,
                stream: {
                    streamId:streamId
                }
            })

            console.dir(msg)
        })

        socket.on('leave', async (data: any, callback?: Function) => {

            socket.disconnect(true)

            let msg = await nclient.request(medianode, roomId, userId, 'leave', {})

            peer.close()
        })

        socket.on('message', async (data: any, callback?: Function) => {
            socket.to(room.getId()).emit('message', data)
        })

        socket.on('disconnect', async () => {
            socket.to(room.getId()).emit('peerRemoved', {
                peer: peer.dumps()
            })
            socket.leaveAll()
            peer.close()
        })
    })


}


export default {
    socketServer,
    setupSocketServer
}