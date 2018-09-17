


import * as socketio from 'socket.io'


async function sockethandle(socket: SocketIO.Socket) {

    
    socket.on('join', async (data:any, callback?:Function) => {

    })

    socket.on('offer', async (data:any, callback?:Function) => {

    })

    socket.on('addStream', async (data:any, callback?:Function) => {
       
    })

    socket.on('removeStream', async (data:any, callback?:Function) => {

    })

    socket.on('configure', async (data:any, callback?:Function) => {

    })

    socket.on('leave', async (data:any, callback?:Function) => {

    })

    socket.on('message', async (data:any, callback?:Function) => {

    })

    socket.on('disconnect', async () => {

    })
}

export default sockethandle


