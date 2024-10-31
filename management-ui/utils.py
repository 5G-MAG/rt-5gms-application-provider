'''
License: 5G-MAG Public License (v1.0)
Author: David Waring, Vuk Stojkovic
Copyright: (C) British Broadcasting Corporation, Fraunhofer FOKUS
For full license terms please see the LICENSE file distributed with this
program. If this file is missing then the license can be retrieved from
https://drive.google.com/file/d/1cinCiA778IErENZ3JN52VFW-1ffHpx7Z/view
'''

import os
import sys

def lib_to_sys_path():
    rt_m1_client = os.path.abspath('./python/lib/rt-m1-client')
    if os.path.isdir(rt_m1_client) and rt_m1_client not in sys.path:
        sys.path.append(rt_m1_client)

    rt_media_configuration = os.path.abspath('./python/lib/rt-media-configuration')
    if os.path.isdir(rt_media_configuration) and rt_media_configuration not in sys.path:
        sys.path.append(rt_media_configuration)



