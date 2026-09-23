#!/usr/bin/python3 
#==============================================================================
# 5G-MAG Reference Tools: M8Output class
#==============================================================================
#
# File: rt_m8_output/m8_output.py
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
5G-MAG Reference Tools: M8Output Class
=====================================================
Copyright: (C) 2024 British Broadcasting Corporation
Author(s): David Waring <david.waring2@bbc.co.uk>
Licence: 5G-MAG Public License (v1.0)

For full license terms please see the LICENSE file distributed with this
program. If this file is missing then the license can be retrieved from
https://drive.google.com/file/d/1cinCiA778IErENZ3JN52VFW-1ffHpx7Z/view
=====================================================

This module provides the M8Output base class.

This provides the common interface and methods for all classes which
can be used to format and output static files that will be distributed via
the interface at reference point M8.
'''

import logging
import sys

from rt_media_configuration import MediaConfiguration

class M8Output:
    '''M8Output base class
===================
This is the base class for objects that can format a
rt_media_configuration.MediaConfiguration and store it in one or more static
files for delivery via the interface at reference point M8.
    '''

    def __init__(self, root_dir: str):
        self.__root_dir = root_dir
        self.__log = logging.getLogger(f'{__name__}.{self.__class__.__name__}')
        self.__attachedTo = []

    def __await__(self):
        '''``await`` provider for asynchronous instantiation.
        '''
        return self.__asyncInit().__await__()

    async def __asyncInit(self):
        '''Asynchronous object instantiation

        :meta private:
        :return: self
        '''
        return self

    def log_debug(self,*args,**kwargs):
        self.__log.debug(*args,**kwargs)

    def log_info(self,*args,**kwargs):
        self.__log.info(*args,**kwargs)

    def log_warn(self,*args,**kwargs):
        self.__log.warn(*args,**kwargs)

    def log_error(self,*args,**kwargs):
        self.__log.error(*args,**kwargs)

    def log_crit(self,*args,**kwargs):
        self.__log.critical(*args,**kwargs)
        sys.exit(1)

    async def addToMediaConfiguration(self, media_config: MediaConfiguration) -> bool:
        '''Add this M8Output to the list of outputs for a MediaConfiguration
        '''
        if media_config not in self.__attachedTo:
            try:
                if await media_config.attachM8Output(self):
                    self.__attachedTo += [media_config]
                    return True
                else:
                    self.log_warn('MediaConfiguration refused attachment')
            except Exception as ex:
                self.log_error(f'Failed to attach to a MediaConfiguration: {ex.what()}')
        else:
            self.log_warn('Already attached to that MediaConfiguration')
        return False

    async def removeFromMediaConfiguration(self, media_config: MediaConfiguration) -> bool:
        '''Remove this M8Output formatter from the list of outputs for a MediaConfiguration
        '''
        if media_config in self.__attachedTo:
            try:
                if await media_config.detachM8Output(self):
                    self.__attachedTo.remove(media_config)
                    return True
                else:
                    self.log_warn('MediaConfiguration refused to detach M8Output')
            except Exception as ex:
                self.log_error(f'Failed to detach from a MediaConfiguration: {ex.what()}')
        else:
            self.log_warn('Not attached to that MediaConfiguration')
        return False

    async def removeFromAllMediaConfigurations(self) -> bool:
        '''Detach this M8Output from all MediaConfigurations its already attached to
        '''
        return functools.reduce(lambda x,y: x and y, [await self.removeFromMediaConfiguration(mc) for mc in self.__attachedTo])

    async def writeOutput(self, media_config: MediaConfiguration):
        '''Write out the M8 static file(s) for this formatter
        '''
        raise NotImplemented('The writeOutput method has not been implemented')

    @property
    def root_dir(self) -> str:
        return self.__root_dir
