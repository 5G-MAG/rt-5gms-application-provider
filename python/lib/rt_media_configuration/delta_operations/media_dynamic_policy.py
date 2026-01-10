#!/usr/bin/python3 
#==============================================================================
# 5G-MAG Reference Tools: MediaDynamicPolicyDeltaOperation class
#==============================================================================
#
# File: rt_media_configuration/delta_operations/media_dynamic_policy.py
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
5G-MAG Reference Tools: MediaDynamicPolicyDeltaOperation Class
=====================================================
Copyright: (C) 2024 British Broadcasting Corporation
Author(s): David Waring <david.waring2@bbc.co.uk>
Licence: 5G-MAG Public License (v1.0)

For full license terms please see the LICENSE file distributed with this
program. If this file is missing then the license can be retrieved from
https://drive.google.com/file/d/1cinCiA778IErENZ3JN52VFW-1ffHpx7Z/view
=====================================================

This module provides the MediaDynamicPolicyDeltaOperation class which holds
operation parameters for manipulating PolicyTemplate objects.
'''
from typing import Optional, Tuple

from rt_m1_client.session import M1Session
from rt_m1_client.types import PolicyTemplate, ChargingSpecification, M1QoSSpecification, AppSessionContext, Snssai, SponsoringStatus

from ..media_session import MediaSession
from ..media_dynamic_policy import MediaDynamicPolicy
from ..media_dynamic_policy_session_context import MediaDynamicPolicySessionContext
from ..media_qos_parameters import MediaQoSParameters
from ..media_charging_specification import MediaChargingSpecification
from ..snssai import Snssai as MediaSnssai

from .delta_operation import DeltaOperation

class MediaDynamicPolicyDeltaOperation(DeltaOperation):
    '''Interface class for DeltaOperation classes
    '''

    def __init__(self, session: MediaSession, *, add: Optional[MediaDynamicPolicy] = None,
                 update: Optional[Tuple[str,MediaDynamicPolicy]] = None, remove: Optional[str] = None):
        if sum(1 for p in [add,update,remove] if p is not None) != 1:
            raise ValueError('MediaDynamicPolicyDeltaOperation must be initialised as an "add", "remove" or "update" operation')
        super().__init__(session)
        self.__is_add = add is not None
        self.__is_update = update is not None
        self.__is_remove = remove is not None
        if self.__is_add:
            self.__policy = add
        if self.__is_update:
            (self.__policy_id, self.__policy) = update
        if self.__is_remove:
            self.__policy_id = remove

    def __str__(self):
        if self.__is_add:
            return f'Add PolicyTemplate to ProvisioningSession "{self.session.identity()}"'
        if self.__is_update:
            return f'Update PolicyTemplate "{self.__policy_id}" in ProvisioningSession "{self.session.identity()}"'
        return f'Remove PolicyTemplate "{self.__policy_id}" from ProvisioningSession "{self.session.identity()}"'

    def __repr__(self):
        ret = super().__repr__()[:-1]
        if self.__is_add:
            ret += f', add={self.__policy!r}'
        if self.__is_update:
            ret += f', update=({self.__policy_id!r},{self.__policy!r})'
        if self.__is_remove:
            ret += f', remove={self.__policy_id!r}'
        ret += ')'
        return ret

    async def apply_delta(self, m1_session: M1Session, update_container: bool = True) -> bool:
        '''Apply this delta to the session via M1Session
        '''
        if self.__is_add:
            pt = self.__policyTemplate3GPPObject(self.__policy)
            policy_id = await m1_session.policyTemplateCreate(self.session.identity(), pt)
            if policy_id is None:
                return False
            self.__policy.policy_template_id = policy_id
            if update_container:
                self.session.addDynamicPolicy(policy_id, self.__policy)
        elif self.__is_update:
            pt = self.__policyTemplate3GPPObject(self.__policy)
            policy_id = await m1_session.policyTemplateUpdate(self.session.identity(), self.__policy_id, pt)
            if policy_id is None:
                return False
            if update_container:
                self.session.addDynamicPolicy(self.__policy_id, self.__policy)
        else:
            if not await m1_session.policyTemplateDelete(self.session.identity(), self.__policy_id):
                return False
            if update_container:
                self.session.removeDynamicPolicy(self.__policy_id)
        return True

    @staticmethod
    def __policyTemplate3GPPObject(mdp: MediaDynamicPolicy) -> PolicyTemplate:
        pt = {'externalReference': mdp.id}
        if mdp.policy_template_id is not None:
            pt['policyTemplateId'] = mdp.policy_template_id
        if mdp.session_context is not None:
            pt['applicationSessionContext'] = MediaDynamicPolicyDeltaOperation.__appSessionContext3GPPObject(mdp.session_context)
        if mdp.qos_parameters is not None:
            pt['qoSSpecification'] = MediaDynamicPolicyDeltaOperation.__m1QoSSpecification3GPPObject(mdp.qos_parameters)
        if mdp.charging is not None:
            pt['chargingSpecification'] = MediaDynamicPolicyDeltaOperation.__chargingSpecification3GPPObject(mdp.charging)
        return pt

    @staticmethod
    def __appSessionContext3GPPObject(masc: MediaDynamicPolicySessionContext) -> AppSessionContext:
        asc = {}
        if masc.snssai is not None:
            asc['sliceInfo'] = MediaDynamicPolicyDeltaOperation.__snssai3GPPObject(masc.snssai)
        if masc.dnn is not None:
            asc['dnn'] = masc.dnn
        return asc

    @staticmethod
    def __snssai3GPPObject(sns: MediaSnssai) -> Snssai:
        snssai = {'sst': sns.sst}
        if sns.sd is not None:
            snssai['sd'] = sns.sd
        return snssai

    @staticmethod
    def __m1QoSSpecification3GPPObject(qos: MediaQoSParameters) -> M1QoSSpecification:
        m1_qos = {}
        if qos.reference is not None:
            m1_qos['qosReference'] = qos.reference
        if qos.max_auth_bitrate_uplink is not None:
            m1_qos['maxAuthBtrUl'] = str(qos.max_auth_bitrate_uplink)
        if qos.max_auth_bitrate_downlink is not None:
            m1_qos['maxAuthBtrDl'] = str(qos.max_auth_bitrate_downlink)
        if qos.default_packet_loss_rate_uplink is not None:
            m1_qos['defPacketLossRateUl'] = qos.default_packet_loss_rate_uplink
        if qos.default_packet_loss_rate_downlink is not None:
            m1_qos['defPacketLossRateDl'] = qos.default_packet_loss_rate_downlink
        return m1_qos

    @staticmethod
    def __chargingSpecification3GPPObject(charging: MediaChargingSpecification) -> ChargingSpecification:
        cs = {}
        if charging.sponsor_id is not None:
            cs['sponId'] = charging.sponsor_id
        if charging.enabled is not None:
            cs['sponStatus'] = str({True: SponsoringStatus.SPONSOR_ENABLED, False: SponsoringStatus.SPONSOR_DISABLED}[charging.enabled])
        if charging.gpsis is not None:
            cs['gpsi'] = [str(gpsi) for gpsi in charging.gpsis]
        return cs
