# 5G-MAG Reference Tools: MediaDynamicPolicy class
#==============================================================================
#
# File: rt_media_configuration/media_dynamic_policy.py
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
5G-MAG Reference Tools: MediaDynamicPolicy Class
=====================================================
Copyright: (C) 2024 British Broadcasting Corporation
Author(s): David Waring <david.waring2@bbc.co.uk>
Licence: 5G-MAG Public License (v1.0)

For full license terms please see the LICENSE file distributed with this
program. If this file is missing then the license can be retrieved from
https://drive.google.com/file/d/1cinCiA778IErENZ3JN52VFW-1ffHpx7Z/view
=====================================================

This module provides the MediaDynamicPolicy class which models the QoS
settings to apply to a MediaEntry.
'''

import json
from typing import Optional

from .media_dynamic_policy_session_context import MediaDynamicPolicySessionContext
from .media_qos_parameters import MediaQoSParameters
from .media_charging_specification import MediaChargingSpecification

class MediaDynamicPolicy:
    '''MediaDynamicPolicy class
========================
This class models the QoS parameters, charging rules and application rules for dynamic policy activation in a MediaEntry.
'''

    def __init__(self, local_id: Optional[str] = None, policy_template_id: Optional[str] = None,
                 session_context: Optional[MediaDynamicPolicySessionContext] = None,
                 qos_parameters: Optional[MediaQoSParameters] = None, charging: Optional[MediaChargingSpecification] = None):
        self.id = local_id
        self.policy_template_id = policy_template_id
        self.session_context = session_context
        self.qos_parameters = qos_parameters
        self.charging = charging

    def __await__(self):
        return self.__asyncInit().__await__()

    async def __asyncInit(self):
        '''Asynchronous object instantiation
        :meta private:
        :return: self
        '''
        return self

    def __eq__(self, other: "MediaDynamicPolicy") -> bool:
        if self.__session_context != other.__session_context:
            return False
        if self.__qos_parameters != other.__qos_parameters:
            return False
        return self.__charging == other.__charging

    def __ne__(self, other: "MediaDynamicPolicy") -> bool:
        return not (self == other)

    def __repr__(self) -> str:
        '''Python constructor string for this object'''
        ret = f'{self.__class__.__name__}('
        np = ""
        if self.__id is not None:
            ret += f'local_id={self.__id!r}'
            np = ', '
        if self.__policy_template_id is not None:
            ret += f'{np}policy_template_id={self.__policy_template_id!r}'
            np = ', '
        if self.__session_context is not None:
            ret += f'{np}session_context={self.__session_context!r}'
            np = ", "
        if self.__qos_parameters is not None:
            ret += f'{np}qos_parameters={self.__qos_parameters!r}'
            np = ", "
        if self.__charging is not None:
            ret += f'{np}charging={self.__charging!r}'
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

    def identity(self) -> Optional[str]:
        if self.__policy_template_id is not None:
            return self.__policy_template_id
        return self.__id

    @staticmethod
    def deserialise(json_obj: str) -> "MediaDynamicPolicy":
        try:
            obj = json.loads(json_obj)
        except json.JSONDecodeError:
            raise ValueError("Bad JSON")

        return MediaDynamicPolicy.fromJSONObject(obj)

    @staticmethod
    def fromJSONObject(obj: dict) -> "MediaDynamicPolicy":
        kwargs = {}
        for k,v in obj.items():
            if k == "applicationSessionContext":
                kwargs["session_context"] = MediaDynamicPolicySessionContext.fromJSONObject(v)
            elif k == "qoSSpecification":
                kwargs["qos_parameters"] = MediaQoSParameters.fromJSONObject(v)
            elif k == "chargingSpecification":  
                kwargs["charging"] = MediaChargingSpecification.fromJSONObject(v)
            elif k == "policyTemplateId":
                kwargs['policy_template_id'] = v
            else:
                raise TypeError(f'MediaDynamicPolicy: JSON field "{k}" not understood')
        return MediaDynamicPolicy(**kwargs)

    def jsonObject(self) -> dict:
        obj = {'externalReference': self.__id}
        if self.__policy_template_id is not None:
            obj['policyTemplateId'] = self.__policy_template_id
        if self.__session_context is not None:
            obj['applicationSessionContext'] = self.__session_context.jsonObject()
        if self.__qos_parameters is not None:
            qos = {}
            if self.__qos_parameters.reference is not None:
                qos['qosReference'] = self.__qos_parameters.reference
            if self.__qos_parameters.max_auth_bitrate_uplink is not None:
                qos['maxAuthBtrUl'] = str(self.__qos_parameters.max_auth_bitrate_uplink)
            if self.__qos_parameters.max_auth_bitrate_downlink is not None:
                qos['maxAuthBtrDl'] = str(self.__qos_parameters.max_auth_bitrate_downlink)
            if self.__qos_parameters.default_packet_loss_rate_uplink is not None:
                qos['defPacketLossRateUl'] = self.__qos_parameters.default_packet_loss_rate_uplink
            if self.__qos_parameters.default_packet_loss_rate_downlink is not None:
                qos['defPacketLossRateDl'] = self.__qos_parameters.default_packet_loss_rate_downlink
            obj['qoSSpecification'] = qos
        if self.__charging is not None:
            cs = {}
            if self.__charging.sponsor_id is not None:
                cs['sponId'] = self.__charging.sponsor_id
            if self.__charging.enabled is not None:
                cs['sponStatus'] = 'SPONSOR_ENABLED' if self.__charging.enabled else 'SPONSOR_DISABLED'
            if self.__charging.gpsis is not None:
                cs['gpsi'] = [str(gpsi) for gpsi in self.__charging.gpsis]
            obj['chargingSpecification'] = cs
        return obj

    @property
    def id(self) -> Optional[str]:
        return self.__id

    @id.setter
    def id(self, value: Optional[str]):
        if value is not None:
            if not isinstance(value,str):
                raise TypeError('MediaDynamicPolicy.id must be either a str or None')
        self.__id = value

    @property
    def policy_template_id(self) -> Optional[str]:
        return self.__policy_template_id

    @policy_template_id.setter
    def policy_template_id(self, value: Optional[str]):
        if value is not None:
            if not isinstance(value,str):
                raise TypeError('MediaDynamicPolicy.policy_template_id must be either a str or None')
        self.__policy_template_id = value

    @property
    def session_context(self) -> Optional[MediaDynamicPolicySessionContext]:
        return self.__session_context

    @session_context.setter
    def session_context(self, value: Optional[MediaDynamicPolicySessionContext]):
        if value is not None:
            if not isinstance(value, MediaDynamicPolicySessionContext):
                raise TypeError('MediaDynamicPolicy.session_context can be either None or a MediaDynamicPolicySessionContext')
        self.__session_context = value

    @property
    def qos_parameters(self) -> Optional[MediaQoSParameters]:
        return self.__qos_parameters

    @qos_parameters.setter
    def qos_parameters(self, value: Optional[MediaQoSParameters]):
        if value is not None:
            if not isinstance(value, MediaQoSParameters):
                raise TypeError('MediaDynamicPolicy.qos_parameters can be either None or a MediaQoSParameters object')
        self.__qos_parameters = value

    @property
    def charging(self) -> Optional[MediaChargingSpecification]:
        return self.__charging

    @charging.setter
    def charging(self, value: Optional[MediaChargingSpecification]):
        if value is not None:
            if not isinstance(value, MediaChargingSpecification):
                raise TypeError('MediaDynamicPolicy.charging can be either None or a MediaChargingSpecification object')
        self.__charging = value

    @classmethod
    async def from3GPPObject(cls, pt: dict) -> "MediaDynamicPolicy":
        kwargs = {}
        if 'externalReference' in pt:
            kwargs['local_id'] = pt['externalReference']
        if 'policyTemplateId' in pt:
            kwargs['policy_template_id'] = pt['policyTemplateId']

        if 'applicationSessionContext' in pt:
            kwargs['session_context'] = MediaDynamicPolicySessionContext.fromJSONObject(pt['applicationSessionContext'])

        if 'qoSSpecification' in pt:
            qos_dict = pt['qoSSpecification'].copy()
            bitrate_fields = ['maxAuthBtrUl', 'maxAuthBtrDl', 'maxBtrUl', 'maxBtrDl']
            for field in bitrate_fields:
                if field in qos_dict:
                    qos_dict[field] = str(qos_dict[field])
            kwargs['qos_parameters'] = MediaQoSParameters.fromJSONObject(qos_dict)

        if 'chargingSpecification' in pt:
            m1_charge = pt['chargingSpecification']
            internal_charge = {}            
            if 'sponId' in m1_charge:
                internal_charge['sponId'] = m1_charge['sponId']
            if 'sponStatus' in m1_charge:
                status_str = str(m1_charge['sponStatus'])
                internal_charge['sponsorEnabled'] = (status_str == 'SPONSOR_ENABLED')
            if 'gpsi' in m1_charge:
                internal_charge['gpsi'] = m1_charge['gpsi']
            kwargs['charging'] = MediaChargingSpecification.fromJSONObject(internal_charge)
        return cls(**kwargs)