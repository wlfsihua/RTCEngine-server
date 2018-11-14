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

            console.dir(msg)
            console.log('2222222222222222222222222222222222')

            room = server.Room(roomId)
        }

        const peer = new Peer(userId)

        socket.on('join', async (data: any, callback?: Function) => {

            room.addPeer(peer)

            socket.join(roomId)


            let msg = await nclient.request(medianode, roomId, userId, 'join', {
                sdp: data.sdp
            })

            peer.init(data.sdp, !!data.planB, msg.sdp,room)

            const streams = room.getIncomingStreams()

            // for (let stream of streams.values()) {
            //     peer.subIncomingStream(stream)
            // }

            socket.emit('joined', {
                sdp: msg.sdp,
                room: room.dumps()
            })

            socket.to(roomId).emit('peerConnected', {
                peer: peer.dumps()
            })

            
            // peer.on('renegotiationneeded', (outgoingStream) => {

            //     socket.emit('offer', {
            //         sdp: peer.getLocalSDP().toString(),
            //         room: room.dumps()
            //     })

            // })

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

        })

        socket.on('configure', async (data: any, callback?: Function) => {

            const streamId = data.msid

            // localstream 
            if (peer.getIncomingStreams().get(streamId)) {
                socket.to(room.getId()).emit('configure', data)
                return
            }

        })

        socket.on('leave', async (data: any, callback?: Function) => {

            socket.disconnect(true)

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