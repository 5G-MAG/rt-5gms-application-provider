#!/usr/bin/python3
#==============================================================================
# 5G-MAG Reference Tools: M1 Session CLI
#==============================================================================
#
# File: m1_sync_config.py
# License: 5G-MAG Public License (v1.0)
# Author: David Waring
# Copyright: (C) 2023 British Broadcasting Corporation
#
# For full license terms please see the LICENSE file distributed with this
# program. If this file is missing then the license can be retrieved from
# https://drive.google.com/file/d/1cinCiA778IErENZ3JN52VFW-1ffHpx7Z/view
#
#==============================================================================
#
# AF configuration sync tool
# ==========================
#
# This is a command line tool which takes a configuration from
# /etc/rt-5gms/initial-config.json and applies it to the running AF.
#
# Communication with the AF should be preconfigured using m1-session configure.
#
'''
==================================================
5G-MAG Reference Tools: AF configuration sync tool
==================================================

This command line app takes the configuration in /etc/rt-5gms/initial-config.json and
applies it to a running 5GMS AF using the M1 interface. It also stores M8 JSON
data in the HTTP document roots for any hostnames defined as domainNameAlias 
entries in the initial-config.json.

This shares some configuration with the m1-session tool and
`m1-session configure` should be used to configure the M1 communication address
and port.

This tool is designed to be run immediately after the AF is started in order to configure the Provisioning Sessions in the AF. As such it will normally only be invoked by t

The streams to configure are found in the /etc/rt-5gms/initial-config.json file.

**af-sync.conf file**

This file defines configuration values specifically for this AF configuration
sync tool, and can be found at `/etc/rt-5gms/af-sync.conf`.

```ini
[af-sync]
m5_authority = af.example.com:1234
docroot = /var/cache/rt-5gms/as/docroots
default_docroot = /usr/share/nginx/html
```

The *m5_authority* is a URL authority describing the location of the M5
interface to be advertised via the M8 interface.

The *docroot* is the file path of the document roots used by the 5GMS
Application Server. This is for publishing the M8 JSON file. The file will be
placed at `{docroot}/{domain_name}/m8.json`.

The *default_docroot* is for the directory path to the root directory for the
fallback AS listening point. This will normally be `/usr/share/nginx/html`.

**initial-config.json format**

This file defines the streams to configure and is located at
`/etc/rt-5gms/initial-config.json`.

```json
{
    "aspId": "MyASPId",
    "appId": "BBCRD5GTestbed",
    "streams": {
        "stream-id-1": {
            "name": "Stream name to appear in 5GMS Aware App",
            "ingestURL": "http://media.example.com/some-media-asset/",
            "distributionConfigurations": [
                {
                    "domainNameAlias": "5gms-as.example.com",
                    "entryPoint": {
                        "relativePath": "media.mpd",
                        "contentType": "application/dash+xml",
                        "profiles": ["urn:mpeg:dash:profile:isoff-live:2011"]
                    }
                },
                {
                    "domainNameAlias": "5gms-as.example.com",
                    "entryPoint": {
                        "relativePath": "media.m3u8",
                        "contentType": "application/vnd.apple.mpegurl"
                    }
                }
            ],
            "consumptionReporting": {
                "reportingInterval": 30,
                "samplePercentage": 66.666,
                "locationReporting": true,
                "accessReporting": true,
            },
            "metricsReporting": [
               {
                  "samplingPeriod": 1
               },
               {
                  "scheme": "scheme1",
                  "sliceScope": [
                     {"sst": 1, "sd": "ABCDEF"},
                     {"sst": 1, "sd": "123456"}
                  ],
                  "dataNetworkName": "dnn-name",
                  "reportingInterval": 60,
                  "samplePercentage": 80.0,
                  "urlFilters": [
                     "^http://my\\.domain\\.com/.*\\.(mpd|m3u|mp4|mpg)$",
                     "^https?://other\\.domain\\.com/",
                     "\\.(mov|mkv|avi)$"
                  ],
                  "metrics": [
                     "urn:3GPP:ns:PSS:DASH:QM10#HTTPList",
                     "urn:3GPP:ns:PSS:DASH:QM10#BufferLevel",
                     "urn:3GPP:ns:PSS:DASH:QM10#RepSwitchList",
                     "urn:3GPP:ns:PSS:DASH:QM10#MPDInformation"
                  ],
                  "samplingPeriod": 10
               },
               {
                  "metrics": [
                     "urn:identifier:for:first:metric",
                     "urn:3GPP:ns:PSS:DASH:QM10#HTTPList",
                     "urn:3GPP:ns:PSS:DASH:QM10#BufferLevel",
                     "urn:3GPP:ns:PSS:DASH:QM10#RepSwitchList",
                     "urn:3GPP:ns:PSS:DASH:QM10#MPDInformation"
                  ],
                  "reportingInterval": 10,
                  "samplePercentage": 66,
                  "samplingPeriod": 2
               },
               {
                  "scheme": "scheme3",
                  "sliceScope": [
                     {"sst": 1, "sd": "000001"}
                  ],
                  "reportingInterval": 15,
                  "samplePercentage": 99,
                  "samplingPeriod": 3
               }
            ],
            "policies": {
                "policy-external-ref-1": {
                    "applicationSessionContext": {
                        "sliceInfo": {
                            "sst": 1,
                            "sd": "000001"
                        },
                        "dnn": "internet"
                    },
                    "qoSSpecification": {
                        "qosReference": "qos-1",
                        "maxAuthBtrUl": "200 Kbps",
                        "maxAuthBtrDl": "20 Mbps",
                        "defPacketLossRateDl": 0,
                        "defPacketLossRateUl": 0
                    },
                    "chargingSpecification": {
                        "sponId": "sponsor-id-1",
                        "sponsorEnabled": true,
                        "gpsi": ["msimsi-1234567890"]
                    }
                }
            }
        },
        "vod-root-1": {
            "name": "VoD Service Name",
            "ingestURL": "http://media.example.com/",
            "distributionConfigurations": [
                {"domainNameAlias": "5gms-as.example.com"},
                {"domainNameAlias": "5gms-as.example.com", "certificateId": "placeholder1"}
            ],
            "consumptionReporting": {
                "reportingInterval": 20,
                "samplePercentage": 80,
            },
            "policies": {
                "policy-external-ref-1": {}
            }
        }
    },
    "vodMedia": [
        {
            "name": "VoD Stream 1 Name for UE",
            "stream": "vod-root-1",
            "entryPoints": [
                {
                    "relativePath": "stream1/media.mpd",
                    "contentType": "application/dash+xml",
                    "profiles": ["urn:mpeg:dash:profile:isoff-live:2011"]
                },
                {
                    "relativePath": "stream1/media.m3u8",
                    "contentType": "application/vnd.apple.mpegurl"
                }
            ]
        },
        {
            "name": "VoD Stream 2 Name for UE",
            "stream": "vod-root-1",
            "entryPoints": [
                {
                    "relativePath": "stream2/media.mpd",
                    "contentType": "application/dash+xml",
                    "profiles": ["urn:mpeg:dash:profile:isoff-live:2011"]
                },
                {
                    "relativePath": "stream2/media.m3u8",
                    "contentType": "application/vnd.apple.mpegurl"
                }
            ]
        }
    ]
}
```

The *aspId* is optional and is the ASP identifier for the provisioning sessions.

The *appId* is the mandatory external application identifier for the
provisioning sessions.

The *streams* map lists Provisioning Session configurations with a local
identfier as the map key. This identifier can be used in the *vodMedia* list to
identfiy the stream used for VoD media lists (media entry points described in
the M8 interface). If a stream contains *entryPoint* fields in the
*distributionConfigurations* then these will be advertised via M5 only and will
not appear in the M8 entry points. The *consumptionReporting* parameters, if
present, will configure consumption reporting for the Provisioning Session. See
3GPP TS 26.512 for a description of what may appear in a
DistributionConfiguration or the ConsumptionReportingConfiguration.

The *vodMedia* list is for describing media and their entry points that use a
common Provisioning Session. The Provisioning Session is identfied by the
*stream* field which is a reference to a key in the *streams* map. The entry in
the *streams* map should not have any *distributionConfigurations.entryPoint*
fields defined so that it acts as a top level ingest point for multiple media.
'''

