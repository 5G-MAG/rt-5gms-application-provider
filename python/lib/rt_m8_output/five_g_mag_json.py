#!/usr/bin/python3 
#==============================================================================
# 5G-MAG Reference Tools: FiveGMagJsonFormatter class
#==============================================================================
#
# File: rt_media_configuration/five_g_mag_json.py
# License: 5G-MAG Public License (v1.0)
# Author: David Waring <david.waring2@bbc.co.uk>
# Copyright: (C) 2024 British Broadcasting Corporation
#
# For full license terms please see the LICENSE file distributed with this
# program. If this file is missing then the license can be retrieved from
# https://drive.google.com/file/d/1cinCiA778IErENZ3JN52VFW-1ffHpx7Z/view
#
#==============================================================================
'''
=====================================================
5G-MAG Reference Tools: FiveGMagJsonFormatter Class
=====================================================
Copyright: (C) 2024 British Broadcasting Corporation
Author(s): David Waring <david.waring2@bbc.co.uk>
Licence: 5G-MAG Public License (v1.0)

For full license terms please see the LICENSE file distributed with this
program. If this file is missing then the license can be retrieved from
https://drive.google.com/file/d/1cinCiA778IErENZ3JN52VFW-1ffHpx7Z/view
=====================================================

This module provides the MediaConfiguration class which models a collection
of media assets and provides methods to manipulate the model and use the
rt_m1_client.M1Session object to synchronise that configuration with the
5GMS AF.
'''

import aiofiles
import json
import os
import os.path
from typing import Optional
from rt_m1_client import Configuration, app_configuration
from rt_media_configuration import MediaConfiguration
from .m8_output import M8Output


class FiveGMagJsonFormatter(M8Output):
    '''FiveGMagJsonFormatter Class
===========================
Output formatter to represent a MediaConfiguration as a 5G-MAG m8.json file
'''
    def __init__(self, root_dir: Optional[str] = None, m8_json_filename: Optional[str] = None, config: Configuration = app_configuration, m5_authority: Optional[str] = None):
        self.__config = config
        if root_dir is None:
            root_dir = self.__config.get('root_dir', section='media-configuration', default='.')
        if m8_json_filename is None:
            m8_json_filename = self.__config.get('m8_json_filename', section='media-configuration', default='m8.json')
        if m5_authority is None:
            m5_authority = self.__config.get("m5_authority", section="media-configuration", default="localhost")
        super().__init__(root_dir)
        self.__json_filename = m8_json_filename
        self.__m5_authority = m5_authority

    async def writeOutput(self, media_config: MediaConfiguration):
        '''Write out the 5G-MAG m8.json file
        '''
        if not os.path.isdir(self.root_dir):
            os.makedirs(self.root_dir, mode=0o755)
        async with aiofiles.open(os.path.join(self.root_dir, self.__json_filename), mode='w') as json_out:
            m8_config = {'m5BaseUrl': f'http://{self.__m5_authority}/3gpp-m5/v2/', 'serviceList': []}
            for session in await media_config.mediaSessions():
                me = session.media_entry
                if me is None or session.provisioning_session_id is None:
                    continue

                if not me.app_distributions:
                    entryPoints = []
                    for dc in (me.distributions or []):
                        if dc.base_url is None or dc.entry_point is None or dc.entry_point.relative_path is None:
                            continue
                        ep = {
                            'locator': self.__join_url(dc.base_url, dc.entry_point.relative_path),
                            'contentType': dc.entry_point.content_type
                        }
                        if dc.entry_point.profiles is not None:
                            ep['profiles'] = dc.entry_point.profiles
                        if ep not in entryPoints:
                            entryPoints.append(ep)
                    entry = {'provisioningSessionId': session.provisioning_session_id, 'name': me.name}
                    if entryPoints:
                        entry['entryPoints'] = entryPoints
                    m8_config['serviceList'] += [entry]
                else:
                    for ad in me.app_distributions:
                        entryPoints = []
                        for vep in ad.entry_points:
                            for dc in (me.distributions or []):
                                if dc.base_url is not None:
                                    ep = {'locator': self.__join_url(dc.base_url, vep.relative_path), 'contentType': vep.content_type}
                                    if vep.profiles is not None:
                                        ep['profiles'] = vep.profiles
                                    if ep not in entryPoints:
                                        entryPoints.append(ep)
                        entry = {'provisioningSessionId': session.provisioning_session_id, 'name': ad.name}
                        if entryPoints:
                            entry['entryPoints'] = entryPoints
                        m8_config['serviceList'] += [entry]
            await json_out.write(json.dumps(m8_config))

    @staticmethod
    def __join_url(a: str, b: str):
        while len(a) > 0 and a[-1] == '/':
            a = a[:-1]
        while len(b) > 0 and b[0] == '/':
            b = b[1:]
        return a + '/' + b

MediaConfiguration.registerM8OutputClass(FiveGMagJsonFormatter)