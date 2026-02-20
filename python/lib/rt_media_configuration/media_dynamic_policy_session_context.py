#!/usr/bin/python3 
#==============================================================================
# 5G-MAG Reference Tools: MediaDynamicPolicySessionContext class
#==============================================================================
#
# File: rt_media_configuration/media_entry.py
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
5G-MAG Reference Tools: MediaDynamicPolicySessionContext Class
=====================================================
Copyright: (C) 2024 British Broadcasting Corporation
Author(s): David Waring <david.waring2@bbc.co.uk>
Licence: 5G-MAG Public License (v1.0)

For full license terms please see the LICENSE file distributed with this
program. If this file is missing then the license can be retrieved from
https://drive.google.com/file/d/1cinCiA778IErENZ3JN52VFW-1ffHpx7Z/view
=====================================================

This module provides the MediaDynamicPolicySessionContext class which models
a MediaDynamicPolicy application session context filter.
'''

import json
from typing import Optional

from .snssai import Snssai

class MediaDynamicPolicySessionContext:
    '''MediaDynamicPolicySessionContext class
======================================
Tis class models a MediaDynamicPolicy application session context filter.
'''

    def __init__(self, snssai: Optional[Snssai] = None, dnn: Optional[str] = None):
        self.snssai = snssai
        self.dnn = dnn

    def __await__(self):
        return self.__asyncInit().__await__()

    async def __asyncInit(self):
        '''Asynchronous object instantiation
        :meta private:
        :return: self
        '''
        return self

    def __eq__(self, other: "MediaDynamicPolicySessionContext") -> bool:
        if not isinstance(other, MediaDynamicPolicySessionContext):
            return False
        if (self.snssai is None) != (other.snssai is None):
            return False
        if self.snssai is not None and self.snssai != other.snssai:
            return False
        return (self.dnn == other.dnn)

    def __ne__(self, other: "MediaDynamicPolicySessionContext") -> bool:
        return not (self == other)

    def __repr__(self) -> str:
        '''Python constructor string for this object'''
        ret = f'{self.__class__.__name__}('
        np=""
        if self.snssai is not None:
            ret += f'snssai={self.snssai!r}'
            np = ", "
        if self.dnn is not None:
            ret += f'{np}dnn={self.dnn!r}'
        ret += ')'
        return ret

    def __str__(self) -> str:
        return self.serialise(pretty=True)

    def serialise(self, pretty: bool = False) -> str:
        from .media_configuration import MediaConfiguration
        kwargs = {}
        if pretty:
            kwargs = {"sort_keys": True, "indent": 4}
        return json.dumps(self, default=MediaConfiguration.jsonObjectHandler, **kwargs)

    @staticmethod
    def deserialise(json_obj: str) -> "MediaDynamicPolicySessionContext":
        try:
            obj = json.loads(json_obj)
        except json.JSONDecodeError:
            raise ValueError("Bad JSON")

        return MediaDynamicPolicySessionContext.fromJSONObject(obj)

    @staticmethod
    def fromJSONObject(obj: dict) -> "MediaDynamicPolicySessionContext":
        kwargs = {}
        for k,v in obj.items():
            if k == "sliceInfo":
                kwargs["snssai"] = Snssai.fromJSONObject(v)
            elif k == "dnn":
                kwargs["dnn"] = v
            else:
                raise TypeError(f'MediaDynamicPolicySessionContext: JSON field "{k}" not understood')
        return MediaDynamicPolicySessionContext(**kwargs)

    def jsonObject(self) -> dict:
        obj = {}
        if self.snssai is not None:
            obj['sliceInfo'] = self.snssai.jsonObject()
        if self.dnn is not None:
            obj['dnn'] = self.dnn
        return obj

    @property
    def snssai(self) -> Optional[Snssai]:
        return self.__snssai

    @snssai.setter
    def snssai(self, value: Optional[Snssai]):
        if value is not None:
            if not isinstance(value, Snssai):
                raise TypeError('MediaDynamicPolicySessionContext.snssai can be either None or a Snssai object')
        self.__snssai = value

    @property
    def dnn(self) -> Optional[str]:
        return self.__dnn

    @dnn.setter
    def dnn(self, value: Optional[str]):
        if value is not None:
            if not isinstance(value, str):
                raise TypeError('MediaDynamicPolicySessionContext.snssai can be either None or a str')
        self.__dnn = value
