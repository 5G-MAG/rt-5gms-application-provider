var express = require('express');
var router = express.Router();
var moment = require('moment');

//const baseUrl = 'http://192.168.178.20:3003';
const baseUrl = 'http://10.147.67.85:3003';
const sai = {
    6: {
        provisioningSessionId: 6,
        provisioningSessionType: 'DOWNLINK',
        streamingAccess: {
            entryPoints: [
                {
                    locator: `${baseUrl}/content/animated/dash.mpd`,
                    contentType: 'application/dash+xml',
                    profiles: [
                        'urn:mpeg:dash:profile:isoff-live:2011'
                    ]
                }
            ]
        },
        clientConsumptionReportingConfiguration: {
            serverAddresses: [`${baseUrl}/3gpp-m5/v2/`],
            locationReporting: true,
            samplePercentage: 100,
            reportingInterval: 10,
            accessReporting: true
        },
        clientMetricsReportingConfigurations: [{
            metricsReportingConfigurationId: "QM10",
            serverAddresses: [`${baseUrl}/3gpp-m5/v2/`],
            scheme: "urn:3GPP:ns:PSS:DASH:QM10",
            reportingInterval: 10,
            samplePercentage: 100.0,
            samplingPeriod: 10
        }, {
            metricsReportingConfigurationId: "other",
            serverAddresses: [`${baseUrl}/3gpp-m5/v2/`],
            scheme: "urn:some:other:scheme",
            reportingInterval: 10,
            samplePercentage: 100.0,
            samplingPeriod: 10
        }]
    },
    5: {
        provisioningSessionId: 5,
        provisioningSessionType: 'DOWNLINK',
        streamingAccess: {
            entryPoints: [
                {
                    locator: `${baseUrl}/content/christmas-video/dash.mpd`,
                    contentType: 'application/dash+xml',
                    profiles: [
                        'urn:mpeg:dash:profile:isoff-live:2011'
                    ]
                }
            ]
        },
        clientConsumptionReportingConfiguration: {
            serverAddresses: [`${baseUrl}/3gpp-m5/v2/`],
            locationReporting: true,
            samplePercentage: 100,
            reportingInterval: 10,
            accessReporting: true
        },
        clientMetricsReportingConfigurations: [{
            metricsReportingConfigurationId: "QM10",
            serverAddresses: [`${baseUrl}/3gpp-m5/v2/`],
            scheme: "urn:3GPP:ns:PSS:DASH:QM10",
            reportingInterval: 10,
            samplePercentage: 100.0,
            samplingPeriod: 10
        }, {
            metricsReportingConfigurationId: "other",
            serverAddresses: [`${baseUrl}/3gpp-m5/v2/`],
            scheme: "urn:some:other:scheme",
            reportingInterval: 10,
            samplePercentage: 100.0,
            samplingPeriod: 10
        }]
    },
    4: {
        provisioningSessionId: 4,
        provisioningSessionType: 'DOWNLINK'
    },
    3: {
        provisioningSessionId: 3,
        provisioningSessionType: 'DOWNLINK'
    },
    2: {
        provisioningSessionId: 2,
        provisioningSessionType: 'DOWNLINK',
        streamingAccess: {
            entryPoints: [
                {
                    locator: 'https://dash.akamaized.net/envivio/EnvivioDash3/manifest.mpd',
                    contentType: 'application/dash+xml',
                    profiles: [
                        'urn:mpeg:dash:profile:isoff-live:2011'
                    ]
                }
            ]
        },
        clientConsumptionReportingConfiguration: {
            serverAddresses: [`${baseUrl}/3gpp-m5/v2/`],
            locationReporting: true,
            samplePercentage: 99,
            reportingInterval: 10,
            accessReporting: true
        },
        clientMetricsReportingConfigurations: [{
            metricsReportingConfigurationId: "QM10",
            serverAddresses: [`${baseUrl}/3gpp-m5/v2/`],
            scheme: "urn:3GPP:ns:PSS:DASH:QM10",
            reportingInterval: 10,
            samplePercentage: 100.0,
            samplingPeriod: 10
        }, {
            metricsReportingConfigurationId: "other",
            serverAddresses: [`${baseUrl}/3gpp-m5/v2/`],
            scheme: "urn:some:other:scheme",
            reportingInterval: 10,
            samplePercentage: 100.0,
            samplingPeriod: 10
        }]


    },
    1: {
        provisioningSessionId: 1,
        provisioningSessionType: 'DOWNLINK',
        streamingAccess: {
            entryPoints: [
                {
                    locator: 'https://livesim.dashif.org/livesim/testpic_2s/Manifest.mpd',
                    contentType: 'application/dash+xml',
                    profiles: [
                        'urn:mpeg:dash:profile:isoff-live:2011'
                    ]
                }
            ]
        },
        clientConsumptionReportingConfiguration: {
            serverAddresses: [`${baseUrl}/3gpp-m5/v2/`],
            locationReporting: true,
            samplePercentage: 100,
            reportingInterval: 10,
            accessReporting: true
        },
        clientMetricsReportingConfigurations: [{
            metricsReportingConfigurationId: "QM10",
            serverAddresses: [`${baseUrl}/3gpp-m5/v2/`],
            scheme: "urn:3GPP:ns:PSS:DASH:QM10",
            reportingInterval: 10,
            samplePercentage: 100.0,
            samplingPeriod: 10
        }, {
            metricsReportingConfigurationId: "other",
            serverAddresses: [`${baseUrl}/3gpp-m5/v2/`],
            scheme: "urn:some:other:scheme",
            reportingInterval: 10,
            samplePercentage: 100.0,
            samplingPeriod: 10
        }]
    }
}

/* GET users listing. */
router.get('/:provisioningSessionId', function (req, res, next) {
    res.setHeader('Cache-Control', 'max-age=10');
    res.setHeader('Age', 2);

    // Set the expiration time to be 1 hour from the current time
    const expirationTime = moment().utc().add(10, 'second');

    // Format the expiration time as UTC string with English month abbreviation
    const expirationString = expirationTime.format('ddd, DD MMM YYYY HH:mm:ss [GMT]');
    res.setHeader('Expires', expirationString);
    res.setHeader('last-modified', Date.now());

    const id = req.params.provisioningSessionId;
    res.json(sai[id])
});

module.exports = router;
