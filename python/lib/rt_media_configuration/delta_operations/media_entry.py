#!/usr/bin/python3 
#==============================================================================
# 5G-MAG Reference Tools: MediaEntryDeltaOperation class
#==============================================================================
#
# File: rt_media_configuration/delta_operations/media_entry.py
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
5G-MAG Reference Tools: MediaEntryDeltaOperation Class
=====================================================
Copyright: (C) 2024 British Broadcasting Corporation
Author(s): David Waring <david.waring2@bbc.co.uk>
Licence: 5G-MAG Public License (v1.0)

For full license terms please see the LICENSE file distributed with this
program. If this file is missing then the license can be retrieved from
https://drive.google.com/file/d/1cinCiA778IErENZ3JN52VFW-1ffHpx7Z/view
=====================================================

This module provides the MediaEntryDeltaOperation class which holds operations
on MediaEntry objects needed to change one MediaConfiguration into another
MediaConfiguration.
'''
from typing import Optional

from rt_m1_client.session import M1Session
from rt_m1_client.types import (DistributionConfiguration,
                                M1MediaEntryPoint)

from ..media_session import MediaSession
from ..media_entry import MediaEntry
from ..media_entry_point import MediaEntryPoint
from ..media_distribution import MediaDistribution

from .delta_operation import DeltaOperation

class MediaEntryDeltaOperation(DeltaOperation):
    '''DeltaOperation for a MediaEntry
    '''

    def __init__(self, session: MediaSession, *, add: Optional[MediaEntry] = None, remove: bool = False):
        if (add is None and not remove) or (add is not None and remove):
            raise ValueError('MediaEntryDeltaOperation must be initialised as an "add" or "remove" operation')
        super().__init__(session)
        self.__media_entry = add
        self.__is_add = add is not None
        self.__is_remove = remove

    def __str__(self):
        if self.__is_add:
            name = getattr(self.__media_entry, "name", "<unknown>")
            return f'Add ContentHostingConfiguration "{name}" to ProvisioningSession "{self.session.identity()}"'
        name = None
        if self.__media_entry is not None:
            name = getattr(self.__media_entry, "name", None)
        if name is None:
            name = getattr(getattr(self.session, "media_entry", None), "name", None)
        if name is None:
            name = "<unknown>"
        return f'Remove ContentHostingConfiguration "{name}" from ProvisioningSession "{self.session.identity()}"'

    def __repr__(self):
        ret = super().__repr__()[:-1]
        if self.__is_add:
            ret += ', add={self.session!r}'
        else:
            ret += ', remove=True'
        ret += f')'
        return ret

    async def apply_delta(self, m1_session: M1Session, update_container: bool = True) -> bool:
        if self.__is_remove:
            # Remove media entry from 5GMS AF via M1
            if not await m1_session.contentHostingConfigurationDelete(self.session.provisioning_session_id):
                return False
            # Drop MediaAppDistributions from the data store
            await self.session.configuration.unset_data_store_app_distributions(self.session.provisioning_session_id)
            # Update the session by removing the media entry
            if update_container:
                self.session.media_entry = None
        elif self.__is_add:
            # Add media entry to 5GMS AF via M1
            chc: Optional[ContentHostingConfiguration] = {'name': self.__media_entry.name,
                                                          'ingestConfiguration': {'pull': self.__media_entry.is_pull,
                                                                                  'protocol': self.__media_entry.protocol,
                                                                                  'baseURL': self.__media_entry.ingest_url_prefix},
                                                          'distributionConfigurations': [
                                                    await dc.to3GPPObject(self.session) for dc in self.__media_entry.distributions]}
            if not await m1_session.contentHostingConfigurationCreate(self.session.provisioning_session_id, chc):
                return False
            # Update DataStore to include MediaAppDistributions for the new config
            await self.session.configuration.set_data_store_app_distributions(self.session.provisioning_session_id, self.__media_entry.app_distributions)
            # Load changes added by 5GMS AF to delta object (in case these are used later - may update object in another session)
            chc = await m1_session.contentHostingConfigurationGet(self.session.provisioning_session_id)
            if chc is not None:
                if not self.__media_entry.is_pull:
                    self.__media_entry.ingest_url_prefix = chc['ingestConfiguration']['baseURL']
                distribs = [await MediaDistribution.from3GPPObject(dc) for dc in chc['distributionConfigurations']]
                self.__media_entry.distributions = distribs
            # Update the session we are adding/modifying this media entry for
            if update_container:
                self.session.media_entry = self.__media_entry
        return True
