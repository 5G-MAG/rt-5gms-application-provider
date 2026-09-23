#!/usr/bin/python3
#==============================================================================
# 5G-MAG Reference Tools: CmmfVodConfigFormatter class
#==============================================================================
#
# File: rt_m8_output/cmmf_vod_config.py
# License: 5G-MAG Public License (v1.0)
# Author: Sukrit Gupta <sukrit.gupta@dolby.com>
# Copyright: (C) 2026 Dolby Laboratories Inc.
#
# For full license terms please see the LICENSE file distributed with this
# program. If this file is missing then the license can be retrieved from
# https://drive.google.com/file/d/1cinCiA778IErENZ3JN52VFW-1ffHpx7Z/view
#
#==============================================================================
'''
=====================================================
5G-MAG Reference Tools: CmmfVodConfigFormatter Class
=====================================================
Copyright: (C) 2026 Dolby Laboratories Inc.
Author(s): Sukrit Gupta <sukrit.gupta@dolby.com>
Licence: 5G-MAG Public License (v1.0)

For full license terms please see the LICENSE file distributed with this
program. If this file is missing then the license can be retrieved from
https://drive.google.com/file/d/1cinCiA778IErENZ3JN52VFW-1ffHpx7Z/view
=====================================================

This module provides the CmmfVodConfigFormatter class which writes a CMMF
vodConfig.json file synchronously with m8.json, using the same M1-resolved
distribution base URLs FiveGMagJsonFormatter already uses.
'''

import aiofiles
import os
import os.path
from typing import Optional
from urllib.parse import urlsplit
from rt_m1_client import Configuration, app_configuration
from rt_media_configuration import MediaConfiguration
from .m8_output import M8Output

DEFAULT_CMMF_CONTENT_TYPE = 'application/vnd.cmmf-configuration-information+json'


class CmmfVodConfigFormatter(M8Output):
    '''CmmfVodConfigFormatter Class
============================
Output formatter that renders a CMMF vodConfig.json from a template, filling
in the M4 path prefix taken directly from the matching distribution's
resolved base_url instead of recomputing it from urlPathPrefixFormat.
'''
    def __init__(self, root_dir: Optional[str] = None, template_filename: Optional[str] = None,
                 output_filename: Optional[str] = None, path_prefix_placeholder: Optional[str] = None,
                 content_type: Optional[str] = None, config: Configuration = app_configuration):
        self.__config = config
        if root_dir is None:
            root_dir = self.__config.get('cmmf_root_dir', section='media-configuration', default='/etc/rt-5gms/cmmf-config')
        if template_filename is None:
            template_filename = self.__config.get('cmmf_vod_config_template', section='media-configuration', default='vodConfig.json.tmpl')
        if output_filename is None:
            output_filename = self.__config.get('cmmf_vod_config_filename', section='media-configuration', default='vodConfig.json')
        if path_prefix_placeholder is None:
            path_prefix_placeholder = self.__config.get('cmmf_path_prefix_placeholder', section='media-configuration', default='__M4_PATH_PREFIX__')
        if content_type is None:
            content_type = self.__config.get('cmmf_content_type', section='media-configuration', default=DEFAULT_CMMF_CONTENT_TYPE)
        super().__init__(root_dir)
        self.__template_filename = template_filename
        self.__output_filename = output_filename
        self.__path_prefix_placeholder = path_prefix_placeholder
        self.__content_type = content_type

    async def writeOutput(self, media_config: MediaConfiguration):
        '''Write out the CMMF vodConfig.json file
        '''
        # Mirrors FiveGMagJsonFormatter's two population paths: a stream defined via
        # vodMedia/appDistributions (this recipe's CMMFvod) carries its entry points on
        # media_entry.app_distributions, not on each MediaDistribution.entry_point.
        matches = {}
        for session in await media_config.mediaSessions():
            me = session.media_entry
            if me is None or session.provisioning_session_id is None:
                continue
            if not me.app_distributions:
                for dc in (me.distributions or []):
                    if dc.base_url is None or dc.entry_point is None:
                        continue
                    if dc.entry_point.content_type != self.__content_type:
                        continue
                    matches.setdefault(session.provisioning_session_id, []).append(dc.base_url)
            else:
                for ad in me.app_distributions:
                    for vep in (ad.entry_points or []):
                        if vep.content_type != self.__content_type:
                            continue
                        for dc in (me.distributions or []):
                            if dc.base_url is None:
                                continue
                            matches.setdefault(session.provisioning_session_id, []).append(dc.base_url)

        if len(matches) == 0:
            self.log_crit(f'No distribution found with entry point content type "{self.__content_type}"; cannot write {self.__output_filename}')
        if len(matches) > 1:
            self.log_crit(f'Multiple provisioning sessions ({", ".join(matches.keys())}) have a distribution with entry point content type "{self.__content_type}"; refine the match')

        base_urls = next(iter(matches.values()))
        # Every distribution for this session shares the same M1-resolved path prefix, only the host differs.
        path_prefix = urlsplit(base_urls[0]).path.rstrip('/')

        template_path = os.path.join(self.root_dir, self.__template_filename)
        if not os.path.isfile(template_path):
            self.log_crit(f'CMMF vodConfig template not found at {template_path}')

        async with aiofiles.open(template_path, mode='r') as tmpl_in:
            template = await tmpl_in.read()

        if not os.path.isdir(self.root_dir):
            os.makedirs(self.root_dir, mode=0o755)
        async with aiofiles.open(os.path.join(self.root_dir, self.__output_filename), mode='w') as json_out:
            await json_out.write(template.replace(self.__path_prefix_placeholder, path_prefix))


MediaConfiguration.registerM8OutputClass(CmmfVodConfigFormatter)
