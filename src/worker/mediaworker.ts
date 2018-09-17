
import * as cluster from 'cluster'
import { EventEmitter } from 'events'

import Room from './room'
import Peer from './peer'

import config from '../config'

const MediaServer = require('medooze-media-server')

export default class MediaWorker extends EventEmitter {


    private rooms: Map<string, Room> = new Map()
    private peers: Map<string, Peer> = new Map()
    private endpoint: any
    private worker: cluster.Worker
    private id:number


    constructor(worker:cluster.Worker) {
        super()

        this.endpoint = MediaServer.createEndpoint(config.media.endpoint)
        this.worker = worker
        this.id = worker.id


        worker.on('disconnect', () => {

        })

        worker.on('exit', (code:number, signal:string) => {

        })

        worker.on('listening', (address:cluster.Address) => {

            console.log('listening', address.address, address.port)
        })

        worker.on('online', () => {

            console.log('online ', worker.id)
        })

        worker.on('message', (message:any) => {
            // type   data
            
        })

    }

    public getEndpoint() {
        return this.endpoint
    }

    public run() {

    }

}