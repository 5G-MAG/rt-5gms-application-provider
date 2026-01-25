#!/usr/bin/python3 
#==============================================================================
# 5G-MAG Reference Tools: MediaQoSParameters class
#==============================================================================
#
# File: rt_media_configuration/media_qos_parameters.py
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
5G-MAG Reference Tools: MediaQoSParameters Class
=====================================================
Copyright: (C) 2024 British Broadcasting Corporation
Author(s): David Waring <david.waring2@bbc.co.uk>
Licence: 5G-MAG Public License (v1.0)

For full license terms please see the LICENSE file distributed with this
program. If this file is missing then the license can be retrieved from
https://drive.google.com/file/d/1cinCiA778IErENZ3JN52VFW-1ffHpx7Z/view
=====================================================

This module provides the MediaQoSParameters class which models QoS
parameters settings.
'''

import json
from typing import Optional

from .bitrate import Bitrate

class MediaQoSParameters:
    '''MediaQoSParameters class
========================
This models QoS parameters for 3GPP systems.
'''

    def __init__(self, reference: Optional[str] = None, max_auth_bitrate_uplink: Optional[Bitrate] = None,
                 max_auth_bitrate_downlink: Optional[Bitrate] = None, default_packet_loss_rate_uplink: Optional[int] = None,
                 default_packet_loss_rate_downlink: Optional[int] = None):
        self.reference = reference
        self.max_auth_bitrate_uplink = max_auth_bitrate_uplink
        self.max_auth_bitrate_downlink = max_auth_bitrate_downlink
        self.default_packet_loss_rate_uplink = default_packet_loss_rate_uplink
        self.default_packet_loss_rate_downlink = default_packet_loss_rate_downlink

    def __await__(self):
        return self.__asyncInit().__await__()

    async def __asyncInit(self):
        '''Asynchronous object instantiation
        :meta private:
        :return: self
        '''
        return self

    def __eq__(self, other: "MediaQoSParameters") -> bool:
        if not isinstance(other, MediaQoSParameters):
            return False
        if self.__reference != other.__reference:
            return False
        if (self.__max_auth_bitrate_uplink is None) != (other.__max_auth_bitrate_uplink is None):
            return False
        if self.__max_auth_bitrate_uplink is not None and self.__max_auth_bitrate_uplink != other.__max_auth_bitrate_uplink:
            return False
        if (self.__max_auth_bitrate_downlink is None) != (other.__max_auth_bitrate_downlink is None):
            return False
        if self.__max_auth_bitrate_downlink is not None and self.__max_auth_bitrate_downlink != other.__max_auth_bitrate_downlink:
            return False
        if self.__default_packet_loss_rate_uplink != other.__default_packet_loss_rate_uplink:
            return False
        return self.__default_packet_loss_rate_downlink == other.__default_packet_loss_rate_downlink

    def __ne__(self, other: "MediaQoSParameters") -> bool:
        return not (self == other)

    def __repr__(self) -> str:
        '''Python constructor string for this object'''
        ret = f'{self.__class__.__name__}('
        np = ""
        if self.__reference is not None:
            ret += f'reference={self.__reference!r}'
            np = ", "
        if self.__max_auth_bitrate_uplink is not None:
            ret += f'{np}max_auth_bitrate_uplink={self.__max_auth_bitrate_uplink!r}'
            np = ", "
        if self.__max_auth_bitrate_downlink is not None:
            ret += f'{np}max_auth_bitrate_downlink={self.__max_auth_bitrate_downlink!r}'
            np = ", "
        if self.__default_packet_loss_rate_uplink is not None:
            ret += f'{np}default_packet_loss_rate_uplink={self.__default_packet_loss_rate_uplink!r}'
            np = ", "
        if self.__default_packet_loss_rate_downlink is not None:
            ret += f'{np}default_packet_loss_rate_downlink={self.__default_packet_loss_rate_downlink!r}'
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
    def deserialise(json_obj: str) -> "MediaQoSParameters":
        try:
            obj = json.loads(json_obj)
        except json.JSONDecodeError:
            raise ValueError("Bad JSON")

        return MediaQoSParameters.fromJSONObject(obj)

    @staticmethod
    def fromJSONObject(obj: dict) -> "MediaQoSParameters":
        kwargs = {}
        for k,v in obj.items():
            if k == "qosReference":
                kwargs['reference'] = v
            elif k == 'maxAuthBtrUl':
                kwargs['max_auth_bitrate_uplink'] = Bitrate.fromJSONObject(v)
            elif k == 'maxAuthBtrDl':
                kwargs['max_auth_bitrate_downlink'] = Bitrate.fromJSONObject(v)
            elif k == 'defPacketLossRateUl':
                kwargs['default_packet_loss_rate_uplink'] = v
            elif k == 'defPacketLossRateDl':
                kwargs['default_packet_loss_rate_downlink'] = v
            else:
                raise TypeError(f'MediaQoSParameters: JSON field "{k}" not understood')
        return MediaQoSParameters(**kwargs)

    def jsonObject(self) -> dict:
        obj = {}
        if self.__reference is not None:
            obj["qosReference"] = self.__reference
        if self.__max_auth_bitrate_uplink is not None:
            obj['maxAuthBtrUl'] = self.__max_auth_bitrate_uplink
        if self.__max_auth_bitrate_downlink is not None:
            obj['maxAuthBtrDl'] = self.__max_auth_bitrate_downlink
        if self.__default_packet_loss_rate_uplink is not None:
            obj['defPacketLossRateUl'] = self.__default_packet_loss_rate_uplink
        if self.__default_packet_loss_rate_downlink is not None:
            obj['defPacketLossRateDl'] = self.__default_packet_loss_rate_downlink
        return obj

    @property
    def reference(self) -> Optional[str]:
        return self.__reference

    @reference.setter
    def reference(self, value: Optional[str]):
        if value is not None:
            if not isinstance(value, str):
                raise TypeError('MediaQoSParameters.reference must be either None or a str')
            if len(value) == 0:
                value = None
        self.__reference = value

    @property
    def max_auth_bitrate_uplink(self) -> Optional[Bitrate]:
        return self.__max_auth_bitrate_uplink

    @max_auth_bitrate_uplink.setter
    def max_auth_bitrate_uplink(self, value: Optional[Bitrate]):
        if value is not None:
            if isinstance(value, str):
                value = Bitrate(value)
            if not isinstance(value, Bitrate):
                raise TypeError('MediaQoSParameters.max_auth_bitrate_uplink must be either None or a Bitrate object')
        self.__max_auth_bitrate_uplink = value

    @property
    def max_auth_bitrate_downlink(self) -> Optional[Bitrate]:
        return self.__max_auth_bitrate_downlink

    @max_auth_bitrate_downlink.setter
    def max_auth_bitrate_downlink(self, value: Optional[Bitrate]):
        if value is not None:
            if isinstance(value, str):
                value = Bitrate(value)
            if not isinstance(value, Bitrate):
                raise TypeError('MediaQoSParameters.max_auth_bitrate_downlink must be either None or a Bitrate object')
        self.__max_auth_bitrate_downlink = value

    @property
    def default_packet_loss_rate_uplink(self) -> Optional[int]:
        return self.__default_packet_loss_rate_uplink

    @default_packet_loss_rate_uplink.setter
    def default_packet_loss_rate_uplink(self, value: Optional[int]):
        if value is not None:
            if not isinstance(value, int):
                raise TypeError('MediaQoSParameters.default_packet_loss_rate_uplink must be either None or an int')
            if value < 0:
                raise ValueError('MediaQoSParameters.default_packet_loss_rate_uplink must be a positive integer')
        self.__default_packet_loss_rate_uplink = value

    @property
    def default_packet_loss_rate_downlink(self) -> Optional[int]:
        return self.__default_packet_loss_rate_downlink

    @default_packet_loss_rate_downlink.setter
    def default_packet_loss_rate_downlink(self, value: Optional[int]):
        if value is not None:
            if not isinstance(value, int):
                raise TypeError('MediaQoSParameters.default_packet_loss_rate_downlink must be either None or an int')
            if value < 0:
                raise ValueError('MediaQoSParameters.default_packet_loss_rate_downlink must be a positive integer')
        self.__default_packet_loss_rate_downlink = value
