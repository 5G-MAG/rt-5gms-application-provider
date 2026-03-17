#!/usr/bin/python3
#==============================================================================
# 5G-MAG Reference Tools: M1 Session
#==============================================================================
#
# File: rt_media_configuration/importers/m1_importer.py
# License: 5G-MAG Public License (v1.0)
# Author: David Waring
# Copyright: (C) 2024 British Broadcasting Corporation
#
# For full license terms please see the LICENSE file distributed with this
# program. If this file is missing then the license can be retrieved from
# https://drive.google.com/file/d/1cinCiA778IErENZ3JN52VFW-1ffHpx7Z/view
#
#==============================================================================
#
# This module provides the M1SessionImporter class to import the current state
# of the AF (via M1Session class and DataStore) into a MediaConfiguration.
'''5G-MAG Reference Tools: M1Session Importer module
=================================================

This module provides the M1SessionImporter class to import the current state
of the AF (via M1Session class and DataStore) into a MediaConfiguration.
'''

from typing import Optional, Union, Tuple, List

import OpenSSL.crypto

from rt_m1_client import M1Session, DataStore, CertificateSigner, PROVISIONING_SESSION_TYPE_DOWNLINK, ProvisioningSession

from ..media_session import MediaSession
from ..media_entry import MediaEntry
from ..media_distribution import MediaDistribution
from ..media_entry_point import MediaEntryPoint
from ..media_server_certificate import MediaServerCertificate
from ..media_reporting_configuration import MediaReportingConfiguration
from ..media_consumption_reporting_configuration import MediaConsumptionReportingConfiguration
from ..media_metrics_reporting_configuration import MediaMetricsReportingConfiguration
from ..media_dynamic_policy import MediaDynamicPolicy

from .importer import MediaConfigurationImporter

class M1SessionImporter(MediaConfigurationImporter):
    '''M1SessionImporter class
=======================
This class reads the current configuration, via M1Session, from the AF and
supplementary information from the DataStore and uses it to populate a
MediaConfiguration model.
    '''

    def __init__(self, authority_or_session: Union[Tuple[str, int],M1Session], *, persistent_data_store: Optional[DataStore] = None, certificate_signer: Optional[Union[CertificateSigner,type,str]] = None):
        '''Constructor
        '''
        super().__init__()
        if isinstance(authority_or_session, M1Session):
            self.__authority = authority_or_session.authority()
            self.__data_store = authority_or_session.data_store()
            self.__certificate_signer = authority_or_session.certificate_signer()
            self.__session = authority_or_session
        else:
            if persistent_data_store is None:
                raise ValueError('M1SessionImporter must be given a DataStore when initialised with an authority tuple')
            self.__authority = authority_or_session
            self.__data_store = persistent_data_store
            self.__certificate_signer = certificate_signer
            self.__session = None
        self.__psid_to_id_map = {}

    async def _asyncInit(self):
        '''Asynchronous object instantiation

        :meta private:
        :return: self
        '''
        await super()._asyncInit()
        if self.__session is None:
            self.__session = await M1Session(self.__authority, persistent_data_store=self.__data_store, certificate_signer=self.__certificate_signer)
        await self.__loadFromDataStore()
        return self

    async def import_to(self, model: "MediaConfiguration") -> bool:
        '''Import the model into ``model``.
        '''
        await model.reset()
        provisioning_ids = await self.__session.getProvisioningSessionIds()
        for psid in provisioning_ids:
            ps = await self.__session.provisioningSessionGet(psid)
            if ps is not None:
                session = await MediaSession(ps['provisioningSessionType']==PROVISIONING_SESSION_TYPE_DOWNLINK, ps['appId'], provisioning_session_id=psid, asp_id=ps.get('aspId',None))
                await model.addMediaSession(session)
                if 'serverCertificateIds' in ps:
                    for cert_id in ps['serverCertificateIds']:
                        public_cert = await self.__session.certificateGet(psid, cert_id)
                        domain_names = []
                        if public_cert is not None:
                            domain_names = await self.__extract_domains_from_public_cert_pem(public_cert)
                        session.addCertificate(await MediaServerCertificate(certificate_id=cert_id, domain_names=domain_names, public_cert=public_cert))
                chc = await self.__session.provisioningSessionContentHostingConfiguration(psid)
                if chc is not None:
                    dcs = [await MediaDistribution.from3GPPObject(dc) for dc in chc['distributionConfigurations']]
                    entry = await MediaEntry(chc['name'], chc['ingestConfiguration']['baseURL'], dcs)
                    entry.app_distributions = await model.get_data_store_app_distributions(psid)
                    entry.id = self.__psid_to_id_map.get(psid, psid)
                    entry.provisioning_session_id = psid
                    session.media_entry = entry
                reporting = None
                crc = await self.__session.consumptionReportingConfigurationGet(psid)
                if crc is not None:
                    consumption_reporting = await MediaConsumptionReportingConfiguration.from3GPPObject(crc)
                    reporting = await MediaReportingConfiguration(consumption_reporting=consumption_reporting)
                if 'metricsReportingConfigurationIds' in ps:
                    for mrc_id in ps['metricsReportingConfigurationIds']:
                        mrc = await self.__session.metricsReportingConfigurationGet(psid, mrc_id)
                        if mrc is not None:
                            metrics_reporting = await MediaMetricsReportingConfiguration.from3GPPObject(mrc)
                            if reporting is None:
                                reporting = await MediaReportingConfiguration(metrics_reporting=[metrics_reporting])
                            else:
                                reporting.addMetricsReporting(metrics_reporting)
                if reporting is not None:
                    session.reporting_configurations = reporting
                if 'policyTemplateIds' in ps:
                    for policy_id in ps['policyTemplateIds']:
                        pt = await self.__session.policyTemplateGet(psid, policy_id)
                        dynamic_policy = await MediaDynamicPolicy.from3GPPObject(pt)
                        session.addDynamicPolicy(dynamic_policy.policy_template_id, dynamic_policy)
                # TODO: contentPreparationTemplateIds, edgeResourcesConfigurationIds & eventDataProcessingConfigurationIds
        
        return True

    async def __loadFromDataStore(self):
        self.__psid_to_id_map = await self.__data_store.get('media-configuration-psid-map', {})

    async def __extract_domains_from_public_cert_pem(self, public_cert: str) -> Optional[List[str]]:
        ret = set()
        x509 = OpenSSL.crypto.load_certificate(OpenSSL.crypto.FILETYPE_PEM, public_cert)
        subject = x509.get_subject()
        #ret.add(subject.commonName)
        for ext_num in range(x509.get_extension_count()):
            ext = x509.get_extension(ext_num)
            ext_name = ext.get_short_name().decode('utf-8')
            if ext_name == "subjectAltName":
                for s in str(ext).split(','):
                    ret.add(s.strip().split(':',1)[1])
        ret.remove(subject.commonName)
        return list(ret)


