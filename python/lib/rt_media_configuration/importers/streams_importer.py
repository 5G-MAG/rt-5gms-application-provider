#!/usr/bin/python3
#==============================================================================
# 5G-MAG Reference Tools: initial-config.json MediaConfiguration importer
#==============================================================================
#
# File: rt_media_configuration/importers/streams_importer.py
# License: 5G-MAG Public License (v1.0)
# Author: David Waring
# Copyright: (C) 2023 British Broadcasting Corporation
#
# For full license terms please see the LICENSE file distributed with this
# program. If this file is missing then the license can be retrieved from
# https://drive.google.com/file/d/1cinCiA778IErENZ3JN52VFW-1ffHpx7Z/view
#
#==============================================================================
import json
import logging
import traceback
from typing import Optional

import aiofiles

from .importer import MediaConfigurationImporter
from ..media_session import MediaSession
from ..media_entry import MediaEntry
from ..media_app_distribution import MediaAppDistribution
from ..media_distribution import MediaDistribution
from ..media_server_certificate import MediaServerCertificate

class StreamsJSONImporter(MediaConfigurationImporter):
    '''StreamsJSONImporter class
=========================
Reads in a `initial-config.json` JSON file and uses the contents to replace the model
in the MediaConfiguration.
    '''

    def __init__(self, streamsfile: Optional[str] = None):
        '''Constructor
        '''
        super().__init__()
        self.__streamsfile = streamsfile or "/etc/rt-5gms/initial-config.json"
        self.__streams = None
        self.__log = logging.getLogger(__name__ + '.' + self.__class__.__name__)

    #Already provided by the interface:
    #def __await__(self):
    #    '''``await`` provider for asynchronous instansiation.
    #    '''
    #    return self._asyncInit().__await__()

    async def _asyncInit(self):
        '''Asynchronous object instantiation

        :meta private:
        :return: self
        '''
        await super()._asyncInit()
        await self.__load_streams()
        return self

    async def import_to(self, model: "MediaConfiguration") -> bool:
        '''Import the model into ``model``.
        '''
        try:
            await model.reset()
            certs_map = {}
            model.asp_id = self.__streams["aspId"]
            for stream_id,stream_config in self.__streams["streams"].items():
                stream_config['appId'] = self.__streams["appId"]
                session = MediaSession.fromJSONObject(stream_config)
                session.id = stream_id
                if session.asp_id is None:
                    session.asp_id = model.asp_id
                if session.media_entry is not None:
                    for d in session.media_entry.distributions:
                        if d.certificate_id is not None:
                            cert = session.certificateByLocalIdent(d.certificate_id)
                            if cert is None:
                                cert = MediaServerCertificate(local_ident=d.certificate_id)
                                session.addCertificate(cert)
                            if d.domain_name_alias is not None:
                                cert.addDomainName(d.domain_name_alias)
                await model.addMediaSession(session)
            for vod_media in self.__streams["vodMedia"]:
                distrib_obj = vod_media.copy()
                del distrib_obj['stream']
                distrib = MediaAppDistribution.fromJSONObject(distrib_obj)
                session = await model.mediaSessionById(vod_media['stream'])
                if session is None:
                    self.__log.error(f'Attempt to add App distribution entry to non-existant session "{vod_media["stream"]}"')
                    return False
                entry = session.media_entry
                if entry is None:
                    self.__log.error(f'Attempt to add App distribution entry to session "{vod_media["stream"]}" without media configuration')
                    return False
                entry.addAppDistribution(distrib)
        except Exception:
            self.__log.error(traceback.format_exc())
            return False
        return True

    async def __load_streams(self):
        async with aiofiles.open(self.__streamsfile, mode='r') as streams_in:
            streams_json_str = await streams_in.read()
        self.__streams = json.loads(streams_json_str)
