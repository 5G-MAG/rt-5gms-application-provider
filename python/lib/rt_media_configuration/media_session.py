#!/usr/bin/python3 
#==============================================================================
# 5G-MAG Reference Tools: MediaSession class
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
5G-MAG Reference Tools: MediaEntry Class
=====================================================
Copyright: (C) 2024 British Broadcasting Corporation
Author(s): David Waring <david.waring2@bbc.co.uk>
Licence: 5G-MAG Public License (v1.0)

For full license terms please see the LICENSE file distributed with this
program. If this file is missing then the license can be retrieved from
https://drive.google.com/file/d/1cinCiA778IErENZ3JN52VFW-1ffHpx7Z/view
=====================================================

This module provides the MediaSession class which models a 3GPP TS 26.512
ProvisioningSession.
'''

import datetime
import json
from typing import Optional, List, Dict, Iterable, Union, Tuple
import uuid

import OpenSSL.crypto

from .media_entry import MediaEntry
from .media_app_distribution import MediaAppDistribution
from .media_distribution import MediaDistribution
from .media_dynamic_policy import MediaDynamicPolicy
from .media_reporting_configuration import MediaReportingConfiguration
from .media_consumption_reporting_configuration import MediaConsumptionReportingConfiguration
from .media_metrics_reporting_configuration import MediaMetricsReportingConfiguration
from .media_server_certificate import MediaServerCertificate

class MediaSession:
    '''MediaSession class
==================

