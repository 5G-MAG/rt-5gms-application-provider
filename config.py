'''
License: 5G-MAG Public License (v1.0)
Author: David Waring, Vuk Stojkovic
Copyright: (C) British Broadcasting Corporation, Fraunhofer FOKUS
For full license terms please see the LICENSE file distributed with this
program. If this file is missing then the license can be retrieved from
https://drive.google.com/file/d/1cinCiA778IErENZ3JN52VFW-1ffHpx7Z/view
'''

import configparser
import os
from io import StringIO
from typing import List
from utils import lib_to_sys_path

lib_to_sys_path()

from rt_m1_client.session import M1Session
from rt_m1_client.data_store import JSONFileDataStore

_m1_session = None

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
    asp_id = MyASPId
    external_app_id = MyAppId
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
        self.__default_config = configparser.ConfigParser()
        self.__default_config.read_string(self.DEFAULT_CONFIG)
        self.__config = configparser.ConfigParser()
        self.__config.read_string(self.DEFAULT_CONFIG)
        if os.path.exists(self.__config_filename):
            self.__config.read(self.__config_filename)

    def isKey(self, key: str) -> str:
        '''Does a configuration field key exist?

        This tests *key* for being a valid configuration option field key name.

        :returns: The key string if it is a valid configuration field key.
        :raises: ValueError if the key string does not match a known configuration field key.
        '''
        if key in self.__default_config['m1-client']:
            return key
        raise ValueError('Not a valid configuration option')

    def get(self, key: str, default: str = None, raw: bool = False) -> str:
        '''Get a configuration value

        Retrieves the value for configuration option *key*. If the *key* does not exist the *default* will be returned. If *raw* is
        ``True`` and the *key* option exists then the raw configuration (without ``%()`` interpolation) value will be returned.

        :returns: The configuration option *key* value or *default* if key does not exist.
        '''
        return self.__config.get('m1-client', key, raw=raw, fallback=default)

    def set(self, key: str, value: str) -> bool:
        '''Set a configuration value

        Sets the raw *value* for configuration option *key*. If *key* is not a valid configuration option then ValueError exception
        will be raised.

        The configuration is saved once the *key* option has been set.
        '''
        self.isKey(key)
        if key in self.__default_config['DEFAULT']:
            section = 'DEFAULT'
        else:
            section = 'm1-client'
        self.__config.set(section, key, value)
        self.__saveConfig()
        return True

    def isDefault(self, key: str) -> bool:
        '''Checks if a key contains the default configuration value

        :returns: ``True`` if the configuration value for *key* is the default value, or ``False`` otherwise.
        '''
        return self.__config.get('m1-client', key) == self.__default_config.get('m1-client', key)

    def getKeys(self) -> List[str]:
        '''Get a list of configuration field name keys

        :returns: A list of configuration key names.
        '''
        return list(self.__default_config['m1-client'].keys())

    def resetValue(self, key: str) -> bool:
        '''Reset a configuration field to its default value

        :returns: ``True`` if the field was reset or ``False`` if the field already contained the default value.
        '''
        if self.isDefault(key):
            return False
        return self.set(key, self.__default_config.get('m1-client', key))

    def __saveConfig(self):
        '''Save the current configuration to local storage

        :meta private-method:

        Will save the current configuration to the relevant local file. Fields with the default value will be saved as a comment.
        '''
        cfgdir = os.path.dirname(self.__config_filename)
        if not os.path.exists(cfgdir):
            old_umask = os.umask(0)
            try:
                os.makedirs(cfgdir, mode=0o755)
            finally:
                os.umask(old_umask)
        with open(self.__config_filename, 'w') as cfgout:
            for section in ['DEFAULT'] + self.__config.sections():
                cfgout.write(f'[{section}]\n')
                for key in self.__config[section]:
                    cfgvalue = self.__config.get(section, key, raw=True)
                    defvalue = self.__default_config.get(section, key, raw=True)
                    if (section == 'DEFAULT' or key not in self.__config['DEFAULT']):
                        if cfgvalue == defvalue:
                            cfgout.write('#')
                        cfgout.write(f'{key} = {cfgvalue}\n')
                cfgout.write('\n')

    def __str__(self):
        '''String representation of the configuration

        :returns: A ``str`` representing the configuration.
        '''
        buf = StringIO()
        self.__config.write(buf)
        return buf.getvalue()

    def __repr__(self):
        '''Textual represnetation of the Configuration object

        :returns: A ``str`` representation of the Configuration object.
        '''
        return f'Configuration(config="{self}")'


async def get_session(config: Configuration) -> M1Session:
    '''Get the current M1Session object

    If the M1Session object does not exist, create it.

    :param Configuration config: The application configuration to use for connection information.
    :return: the M1Session instance.
    :rtype: M1Session
    '''
    global _m1_session
    if _m1_session is None:
        data_store_dir = config.get('data_store')
        if data_store_dir is not None:
            data_store = await JSONFileDataStore(config.get('data_store'))
        else:
            data_store = None
        _m1_session = await M1Session((config.get('m1_address', 'localhost'), config.get('m1_port',7777)), data_store, config.get('certificate_signing_class'))
    return _m1_session