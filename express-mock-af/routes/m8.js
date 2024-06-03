var express = require('express');
var router = express.Router();

const m8 = {
    //m5BaseUrl: 'http://192.168.178.20:3003/3gpp-m5/v2/',
    m5BaseUrl: 'http://10.147.67.85:3003/3gpp-m5/v2/',
    serviceList: [
        {
            provisioningSessionId: 1,
            name: 'DASH-IF LiveSim'
        },
        {
            provisioningSessionId: 2,
            name: 'Envivio'
        },
        {
            provisioningSessionId: 3,
            name: 'BBC',
            entryPoints: [
                {
                    locator: 'https://rdmedia.bbc.co.uk/testcard/vod/manifests/avc-full.mpd',
                    contentType: 'application/dash+xml',
                    profiles: [
                        'urn:mpeg:dash:profile:isoff-live:2011'
                    ]
                }
            ]
        },
        {
            provisioningSessionId: 4,
            name: 'AWS',
            entryPoints: [
                {
                    locator: 'https://d24rwxnt7vw9qb.cloudfront.net/v1/dash/e6d234965645b411ad572802b6c9d5a10799c9c1/All_Reference_Streams/4577dca5f8a44756875ab5cc913cd1f1/index.mpd',
                    contentType: 'application/dash+xml',
                    profiles: [
                        'urn:mpeg:dash:profile:isoff-live:2011'
                    ]
                }
            ]
        },
        {
            provisioningSessionId: 5,
            name: 'Christmas Local'
        },
        {
            provisioningSessionId: 6,
            name: 'Sintel local'
        },
    ]

}

/* GET users listing. */
router.get('/m8.json', function (req, res, next) {
    res.json(m8)
});

module.exports = router;
