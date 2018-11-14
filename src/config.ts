
export default {
    medianode: 'http://localhost:4000/',
    server: {
        secret: 'test_secret',
        externalUrl: 'http://127.0.0.1:3888/'
    },
    // iceServer: {
    //     urls: ['101.201.141.179:3478', '101.201.141.179:3478'],
    //     secret: 'dotEngine_turn001',
    //     transports: ['udp', 'tcp']
    // },
    etcd: {
        hosts:'127.0.0.1:2379'
    },
    iceServers: [
        {
            host: '101.201.141.179',
            port: 3478,
            secret: 'dotEngine_turn001',
            transports: ['udp', 'tcp']
        }
    ],
    recorder: {
        enable: true,
        refreshPeriod: 10000,  // ten seconds
        waitForIntra: false
    },
    media: {
        debug: true,
        endpoint: '127.0.0.1',
        ultraDebug: true,
        rtcMinPort: 10000,
        rtcMaxPort: 10002,
        iceTransportPolicy: 'all',   // 'all' or 'relay'
        capabilities: {
            audio: {
                codecs: ['opus'],
                extensions: [
                    'urn:ietf:params:rtp-hdrext:ssrc-audio-level',
                    'http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01'
                ]
            },
            video: {
                codecs: ['vp8','h264;packetization-mode=1'],
                rtx: true,
                rtcpfbs: [
                    { 'id': 'transport-cc' },
                    { "id": "ccm", "params": ["fir"] },
                    { "id": "nack" },
                    { "id": "nack", "params": ["pli"] }
                ],
                extensions: [
                    'http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time',
                    'http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01'
                ]
            }
        }
    }
}
