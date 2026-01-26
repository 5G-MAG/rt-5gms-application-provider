#!/usr/bin/python3 
#==============================================================================
# 5G-MAG Reference Tools: MediaConfiguration class
#==============================================================================
#
# File: rt_media_configuration/media_configuration.py
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
5G-MAG Reference Tools: MediaConfiguration Class
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
import configparser
import datetime
import json
import logging
import os
import os.path
import re
from typing import Optional, Iterable, Dict, List, Final, ClassVar, Type
import uuid

import aiofiles

from rt_m1_client.configuration import Configuration, app_configuration
from rt_m1_client.session import M1Session
from rt_m1_client.data_store import DataStore

from .media_session import MediaSession
from .media_app_distribution import MediaAppDistribution
from .delta_operations import *
from .importers import M1SessionImporter

#: DEFAULT_CONFIG - The default configuration
#: :private:
DEFAULT_CONFIG = '''[media-configuration]
m5_authority = example.com:7777
m8outputs = FiveGMagJsonFormatter(root_dir=/usr/share/nginx/html/m8)
'''

class MediaConfiguration:
    '''MediaConfiguration Class
========================

This class provides modelling for a collection of media assets and the
logic to use the rt_m1_client.M1Session object to synchronise that
configuration with the 5GMS AF.
'''

    __output_factories: ClassVar[Dict[str,Type["M8Output"]]] = {}

    def __init__(self, configfile: Optional[str] = None, asp_id: Optional[str] = None,
                 persistent_data_store: Optional[DataStore] = None,
                 m1_session: Optional[M1Session] = None):
        self.__model = {"sessions": {}, "aspId": asp_id}
        if configfile is None:
            if os.getuid() != 0:
                configfile = os.path.expanduser(os.path.join('~', '.rt-5gms', 'media.conf'))
            else:
                configfile = os.path.join(os.path.sep, 'etc', 'rt-5gms', 'media.conf')
        self.__extraConfigFile = configfile
        self.__config = app_configuration
        self.__config.addSection('media-configuration', DEFAULT_CONFIG, self.__extraConfigFile)
        self.__data_store = persistent_data_store
        self.__log = logging.getLogger(__name__ + '.' + self.__class__.__name__)
        self.__m1_session = m1_session
        self.__output_formatters = []
        self.__app_distrib_cache = {}

    def __await__(self):
        '''``await`` provider for asynchronous instantiation.
        '''
        return self.__asyncInit().__await__()

    def __repr__(self) -> str:
        ret = f'{__name__}.{self.__class__.__name__}({self.__extraConfigFile!r}'
        if self.__model['aspId'] is not None:
            ret += f', asp_id={self.__model["aspId"]!r}'
        if self.__data_store is not None:
            ret += f', persistent_data_store={self.__data_store!r}'
        ret += ')'
        return ret

    def __str__(self) -> str:
        return self.serialise(pretty=True)

    def serialise(self, pretty: bool = False) -> str:
        obj = {'streams': self.__model["sessions"]}
        kwargs = {}
        if pretty:
            kwargs = {'sort_keys': True, 'indent': 2}
        if self.__model['aspId'] is not None:
            obj['aspId'] = self.__model['aspId']
        return json.dumps(obj, default=MediaConfiguration.jsonObjectHandler, **kwargs)

    async def reset(self) -> None:
        self.__model["sessions"] = {}

    async def restoreModel(self) -> bool:
        '''Restore the model to the last known configuration.

        Loads the current configuration from the 5GMS AF and supplements it
        with model configuration stored in the Datastore.

        :return: ``True`` if the model was successfully restored.
        '''
        try:
            await self.__loadModelFromDatastore()
            m1_imp = await M1SessionImporter(self.__m1_session)
            await m1_imp.import_to(self)
        except Exception as exc:
            self.__log.error(f"Failed to restore model: {exc}")
            return False
        return True

    async def newMediaSession(self, *args, **kwargs) -> MediaSession:
        '''Create a new MediaSession and attach it to this MediaConfiguration

        :see: MediaSession constructor for parameters.
        :return: A new MediaSession object attached to this MediaConfiguration.
        '''
        entry = await MediaSession(*args, configuration = self, **kwargs)
        if entry.id is None:
            entry.id = str(uuid.uuid4())
        self.__model["sessions"][entry.id] = entry
        return entry
        
    async def addMediaSession(self, session: MediaSession) -> bool:
        if session.id is None:
            session.id = str(uuid.uuid4())
        self.__model["sessions"][session.id] = session
        session.configuration = self
        return True

    async def removeMediaSession(self, *, session_id: Optional[str] = None, entry: Optional[MediaSession] = None) -> bool:
        if session_id is None and entry is None:
            return False
        if session_id is not None:
            if entry is not None:
                raise RuntimeError('MediaConfiguration.removeMediaEntry takes either session_id or entry, not both')
            if session_id not in self.__model["sessions"]:
                return False
            self.__model["sessions"][session_id].configuration = None
            del self.__model["sessions"][session_id]
            return True
        else:
            for k,v in self.__model["sessions"].items():
                if v == entry:
                    self.__model["sessions"][k].configuration = None
                    del self.__model["sessions"][k]
                    return True
        return False

    async def mediaSessions(self) -> Iterable[MediaSession]:
        return self.__model["sessions"].values()

    async def mediaSessionById(self, session_id: str) -> Optional[MediaSession]:
        return self.__model["sessions"].get(session_id, None)

    async def mediaSessionByProvisioningSessionId(self, session_id: str) -> Optional[MediaSession]:
        for v in self.__model["sessions"].values():
            if v.provisioning_session_id == session_id:
                return v
        return None

    async def synchronise(self):
        '''Synchronise MediaConfiguration

        This will update the 5GMS AF configuration and M8 published objects to match this media configuration. This will determine
        the differences between this configuration and what is present on the 5GMS AF and apply the deltas to the 5GMS AF in order
        to synchronise it with this configuration. The parts of the configuration not representable in the 5GMS AF will be written
        out the DataStore (as configured in the constructor). The M8 outputs will be triggered to republish any M8 objects.
        '''
        if self.__m1_session is None:
            m1_authority = (self.__config.get('m1_address'),self.__config.get('m1_port'))
            cert_signer = self.__config.get('certificate_signing_class')
            self.__m1_session = await M1Session(host_address=m1_authority,
                                                persistent_data_store=self.__data_store,
                                                certificate_signer=cert_signer)
        af_mc = await MediaConfiguration(self.__extraConfigFile,
                                        asp_id=self.__model['aspId'],
                                        persistent_data_store=self.__data_store,
                                        m1_session=self.__m1_session)
        af_imp = await M1SessionImporter(self.__m1_session) 
        await af_imp.import_to(af_mc) 
        deltas = await af_mc.deltas(self)
        self.__log.info('Synchronising model to 5GMS AF')
        for d in deltas:
            self.__log.debug(str(d))
            await d.apply_delta(self.__m1_session)

        self.__model = af_mc.__model

    async def deltas(self, other: "MediaConfiguration") -> List[DeltaOperation]:
        '''Get the list of operations needed to change this configuration into the configuration in other
        '''
        ret = []
        # Check each session I hold to see if it exists in the other configuration or not
        to_del = []
        have = []
        to_add = list(other.__model['sessions'].values())
 
        other_psid_map = {
            s.provisioning_session_id: s for s in to_add 
            if s.provisioning_session_id is not None
        }  
  
        for session in self.__model['sessions'].values(): 
            matched_o_session = None
             
            if session.provisioning_session_id is not None:
                matched_o_session = other_psid_map.get(session.provisioning_session_id)   
             
            if matched_o_session is not None:
                 
                have += [(session, matched_o_session)]
                to_add.remove(matched_o_session)  
                del other_psid_map[session.provisioning_session_id]  
            
            else:  
                for o_session in to_add:
                    if session.shallow_eq(o_session):
                        have += [(session, o_session)]
                        to_add.remove(o_session)
                        break
                else:
                    to_del += [session]
        ret += [await MediaSessionDeltaOperation(self, add=session) for session in to_add]
        ret += [await MediaSessionDeltaOperation(self, remove=session) for session in to_del]
        # check sub-structures of sessions we have for changes
        for session,o_session in have:
            if session.certificates is None and o_session.certificates is not None:
                ret += [await MediaServerCertificateDeltaOperation(session, add=(cert_id,cert)) for cert_id,cert in o_session.certificates.items()]
            elif session.certificates is not None:
                if o_session.certificates is None:
                    ret += [await MediaServerCertificateDeltaOperation(session, remove=cert_id) for cert_id in session.certificates.keys()]
                else:
                    # find certs that need to be added
                    certs_add = {o_cert_id:o_cert for o_cert_id,o_cert in o_session.certificates.items() if not await self.__about_to_expire((await o_session.gatherCertificateDetails(o_cert_id))[1])}
                    certs_del = []
                    for cert_id in session.certificates.keys():
                        if cert_id in certs_add:
                            # Already have that certificate so do not need to add it again
                            del certs_add[cert_id]
                        else:
                            (cert_hosts,cert_expiry) = await session.gatherCertificateDetails(cert_id)
                            for o_cert_id,o_cert in certs_add.items():
                                (o_cert_hosts, o_cert_expiry) = await o_session.gatherCertificateDetails(o_cert_id)
                                if sorted(cert_hosts) == sorted(o_cert_hosts):
                                    # found matching cert
                                    if await self.__about_to_expire(cert_expiry):
                                        # current cert is about to expire so treat as not matching
                                        certs_del += [cert_id]
                                    else:
                                        # copy over certificate Id to delta object if we already have it
                                        if session.certificates[cert_id].certificate_id is not None:
                                            o_cert_ident = o_cert.identity()
                                            o_cert.certificate_id = session.certificates[cert_id].certificate_id
                                            if o_cert.identity() != o_cert_ident:
                                                o_session.certificates[o_cert.certificate_id] = o_cert
                                                del o_session.certificates[o_cert_ident]
                                        if session.certificates[cert_id].id is None:
                                            session.certificates[cert_id].id = o_cert.id
                                        del certs_add[o_cert_id]
                                    break
                            else:
                                certs_del += [cert_id]
                    ret += [await MediaServerCertificateDeltaOperation(session, add=(cid,cert)) for cid,cert in certs_add.items()]
                    ret += [await MediaServerCertificateDeltaOperation(session, remove=cid) for cid in certs_del]
            if session.media_entry is None and o_session.media_entry is not None:
                ret += [await MediaEntryDeltaOperation(session, add=o_session.media_entry)]
            elif session.media_entry is not None:
                if o_session.media_entry is None:
                    ret += [await MediaEntryDeltaOperation(session, remove=True)]
                elif not await session.media_entry.shalloweq(o_session.media_entry):
                    ret += [await MediaEntryDeltaOperation(session, add=o_session.media_entry)]

            if session.dynamic_policies is None and o_session.dynamic_policies is not None:
                ret += [await MediaDynamicPolicyDeltaOperation(session, add=dp) for dp in o_session.dynamic_policies.values()]
            elif session.dynamic_policies is not None and o_session.dynamic_policies is None:
                ret += [await MediaDynamicPolicyDeltaOperation(session, remove=dp) for dp in session.dynamic_policies]
            elif session.dynamic_policies is not None and o_session.dynamic_policies is not None:
                # make deltas for individual dynamic policies
                for dp_id,dp in o_session.dynamic_policies.items():
                    if dp_id not in session.dynamic_policies:
                        ret += [await MediaDynamicPolicyDeltaOperation(session, add=(dp))]
                    else:
                        current_dp = session.dynamic_policies[dp_id]
                        if dp != current_dp or dp.id != current_dp.id:
                            ret += [await MediaDynamicPolicyDeltaOperation(session, update=(dp_id,dp))]
                for dp_id in session.dynamic_policies.keys():
                    if dp_id not in o_session.dynamic_policies:
                        ret += [await MediaDynamicPolicyDeltaOperation(session, remove=dp_id)]

            if session.reporting_configurations is None and o_session.reporting_configurations is not None:
                if o_session.reporting_configurations.consumption is not None:
                    ret += [await MediaConsumptionReportingDeltaOperation(session, add=o_session.reporting_configurations.consumption)]
                if o_session.reporting_configurations.metrics is not None:
                    ret += [await MediaMetricsReportingDeltaOperation(session, add=mr) for mr in o_session.reporting_configurations.metrics]
            elif session.reporting_configurations is not None:
                if session.reporting_configurations.consumption is not None:
                    if o_session.reporting_configurations is None or o_session.reporting_configurations.consumption is None:
                        ret += [await MediaConsumptionReportingDeltaOperation(session, remove=True)]
                    elif session.reporting_configurations.consumption != o_session.reporting_configurations.consumption:
                        ret += [await MediaConsumptionReportingDeltaOperation(session, add=o_session.reporting_configurations.consumption)]
                else:
                    if o_session.reporting_configurations is not None and o_session.reporting_configurations.consumption is not None:
                        ret += [await MediaConsumptionReportingDeltaOperation(session, add=o_session.reporting_configurations.consumption)]
                if session.reporting_configurations.metrics is not None:
                    metric_to_del = []
                    if o_session.reporting_configurations is not None and o_session.reporting_configurations.metrics is not None:
                        metric_to_add = o_session.reporting_configurations.metrics.copy()
                    else:
                        metric_to_add = []
                    for metric in session.reporting_configurations.metrics:
                        for o_metric in metric_to_add:
                            if await metric.shalloweq(o_metric):
                                # Already have this metric
                                metric_to_add.remove(o_metric)
                                break
                        else:
                            metric_to_del += [metric]
                    ret += [await MediaMetricsReportingDeltaOperation(session, add=metric) for metric in metric_to_add]
                    ret += [await MediaMetricsReportingDeltaOperation(session, remove=metric) for metric in metric_to_del]
                elif o_session.reporting_configurations is not None and o_session.reporting_configurations.metrics is not None:                         ret += [await MediaMetricsReportingDeltaOperation(session, add=metric) for metric in o_session.reporting_configurations.metrics]
        return ret

    async def updateM8Files(self):
        '''Write out the M8 static files for registered M8Output objects
        '''
        self.__log.info('Updating M8 static files')
        for fmt in self.__output_formatters:
            await fmt.writeOutput(self)

    async def __asyncInit(self):
        '''Asynchronous object instantiation

        Loads previous state from the DataStore and initialise M8Outputs from config.

        :meta private:
        :return: self
        '''
        m8_outputs: List[str] = self.__config.get('m8outputs', section='media-configuration', default='').split(',')
        for outstr in m8_outputs:
            m8_out = await self.__make_m8_output(outstr)
            await m8_out.addToMediaConfiguration(self)
        return self

    __fnstr_re: Final[re.Pattern] = re.compile(r'^(?P<name>\w+)(?:\((?:(?P<args>[^=,]+(?:,[^=,]+)*)(?:(?=,),))?(?P<kwargs>\w+=[^=,]+(?:,\w+=[^=,]+)*)?\))?$')

    @staticmethod
    async def __parse_value(val: str):
        try:
            val = int(val)
        except ValueError:
            try:
                val = float(val)
            except ValueError:
                pass
        return val

    async def __make_m8_output(self, outstr: str) -> "M8Output":
        from rt_m8_output import M8Output
        match = self.__fnstr_re.match(outstr)
        if match is None:
            raise ValueError(f'Badly formatted M8Output name: {outstr}')
        (name,args,kwargs) = match.group('name', 'args', 'kwargs')
        if name not in self.__output_factories:
            raise ValueError(f'M8Output "{name}" not known')
        if args is None:
            args = []
        else:
            args = [await self.__parse_value(a.strip()) for a in args.split(',')]
        if kwargs is None:
            kwargs = {}
        else:
            kwargs = {k.strip():await self.__parse_value(v.strip()) for k,v in [a.split('=') for a in kwargs.split(',')]}
        return await self.__output_factories[name](*args, **kwargs)

    async def attachM8Output(self, m8_output: "M8Output") -> bool:
        '''Attach an M8 Output Formatter to this media session

        The M8Output will be invoked when changes are synchronised to the 5GMS AF.

        :return: True if the MediaConfiguration now has the m8_output attached.
        '''
        from rt_m8_output import M8Output
        if m8_output not in self.__output_formatters:
            self.__output_formatters += [m8_output]
        return True

    async def detachM8Output(self, m8_output: "M8Output") -> bool:
        '''Detach an M8 Output Formatter from this media session

        :return: True if the M8Output has been detached, False if the M8Output was not attached
        '''
        from rt_m8_output import M8Output
        if m8_output not in self.__output_formatters:
            return False
        self.__output_formatters.remove(m8_output)
        return True

    @staticmethod
    def jsonObjectHandler(obj):
        fn = getattr(obj, "jsonObject", None)
        if fn is not None:
            return fn()
        raise TypeError(f'Object of type {obj.__class__.__name__} is not JSON serialisable')

    @property
    def asp_id(self) -> Optional[str]:
        return self.__model["aspId"]

    @asp_id.setter
    def asp_id(self, value: Optional[str]):
        if value is not None:
            if not isinstance(value, str) or len(value) == 0:
                raise TypeError('MediaConfiguration.aspId must be a non-empty str or None')
        self.__model["aspId"] = value

    @classmethod
    def registerM8OutputClass(cls, output_cls: Type["M8Output"]):
        from rt_m8_output import M8Output
        cls.__output_factories[output_cls.__name__] = output_cls

    async def __about_to_expire(self, cert_expiry: Optional[datetime.datetime]) -> bool:
        if cert_expiry is None:
            return False
        now = datetime.datetime.now(tz=datetime.timezone.utc)
        near_expiry = now + datetime.timedelta(days=7)
        return cert_expiry <= near_expiry

    async def set_data_store_app_distributions(self, provisioning_session_id: str, distribs: Optional[Iterable[MediaAppDistribution]]):
        if distribs is None:
            if provisioning_session_id in self.__app_distrib_cache:
                del self.__app_distrib_cache[provisioning_session_id]
                await self.__write_data_store_app_distributions()
        else:
            self.__app_distrib_cache[provisioning_session_id] = list(distribs)
            await self.__write_data_store_app_distributions()

    async def unset_data_store_app_distributions(self, provisioning_session_id: str):
        await self.set_data_store_app_distributions(provisioning_session_id, None)

    async def get_data_store_app_distributions(self, provisioning_session_id: str):
        if len(self.__app_distrib_cache) == 0:
            await self.__read_data_store_app_distributions()
        if provisioning_session_id not in self.__app_distrib_cache:
            return None
        return self.__app_distrib_cache[provisioning_session_id]

    async def __write_data_store_app_distributions(self):
        if self.__data_store is not None:
            obj = {}
            for k,app_distribs_list in self.__app_distrib_cache.items():
                distribs = [distrib.jsonObject() for distrib in app_distribs_list]
                for app_dist in distribs:
                    if 'entryPoints' in app_dist and app_dist['entryPoints'] is not None:
                        app_dist['entryPoints'] = [ep.jsonObject() for ep in app_dist['entryPoints']]
                obj[k] = distribs
            await self.__data_store.set('app_distributions_by_provisioning_session', obj)

    async def __loadModelFromDatastore(self):
        await self.__read_data_store_app_distributions()

    async def __read_data_store_app_distributions(self):
        self.__app_distrib_cache = {}
        obj = await self.__data_store.get('app_distributions_by_provisioning_session')
        if obj is not None:
            self.__app_distrib_cache = {k:[MediaAppDistribution.fromJSONObject(app_distrib) for app_distrib in v] for k,v in obj.items()}

# vim:ts=8:sts=4:sw=4:expandtab:
