#!/usr/bin/python3
#==============================================================================
# 5G-MAG Reference Tools: MAF Configuration
#==============================================================================
#
# File: rt_maf_client/configuration.py
# License: 5G-MAG Public License (v1.0)
# Author: Erik Gaida
# Copyright: (C) Frauhofer FOKUS
#
# For full license terms please see the LICENSE file distributed with this
# program. If this file is missing then the license can be retrieved from
# https://drive.google.com/file/d/1cinCiA778IErENZ3JN52VFW-1ffHpx7Z/view
#
#==============================================================================
#
# MAF  Configuration class
# ==============================
#
# This module contains a configuration class which hold application
# configuration for programs which use the MAF Session class.
#
'''5G-MAG Reference Tools: MAF Configuration
================================================

'''

import configparser
from io import StringIO
import os
import os.path

from typing import List, Optional, Iterable

class Configuration:
    '''Application configuration container

    This class handles the loading and saving of the application configuration
    '''

    DEFAULT_CONFIG='''[DEFAULT]
    log_dir = /var/log/rt-5gms
    state_dir = /var/cache/rt-5gms
    run_dir = /run/rt-5gms
    
    [maf-client]
    log_level = info
    maf_address = 127.0.0.25
    maf_port = 7777
    ''' #: The default configuration

    def __init__(self):
        '''Constructor

        Will load the previous configuration from ``/etc/rt-5gms/maf-client.conf`` if the command is run by root or
        ``~/.rt-5gms/maf-client.conf`` if run by any other user.
        '''
        self.__config_filename = None
        if os.getuid() != 0:
            self.__config_filename = os.path.expanduser(os.path.join('~', '.rt-5gms', 'maf-client.conf'))
        else:
            self.__config_filename = os.path.join(os.path.sep, 'etc', 'rt-5gms', 'maf-client.conf')
        self.__default_section = None
        self.__default_config = {}
        self.__config = {}
        self.__config_filepath = {}
        self.addSection('maf-client', self.DEFAULT_CONFIG, self.__config_filename, make_default=True)
    
    def addSection(self, section_name: str, defaults: str, config_filepath: Optional[str] = None, *, make_default: bool = False):
        if make_default:
            self.__default_section = section_name
        self.__default_config[section_name] = configparser.ConfigParser()
        self.__default_config[section_name].read_string(defaults)
        self.__config[section_name] = configparser.ConfigParser()
        self.__config[section_name].read_string(defaults)
        self.__config_filepath[section_name] = config_filepath
        if config_filepath is not None and os.path.exists(config_filepath):
            self.__config[section_name].read(config_filepath)