This class models a 3GPP TS 26.512 ProvisioningSession. The ProvisioningSession information will be published via M5.
'''

    def __init__(self, is_downlink: bool, external_app_id: str,
                 ident: Optional[str] = None, provisioning_session_id: Optional[str] = None,
                 asp_id: Optional[str] = None,
                 certificates: Optional[Dict[str, MediaServerCertificate]] = None,
                 media_entry: Optional[MediaEntry] = None,
                 reporting_configurations: Optional[MediaReportingConfiguration] = None,
                 dynamic_policies: Optional[Dict[str,MediaDynamicPolicy]] = None,
                 configuration: Optional["MediaConfiguration"] = None):
        '''Constructor

        When this object is synchronised with the 5GMS AF it will gain a `provisioning_session_id` attribute.

        :param is_downlink: True if this session is for downlink media.
        :param external_app_id: The external application id this session should be associated with.
        :param ident: A local identifier for quick reference (not published).
        :param provisioning_session_id: The identifier for this session assigned by the AF.
        :param asp_id: The Application Service Provider identifier.
        :param certificates: The server certificates for this session.
        :param media_entry: The optional MediaEntry for this session.
        :param reporting_configurations: The reporting configurations to use with this media entry for publication via M5.
        :param dynamic_policies: The QoS dynamic policies to attach to this media entry for publication via M5.
        :param configuration: The MediaConfiguration this session is attached to.
        :return: A new MediaSession object.
        '''
        from .media_configuration import MediaConfiguration
        if ident is None:
            ident = str(uuid.uuid4())
        self.is_downlink = is_downlink
        self.external_app_id = external_app_id
        self.id = ident
        self.provisioning_session_id = provisioning_session_id
        self.asp_id = asp_id
        self.certificates = certificates
        self.media_entry = media_entry
        self.reporting_configurations = reporting_configurations
        self.dynamic_policies = dynamic_policies
        self.configuration = configuration
        
    def __await__(self):
        return self.__asyncInit().__await__()

    def __eq__(self, other: "MediaSession") -> bool:
        if not self.shallow_eq(other):
            return False
        if self.__certificates != other.__certificates:
            return False
        if self.__media_entry != other.__media_entry:
            return False
        if self.__reporting_configurations != other.__reporting_configurations:
            return False
        return self.__dynamic_policies == other.__dynamic_policies

    def shallow_eq(self, other: "MediaSession") -> bool:
        if self.__is_downlink != other.__is_downlink:
            return False
        if self.__external_app_id != other.__external_app_id:
            return False
        if self.__asp_id != other.__asp_id:
            return False
        if self.__media_entry is not None:
            if other.__media_entry is None:
                return False
            if self.__media_entry.ingest_url_prefix != other.__media_entry.ingest_url_prefix:
                return False
            if self.__media_entry.is_pull != other.__media_entry.is_pull:
                return False
            if self.__media_entry.name != other.__media_entry.name:
                return False
        elif other.__media_entry is not None:
            return False
        return True

    def __ne__(self, other: "MediaSession") -> bool:
        return not (self == other)

    def __repr__(self) -> str:
        '''Python constructor string for this object'''
        ret = f'{self.__class__.__name__}(is_downlink={self.__is_downlink!r}, external_app_id={self.__external_app_id!r}'
        if self.__id is not None:
            ret += f', ident={self.__id!r}'
        if self.__provisioning_session_id is not None:
            ret += f', provisioning_session_id={self.__provisioning_session_id!r}'
        if self.__asp_id is not None:
            ret += f', asp_id={self.__asp_id!r}'
        if self.__certificates is not None:
            ret += f', certificates={self.__certificates!r}'
        if self.__media_entry is not None:
            ret += f', media_entry={self.__media_entry!r}'
        if self.__reporting_configurations is not None and (self.__reporting_configurations.consumption is not None or (self.__reporting_configurations.metrics is not None and len(self.__reporting_configurations.metrics) > 0)):
            ret += f', reporting_configurations={self.__reporting_configurations!r}'
        if self.__dynamic_policies is not None and len(self.__dynamic_policies) > 0:
            ret += f', dynamic_policies={self.__dynamic_policies!r}'
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
    def deserialise(json_obj: str) -> "MediaSession":
        try:
            obj = json.loads(json_obj)
        except json.JSONDecodeError:
            raise ValueError("Bad JSON")

        return MediaSession.fromJSONObject(obj)

    @staticmethod
    def fromJSONObject(obj: dict) -> "MediaSession":
        kwargs = {}
        mand_fields = ['appId']
        reporting = None
        media_entry = None
        external_app_id = None
        is_downlink = True
        for k,v in obj.items():
            if k == 'downlink':
                is_downlink = v
            elif k == 'appId':
                external_app_id = v
                mand_fields.remove(k)
            elif k == 'name':
                if media_entry is None:
                    if 'ingestURL' not in obj or 'distributionConfigurations' not in obj or len(obj['distributionConfigurations']) == 0:
                        raise TypeError('MediaSession: Cannot have JSON "name" field without "ingestURL" field and a "distributionConfigurations" containing at least one entry')
                    dcs = [MediaDistribution.fromJSONObject(dc) for dc in obj['distributionConfigurations']]
                    entry_kwargs = {}
                    if 'appDistributions' in obj:
                        entry_kwargs['app_distributions'] = [MediaAppDistribution.fromJSONObject(ad) for ad in obj['appDistributions']]
                    if 'pull' in obj:
                        entry_kwargs['is_pull'] = obj['pull']
                    media_entry = MediaEntry(v, obj['ingestURL'], dcs, **entry_kwargs)
                    kwargs['media_entry'] = media_entry
            elif k == 'ingestURL':
                if media_entry is None:
                    if 'name' not in obj or 'distributionConfigurations' not in obj or len(obj['distributionConfigurations']) == 0:
                        raise TypeError('MediaSession: Cannot have JSON "ingestURL" field without a "name" field and a "distributionConfigurations" containing at least one entry')
                    dcs = [MediaDistribution.fromJSONObject(dc) for dc in obj['distributionConfigurations']]
                    entry_kwargs = {}
                    if 'appDistributions' in obj:
                        entry_kwargs['app_distributions'] = [MediaAppDistribution.fromJSONObject(ad) for ad in obj['appDistributions']]
                    if 'pull' in obj:
                        entry_kwargs['is_pull'] = obj['pull']
                    media_entry = MediaEntry(obj['name'], v, dcs, **entry_kwargs)
                    kwargs['media_entry'] = media_entry
            elif k == 'distributionConfigurations':
                if media_entry is None:
                    if 'ingestURL' not in obj or 'name' not in obj or len(v) == 0:
                        raise TypeError('MediaSession: Cannot have JSON "distributionConfigurations" field which is empty or without "name" and "ingestURL" fields')
                    entry_kwargs = {}
                    if 'appDistributions' in obj:
                        entry_kwargs['app_distributions'] = [MediaAppDistribution.fromJSONObject(ad) for ad in obj['appDistributions']]
                    if 'pull' in obj:
                        entry_kwargs['is_pull'] = obj['pull']
                    media_entry = MediaEntry(obj['name'], obj['ingestURL'], [MediaDistribution.fromJSONObject(dc) for dc in v], **entry_kwargs)
                    kwargs['media_entry'] = media_entry
            elif k == 'appDistributions':
                if media_entry is None:
                    if 'name' not in obj or 'ingestURL' not in obj or 'distributionConfigurations' not in obj or len(obj['distributionConfigurations']) == 0:
                        raise TypeError('MediaSession: Cannot have JSON "appDistributions" without an "ingestUrl" and a "distributionConfigurations" containing at least one entry')
                    dcs = [MediaDistribution.fromJSONObject(dc) for dc in obj['distributionConfigurations']]
                    app_distribs = [MediaAppDistribution.fromJSONObject(ad) for ad in v]
                    media_entry = MediaEntry(obj['name'], obj['ingestURL'], dcs, app_distributions=app_distribs)
                    kwargs['media_entry'] = media_entry
            elif k == 'certificates':
                cert_items = v.values() if isinstance(v, dict) else v
                kwargs['certificates'] = {cert.identity(): cert for cert in [MediaServerCertificate.fromJSONObject(c) for c in cert_items]}
            elif k == 'consumptionReporting':
                if reporting is None:
                    reporting = MediaReportingConfiguration()
                    kwargs['reporting_configurations'] = reporting
                reporting.consumption = MediaConsumptionReportingConfiguration.fromJSONObject(v)
            elif k == 'metricsReporting':
                if reporting is None:
                    reporting = MediaReportingConfiguration()
                    kwargs['reporting_configurations'] = reporting
                for mr_obj in v:
                    reporting.addMetricsReporting(MediaMetricsReportingConfiguration.fromJSONObject(mr_obj))
            elif k == 'policies':
                kwargs['dynamic_policies'] = {}
                for extId, policy in v.items():
                    mdp = MediaDynamicPolicy.fromJSONObject(policy)
                    if mdp.id is None:
                        mdp.id = extId
                    if mdp.policy_template_id is None:
                        mdp.policy_template_id = extId
                    kwargs['dynamic_policies'][mdp.id] = mdp
            elif k == 'aspId':
                kwargs['asp_id'] = v
            else:
                raise TypeError(f'MediaSession: JSON field "{k}" not understood')
        if len(mand_fields) > 0:
            raise TypeError(f'MediaSession: mandatory fields {mand_fields!r} are missing')
        return MediaSession(is_downlink, external_app_id, **kwargs)

    def jsonObject(self) -> dict:
        obj = {'appId': self.__external_app_id}
        if not self.__is_downlink:
            obj['downlink'] = False
        if self.__asp_id is not None:
            obj['aspId'] = self.__asp_id
        if self.__media_entry is not None:
            obj['name'] = self.__media_entry.name
            obj['ingestURL'] = self.__media_entry.ingest_url_prefix
            obj['distributionConfigurations'] = self.__media_entry.distributions
            if not self.__media_entry.is_pull:
                obj['pull'] = False
            if self.__media_entry.app_distributions is not None and len(self.__media_entry.app_distributions) > 0:
                obj['appDistributions'] = self.__media_entry.app_distributions
        if self.__certificates is not None:
            obj['certificates'] = self.__certificates
        if self.__reporting_configurations is not None:
            if self.__reporting_configurations.consumption is not None:
                obj['consumptionReporting'] = self.__reporting_configurations.consumption
            if self.__reporting_configurations.metrics is not None and len(self.__reporting_configurations.metrics) > 0:
                obj['metricsReporting'] = self.__reporting_configurations.metrics
        if self.__dynamic_policies is not None and len(self.__dynamic_policies) > 0:
            obj['policies'] = self.__dynamic_policies
        return obj

    async def __asyncInit(self):
        '''Asynchronous object instantiation
        :meta private:
        :return: self
        '''
        return self

    def identity(self) -> str:
        '''Get the identity of this session

        This will be the provisioning session id if we have it, otherwise the
        local id is returned.
        '''
        if self.__provisioning_session_id is not None:
            return self.__provisioning_session_id
        return self.__id

    @property
    def is_downlink(self) -> bool:
        return self.__is_downlink

    @is_downlink.setter
    def is_downlink(self, value: Optional[Union[bool,str]]):
        if value is None:
            value = False
        elif isinstance(value, str):
            if value.lower() in ['t','true','y','yes','1']:
                value = True
            elif value.lower() in ['f','false','n','no','0']:
                value = False
            else:
                raise ValueError('MediaSession.is_downlink must be a boolean value')
        if not isinstance(value, bool):
            raise ValueError('MediaSession.is_downlink must be a boolean value')
        self.__is_downlink = value

    @property
    def id(self) -> Optional[str]:
        return self.__id

    @id.setter
    def id(self, value: Optional[str]):
        if value is not None:
            if not isinstance(value, str):
                raise TypeError('MediaSession.id must be either None or a non-empty str')
            if len(value) == 0:
                raise ValueError('MediaSession.id must be a non-empty string or None')
        self.__id = value

    @property
    def provisioning_session_id(self) -> Optional[str]:
        return self.__provisioning_session_id

    @provisioning_session_id.setter
    def provisioning_session_id(self, value: Optional[str]):
        if value is not None:
            if not isinstance(value, str):
                raise TypeError('MediaSession.provisioning_session_id be either None or a non-empty str')
            if len(value) == 0:
                raise ValueError('MediaSession.provisioning_session_id must be a non-empty string or None')
        self.__provisioning_session_id = value

    @property
    def external_app_id(self) -> str:
        return self.__external_app_id

    @external_app_id.setter
    def external_app_id(self, value: str):
        if not isinstance(value, str):
            raise TypeError('MediaSession.external_app_id must be a str')
        self.__external_app_id = value

    @property
    def asp_id(self) -> Optional[str]:
        return self.__asp_id

    @asp_id.setter
    def asp_id(self, value: Optional[str]):
        if value is not None:
            if not isinstance(value, str):
                raise TypeError('MediaSession.asp_id must be either None or a str')
        self.__asp_id = value

    @property
    def certificates(self) -> Optional[Dict[str, MediaServerCertificate]]:
        return self.__certificates

    @certificates.setter
    def certificates(self, value: Optional[Dict[str, MediaServerCertificate]]):
        if value is not None:
            if not isinstance(value, dict) or not all(isinstance(k,str) and isinstance(v,MediaServerCertificate) for k,v in value.items()):
                raise TypeError('MediaSession.certificates must be either None or a dict mapping id str->MediaServerCertificate')
        self.__certificates = value

    def addCertificate(self, value: MediaServerCertificate):
        if not isinstance(value, MediaServerCertificate):
            raise TypeError('MediaSession.certificates can only hold MediaServerCertificate objects')
        if self.__certificates is None:
            self.__certificates = {}
        self.__certificates[value.identity()] = value

    def removeCertificate(self, *, ident: Optional[str] = None, certificate: Optional[MediaServerCertificate] = None) -> bool:
        if (ident is None and certificate is None) or (ident is not None and certificate is not None):
            raise RuntimeError('MediaSession.removeCertificate takes either an ident or a certificate')
        if self.__certificates is None:
            return False
        if ident is not None:
            if ident in self.__certificates:
                del self.__certificates[ident]
                return True
            for k,v in self.__certificates.items():
                if v.id == ident:
                    del self.__certificates[k]
                    return True
        else:
            for k,v in self.__certificates.items():
                if v == certificate:
                    del self.__certificates[k]
                    return True
        return False

    def certificateByCertId(self, ident: str) -> Optional[MediaServerCertificate]:
        if self.__certificates is None:
            return None
        if ident in self.__certificates:
            return self.__certificates[ident]
        return None

    def certificateByIdent(self, ident: str) -> Optional[MediaServerCertificate]:
        ret = self.certificateByCertId(ident)
        if ret is None:
            ret = self.certificateByLocalIdent(ident)
        return ret

    def certificateByLocalIdent(self, ident: str) -> Optional[MediaServerCertificate]:
        if self.__certificates is None:
            return None
        for k,v in self.__certificates.items():
            if v.id == ident:
                return v
        return None

    @property
    def media_entry(self) -> Optional[MediaEntry]:
        return self.__media_entry

    @media_entry.setter
    def media_entry(self, value: Optional[MediaEntry]):
        if value is not None:
            if not isinstance(value, MediaEntry):
                raise TypeError('MediaSession.media_entry must be either None or a MediaEntry object')
        self.__media_entry = value

    @property
    def reporting_configurations(self) -> Optional[MediaReportingConfiguration]:
        return self.__reporting_configurations

    @reporting_configurations.setter
    def reporting_configurations(self, value: Optional[MediaReportingConfiguration]):
        if value is not None:
            if not isinstance(value,MediaReportingConfiguration):
                raise TypeError('MediaSession.reporting_configurations can be either None or a MediaReportingConfiguration object')
            if value.consumption is None and (value.metrics is None or len(value.metrics) == 0):
                value = None
        self.__reporting_configurations = value

    def setConsumptionReportingConfiguration(self, value: MediaConsumptionReportingConfiguration):
        if self.__reporting_configurations is None:
            self.__reporting_configurations = MediaReportingConfiguration()
        self.__reporting_configurations.consumption = value

    def unsetConsumptionReportingConfiguration(self):
        self.__reporting_configurations.consumption = None
        if self.__reporting_configurations.metrics is None:
            self.__reporting_configurations = None

    def addMetricsReportingConfiguration(self, value: MediaMetricsReportingConfiguration):
        if self.__reporting_configurations is None:
            self.__reporting_configurations = MediaReportingConfiguration()
        self.__reporting_configurations.addMetricsReporting(value)

    def removeMetricsReportingConfiguration(self, value: MediaMetricsReportingConfiguration) -> bool:
        if self.__reporting_configurations is None:
            return False
        ret = self.__reporting_configurations.removeMetricsReporting(value)
        if self.__reporting_configurations.metrics is None and self.__reporting_configurations.consumption is None:
            self.__reporting_configurations = None
        return ret

    def unsetMetricsReportingConfigurations(self):
        self.__reporting_configurations = None

    @property
    def dynamic_policies(self) -> Optional[Dict[str,MediaDynamicPolicy]]:
        return self.__dynamic_policies

    @dynamic_policies.setter
    def dynamic_policies(self, value: Optional[Dict[str,MediaDynamicPolicy]]):
        if value is not None:
            if not isinstance(value, dict) or not all(isinstance(k,str) and isinstance(v, MediaDynamicPolicy)
                                                      for k,v in value.items()):
                raise TypeError('MediaSession.dynamic_policies can only hold a dict of str->MediaDynamicPolicy')
            if len(value) == 0:
                value = None
        self.__dynamic_policies = value

    def addDynamicPolicy(self, name: str, value: MediaDynamicPolicy):
        if not isinstance(name, str) or len(name) == 0:
            raise TypeError('MediaSession.dynamic_policies must have an external policy reference id')
        if not isinstance(value, MediaDynamicPolicy):
            raise TypeError('MediaSession.dynamic_policies can only hold MediaDynamicPolicy objects')
        if self.__dynamic_policies is None:
            self.__dynamic_policies = {}
        self.__dynamic_policies[name] = value

    def removeDynamicPolicy(self, name: str) -> bool:
        if self.__dynamic_policies is None or name not in self.__dynamic_policies:
            return False
        del self.__dynamic_policies[name]
        if len(self.__dynamic_policies) == 0:
            self.__dynamic_policies = None
        return True

    def unsetDynamicPolicies(self):
        self.__dynamic_policies = None

    @property
    def configuration(self) -> Optional["MediaConfiguration"]:
        return self.__configuration

    @configuration.setter
    def configuration(self, value: Optional["MediaConfiguration"]):
        from .media_configuration import MediaConfiguration
        if value is not None and not isinstance(value, MediaConfiguration):
            raise ValueError('MediaSession.configuration can either be None or a MediaConfiguration')
        self.__configuration = value

    async def gatherCertificateDetails(self, cert_id: str) -> Tuple[Optional[List[str]],Optional[datetime.datetime]]:
        cert = self.certificateByIdent(cert_id)
        if cert is None:
            return (None,None)
        return (cert.domain_names, await self.__extract_end_datetime_from_pem(cert.public_cert))

    async def __extract_end_datetime_from_pem(self, cert: Optional[str]) -> Optional[datetime.datetime]:
        if cert is None:
            return None
        try:
            x509 = OpenSSL.crypto.load_certificate(OpenSSL.crypto.FILETYPE_PEM, cert)
        except OpenSSL.crypto.Error:
            return None
        end_str = x509.get_notAfter()
        if isinstance(end_str, bytes):
            end_str = end_str.decode('utf-8')
        return datetime.datetime.strptime(end_str, '%Y%m%d%H%M%SZ').replace(tzinfo=datetime.timezone.utc)
