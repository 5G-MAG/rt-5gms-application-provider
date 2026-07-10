'''
License: 5G-MAG Public License (v1.0)
Author: David Waring, Vuk Stojkovic
Copyright: (C) British Broadcasting Corporation, Fraunhofer FOKUS
For full license terms please see the LICENSE file distributed with this
program. If this file is missing then the license can be retrieved from
https://hub.5g-mag.com/Getting-Started/OFFICIAL_5G-MAG_Public_License_v1.0.pdf
'''

import os
import sys

def lib_to_sys_path():
    rt_lib = '../python/lib'
    if os.path.isdir(rt_lib) and rt_lib not in sys.path:
        sys.path.insert(0, rt_lib)
