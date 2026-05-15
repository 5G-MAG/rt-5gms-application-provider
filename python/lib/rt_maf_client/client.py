#!/usr/bin/python3
#==============================================================================
# 5G-MAG Reference Tools: MAF Client
#==============================================================================
#
# File: m1_client/client.py
# License: 5G-MAG Public License (v1.0)
# Author: Erik Gaida
# Copyright: (C) 2026 Fraunhofer FOKUS
#
# For full license terms please see the LICENSE file distributed with this
# program. If this file is missing then the license can be retrieved from
# https://drive.google.com/file/d/1cinCiA778IErENZ3JN52VFW-1ffHpx7Z/view
#
#==============================================================================
#
# MAF Client class
# ===============
#
# This module contains an M1 Client written as a Python 3 class using asyncio.
#
import logging
from typing import Optional, Union, Tuple, Dict, Any, List
from rt_m1_client.exceptions import M1ServerError
from rt_m1_client.types import ResourceId
import httpx
import json

class MafClient:
    '''5G-MAG Reference Tools: M1 Client
    '''

    def __init__(self, host_address: Tuple[str,int]):
        '''
        Constructor

        :param Tuple[str,int] host_address: 5GMS Application Function to connect to as a tuple of hostname/ip-addr and TCP port
                                            number.
        '''
        self.__host_address = host_address
        self.__connection = None
        self.__log = logging.getLogger(__name__ + '.' + self.__class__.__name__)


    async def __do_request(self, method: str, url_suffix: str, body: Union[str,bytes],
                           content_type: str, headers: Optional[dict] = None,
                           ) -> Dict[str,Any]:
        '''Send a request to the 5GMS Application Function

        :meta private:
        :param str method: The HTTP method for the request.
        :param str url_suffix: The URL path suffix for the request after the protocol and version identifiers.
        :param Union[str,bytes] body: The body of the request as a `str` or `bytes`.
        :param str content_type: The content type to use in the ``Content-Type`` header of the request.
        :param Optional[dict] headers: Extra headers to go along with the request.
        :return: a `dict` with 3 entries ``status_code``, ``body`` and ``headers`` representing the HTTP response status code,
                 the response message body and the response headers.
        :raise M1ServerError: if communication with the AF failed.
        '''
        # pylint: disable=too-many-arguments
        if isinstance(body, str):
            body = bytes(body, 'utf-8')
        req_headers = {'Content-Type': content_type}
        if headers is not None:
            req_headers.update(headers)
        url = f'http://{self.__host_address[0]}:{self.__host_address[1]}/5gmag-rt-management/v1{url_suffix}'
        if self.__connection is None:
            self.__connection = httpx.AsyncClient(http1=True, http2=False,
                                                  headers={'User-Agent': '5GMS-AF/testing'})
        req = self.__connection.build_request(method, url, headers=req_headers, data=body)
        try:
            resp = await self.__connection.send(req)
        except httpx.RemoteProtocolError as err:
            raise M1ServerError(reason=f'Communication with the Application Function failed: {err}', status_code=500)
        return {'status_code': resp.status_code, 'body': resp.text, 'headers': resp.headers}


    async def enumerateProvisioningSessions(self) -> Optional[List[ResourceId]]:
        result = await self.__do_request('GET',
                                         '/provisioning-sessions','',
                                             'application/json')
        if result['status_code'] == 200:
            payload = json.loads(result['body'])
            return payload
        raise M1ServerError(reason='MAF operation failed: '+str(result['body']), status_code=result['status_code'])

