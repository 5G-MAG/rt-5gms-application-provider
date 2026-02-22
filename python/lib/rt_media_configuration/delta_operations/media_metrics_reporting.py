#!/usr/bin/python3 
#==============================================================================
# 5G-MAG Reference Tools: MediaMetricsReportingDeltaOperation class
#==============================================================================
#
# File: rt_media_configuration/delta_operations/media_metrics_reporting.py
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
5G-MAG Reference Tools: MediaMetricsReportingDeltaOperation Class
=====================================================
Copyright: (C) 2024 British Broadcasting Corporation
Author(s): David Waring <david.waring2@bbc.co.uk>
Licence: 5G-MAG Public License (v1.0)

For full license terms please see the LICENSE file distributed with this
program. If this file is missing then the license can be retrieved from
https://drive.google.com/file/d/1cinCiA778IErENZ3JN52VFW-1ffHpx7Z/view
=====================================================

This module provides the MediaMetricsReportingDeltaOperation classes which
holds operation parameters for changes to MetricsReportingConfiguration
objects.
'''
from typing import Optional

from rt_m1_client.session import M1Session
from rt_m1_client.types import MetricsReportingConfiguration, Snssai

from ..media_session import MediaSession
from ..media_metrics_reporting_configuration import MediaMetricsReportingConfiguration
from ..snssai import Snssai as MediaSnssai

from .delta_operation import DeltaOperation

class MediaMetricsReportingDeltaOperation(DeltaOperation):
    '''DeltaOperation class for MetricsReportingConfiguration
    '''

    def __init__(self, session: MediaSession, *, add: Optional[MediaMetricsReportingConfiguration] = None,
                 remove: Optional[str] = None):
        if sum(1 for p in [add,remove] if p is not None) != 1:
            raise ValueError('MediaMetricsReportingDeltaOperation must be initialised as an "add" or "remove" operation')
        super().__init__(session)
        self.__is_add = add is not None
        if self.__is_add:
            self.__mmrc: MediaMetricsReportingConfiguration = add
        else:
            self.__mmrc_id: str = remove

    def __str__(self):
        if self.__is_add:
            return f'Add MetricsReportingConfiguration to ProvisioningSession "{self.session.identity()}"'
        return f'Remove MetricsReportingConfiguration "{self.__mmrc_id}" from ProvisioningSession "{self.session.identity()}"'

    def __repr__(self):
        ret = super().__repr__()[:-1]
        if self.__is_add:
            ret += f', add={self.__mmrc!r}'
        else:
            ret += f', remove={self.__mmrc_id!r}'
        ret += ')'
        return ret

    async def apply_delta(self, m1_session: M1Session, update_container: bool = True) -> bool:
        '''Apply this delta to the session via M1Session
        '''
        if self.__is_add:
            mrc = self.__metricsReportingConfiguration3GPPObject(self.__mmrc)
            mrc_id = await m1_session.metricsReportingConfigurationCreate(self.session.identity(), mrc)
            if mrc_id is None:
                return False
            self.__mmrc.metrics_reporting_configuration_id = mrc_id
            if update_container:
                self.session.addMetricsReportingConfiguration(self.__mmrc)
        else:
            if not await m1_session.metricsReportingConfigurationDelete(self.session.identity(), self.__mmrc_id):
                return False
            if update_container:
                rc = self.session.reporting_configurations
                if rc is not None and rc.metrics is not None:
                    for metric in rc.metrics:
                        if metric.metrics_reporting_configuration_id == self.__mmrc_id:
                            self.session.removeMetricsReportingConfiguration(metric)
                            break
        return True

    @staticmethod
    def __metricsReportingConfiguration3GPPObject(mmrc: MediaMetricsReportingConfiguration) -> MetricsReportingConfiguration:
        mrc = {'samplingPeriod': mmrc.sampling_period}
        if mmrc.metrics_reporting_configuration_id is not None:
            mrc['metricsReportingConfigurationId'] = mmrc.metrics_reporting_configuration_id
        if mmrc.scheme is not None:
            mrc['scheme'] = mmrc.scheme
        if mmrc.data_network_name is not None:
            mrc['dataNetworkName'] = mmrc.data_network_name
        if mmrc.reporting_interval is not None:
            mrc['reportingInterval'] = mmrc.reporting_interval
        if mmrc.sample_percentage is not None:
            mrc['samplePercentage'] = mmrc.sample_percentage
        if mmrc.url_filters is not None:
            mrc['urlFilters'] = mmrc.url_filters
        if mmrc.metrics is not None:
            mrc['metrics'] = mmrc.metrics
        if mmrc.slice_scope is not None:
            mrc['sliceScope'] = [MediaMetricsReportingDeltaOperation.__snssai3GPPObject(snssai) for snssai in mmrc.slice_scope]
        return mrc

    @staticmethod
    def __snssai3GPPObject(snssai: MediaSnssai) -> Snssai:
        sns = {'sst': snssai.sst}
        if snssai.sd is not None:
            sns['sd'] = snssai.sd
        return sns
