#!/usr/bin/python3
#==============================================================================
# 5G-MAG Reference Tools: M1 Session Configuration
#==============================================================================
#
# File: rt_m1_client/configuration.py
# License: 5G-MAG Public License (v1.0)
# Author: David Waring
# Copyright: (C) 2022-2023 British Broadcasting Corporation
#
# For full license terms please see the LICENSE file distributed with this
# program. If this file is missing then the license can be retrieved from
# https://drive.google.com/file/d/1cinCiA778IErENZ3JN52VFW-1ffHpx7Z/view
#
#==============================================================================
#
# M1 Session Configuration class
# ==============================
#
# This module contains a configuration class which hold application
# configuration for programs which use the M1 Session class.
#
'''5G-MAG Reference Tools: M1 Session Configuration
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
    
    [m1-client]
    log_level = info
    data_store = %(state_dir)s/m1-client
    m1_address = 127.0.0.23
    m1_port = 7777
    maf_address = 127.0.0.25
    maf_port = 7777
    asp_id =
    external_app_id = please-change-this
    certificate_signing_class = rt_m1_client.certificates.DefaultCertificateSigner
    ''' #: The default configuration

    def __init__(self):
        '''Constructor

        Will load the previous configuration from ``/etc/rt-5gms/m1-client.conf`` if the command is run by root or
        ``~/.rt-5gms/m1-client.conf`` if run by any other user.
        '''
        self.__config_filename = None
        if os.getuid() != 0:
            self.__config_filename = os.path.expanduser(os.path.join('~', '.rt-5gms', 'm1-client.conf'))
        else:
            self.__config_filename = os.path.join(os.path.sep, 'etc', 'rt-5gms', 'm1-client.conf')
        self.__default_section = None
        self.__default_config = {}
        self.__config = {}
        self.__config_filepath = {}
        self.addSection('m1-client', self.DEFAULT_CONFIG, self.__config_filename, make_default=True)
        
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

    def isKey(self, key: str, section: Optional[str] = None) -> str:
        '''Does a configuration field key exist?

        This tests *key* for being a valid configuration option field key name.

        :returns: The key string if it is a valid configuration field key.
        :raises: ValueError if the key string does not match a known configuration field key.
        '''
        if section is None:
            section = self.__default_section
        cfg = self.__default_config[section]
        if cfg.has_option(section, key) or cfg.has_option('DEFAULT', key):
            return key
        raise ValueError('Not a valid configuration option')

    def get(self, key: str, default: str = None, raw: bool = False, section: Optional[str] = None) -> str:
        '''Get a configuration value

        Retrieves the value for configuration option *key*. If the *key* does not exist the *default* will be returned. If *raw* is
        ``True`` and the *key* option exists then the raw configuration (without ``%()`` interpolation) value will be returned.

        :returns: The configuration option *key* value or *default* if key does not exist.
        '''
        if section is None:
            section = self.__default_section
        return self.__config[section].get(section, key, raw=raw, fallback=default)

    def set(self, key: str, value: str, section: Optional[str] = None) -> bool:
        '''Set a configuration value

        Sets the raw *value* for configuration option *key*. If *key* is not a valid configuration option then ValueError exception
        will be raised.

        The configuration is saved once the *key* option has been set.
        '''
        if section is None:
            section = self.__default_section
        self.isKey(key, section=section)
        if key in self.__default_config[section]['DEFAULT']:
            cfg_section = 'DEFAULT'
        else:
            cfg_section = section
        self.__config[section].set(cfg_section, key, value)
        self.__saveConfig()
        return True

    def isDefault(self, key: str, section: Optional[str] = None) -> bool:
        '''Checks if a key contains the default configuration value

        :returns: ``True`` if the configuration value for *key* is the default value, or ``False`` otherwise.
        '''
        if section is None:
            section = self.__default_section
        return self.__config[section].get(section, key) == self.__default_config[section].get(section, key)

    def getKeys(self, section: Optional[str] = None) -> List[str]:
        '''Get a list of configuration field name keys

        :returns: A list of configuration key names.
        '''
        if section is None:
            section = self.__default_section
        return list(self.__default_config[section][section].keys())

    def resetValue(self, key: str, section: Optional[str] = None) -> bool:
        '''Reset a configuration field to its default value

        :returns: ``True`` if the field was reset or ``False`` if the field already contained the default value.
        '''
        if section is None:
            section = self.__default_section
        if self.isDefault(key, section=section):
            return False
        return self.set(key, self.__default_config[section].get(section, key), section=section)

    def __saveConfig(self, sections: Optional[Iterable[str]] = None):
        '''Save the configurations for the given sections to local storage

        :meta private-method:

        If `sections` is None then all sections with a configuration filename attached will be saved.
        '''

        if sections is None:
            sections = self.__config_filepath.keys()
        for s in sections:
            self.__saveConfigSection(s)

    def __saveConfigSection(self, section: Optional[str]):
        '''Save the current configuration for a given section to local storage

        :meta private-method:

        Will save the current configuration to the relevant local file. Fields with the default value will be saved as a comment.
        '''
        if section not in self.__config_filepath or self.__config_filepath[section] is None:
            return
        cfgdir = os.path.dirname(self.__config_filepath[section])
        if not os.path.exists(cfgdir):
            old_umask = os.umask(0)
            try:
                os.makedirs(cfgdir, mode=0o755)
            finally:
                os.umask(old_umask)
        with open(self.__config_filepath[section], 'w') as cfgout:
            cfgout.write(f'[{section}]\n')
            for sect in ['DEFAULT'] + self.__config[section].sections():
                for key in self.__config[section][sect]:
                    cfgvalue = self.__config[section].get(sect, key, raw=True)
                    defvalue = self.__default_config[section].get(sect, key, raw=True)
                    if (sect == 'DEFAULT' or key not in self.__config[section]['DEFAULT']):
                        if cfgvalue == defvalue:
                            cfgout.write('#')
                        cfgout.write(f'{key} = {cfgvalue}\n')
            cfgout.write('\n')

    def __str__(self):
        '''String representation of the configuration

        :returns: A ``str`` representing the configuration.
        '''
        buf = StringIO()
        for sect,config in self.__config.items():
            buf.write(f'#=============== {sect} ================#\n')
            config.write(buf)
            buf.write('\n')
        return buf.getvalue()

    def __repr__(self):
        '''Textual represnetation of the Configuration object

        :returns: A ``str`` representation of the Configuration object.
        '''
        return f'Configuration(config="{self}")'

app_configuration = Configuration()

__all__ = [
        # Classes
        'Configuration',
        ]