import asyncio
import os.path
import sys

from rt_m1_client import M1Session, M1Error, JSONFileDataStore, Configuration, app_configuration
from rt_media_configuration import MediaConfiguration, StreamsJSONImporter

g_streams_config = os.path.join(os.path.sep, 'etc', 'rt-5gms', 'initial-config.json')
# Old configuration file now moved to /etc/rt-5gms/media.conf or ~/.rt-5gms/media.conf
#g_sync_config = os.path.join(os.path.sep, 'etc', 'rt-5gms', 'af-sync.conf')

async def get_m1_session(cfg: Configuration) -> M1Session:
    data_store = None
    data_store_dir = cfg.get('data_store')
    if data_store_dir is not None:
        data_store = await JSONFileDataStore(data_store_dir)
    session = await M1Session((cfg.get('m1_address', 'localhost'), cfg.get('m1_port',7777)), data_store, cfg.get('certificate_signing_class'))
    return session

async def main():
    cfg = app_configuration
    session = await get_m1_session(cfg)
    media_cfg = await MediaConfiguration(
                                # configfile=g_sync_config,
                                persistent_data_store=session.data_store(),
                                m1_session=session)
    imp = await StreamsJSONImporter(g_streams_config)
    await imp.import_to(media_cfg)
    await media_cfg.synchronise()

    return 0

def app():
    '''
    Application entry point
    '''
    return asyncio.run(main())

if __name__ == "__main__":
    sys.exit(app())

# vim:ts=8:sts=4:sw=4:expandtab:
