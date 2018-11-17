import { EventEmitter } from 'events' 
import * as socketio from 'socket.io'
import * as jwt from 'jwt-simple'
import * as http from 'http'

import Channel from './channel'
import server from './server'
import Room from './room'
import Peer from './peer'
import config from './config'

const SemanticSDP = require('semantic-sdp')

const SDPInfo = SemanticSDP.SDPInfo


class SocketServer extends EventEmitter {

    private socketServer: SocketIO.Server

    constructor(httpserver:http.Server) {
        super()

        this.socketServer = socketio({
            pingInterval: 10000,
            pingTimeout: 5000,
            transports: ['websocket']
        })

        this.socketServer.attach(httpserver) 

        this.socketServer.of('/media').on('connection', async (socket: SocketIO.Socket) => {
            
            console.dir(socket.handshake.query)
            const id = socket.handshake.query.id 
            const channel = new Channel(id,socket)
            this.emit('channel', channel)
        })

        this.socketServer.of('/channel').on('connection', async (socket: SocketIO.Socket) => {

            let token = socket.handshake.query.token

            let data = jwt.decode(token, null, true)
    
            const userId = data.user
            const roomId = data.room
    
            let room = server.getRoom(roomId)
    
            if (!room) {
                room = server.Room(roomId)
            }
    
            const peer = room.Peer(userId)

            socket.on('join', async (data: any, callback?: Function) => {

                socket.join(roomId)

                const sdp = data.sdp

                // remote join 
                await peer.join(room, sdp)
                const streams = room.getIncomingStreams()
                for (let stream of streams.values()) {
                    peer.addOutgoingStream(stream)
                }
    
                socket.emit('joined', {
                    sdp: peer.getLocalSDP().toString(),
                    room: room.dumps()
                })
    
                socket.to(roomId).emit('peerConnected', {
                    peer: peer.dumps()
                })
    
                peer.on('renegotiationneeded', () => {
                    console.log('renegotiationneeded')
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
    
                await peer.addIncomingStream(streamInfo)
    
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
    
                await peer.removeIncomingStream(streamInfo)
    
            })

            socket.on('configure', async (data: any, callback?: Function) => {

                const streamId = data.msid
                // localstream 
                if (peer.getIncomingStreams().get(streamId)) {
                    socket.to(room.getId()).emit('configure', data)
                    return
                }

                // remotestream 
                // todo 
                await peer.muteRemote(streamId,'trackId', data.muting)
            })
    
            socket.on('leave', async (data: any, callback?: Function) => {
    
                socket.disconnect(true)
                await peer.close()
            })
    
            socket.on('message', async (data: any, callback?: Function) => {
                socket.to(room.getId()).emit('message', data)
            })
    
            socket.on('disconnect', async () => {
                socket.to(room.getId()).emit('peerRemoved', {
                    peer: peer.dumps()
                })
                socket.leaveAll()
                await peer.close()
            })

        })
        
    }
}


export default SocketServer