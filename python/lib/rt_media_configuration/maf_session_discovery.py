#!/usr/bin/python3
'''
MAF Session discovery helpers for management UI integration.
'''

import configparser
import os
from typing import Any, Dict


def get_maf_config_path() -> str:
    if os.getuid() != 0:
        return os.path.expanduser(os.path.join('~', '.rt-5gms', 'maf-client.conf'))
    return os.path.join(os.path.sep, 'etc', 'rt-5gms', 'maf-client.conf')


def maf_config_exists() -> bool:
    return os.path.isfile(get_maf_config_path())


def _load_maf_config() -> configparser.ConfigParser:
    cfg = configparser.ConfigParser()
    cfg.read(get_maf_config_path())
    return cfg


def load_maf_authority() -> tuple[str, int]:
    cfg = _load_maf_config()
    maf_host = cfg.get('maf-client', 'maf_address')
    maf_port = cfg.getint('maf-client', 'maf_port')
    return maf_host, maf_port


def is_maf_auto_discover_enabled() -> bool:
    if not maf_config_exists():
        return False
    cfg = _load_maf_config()
    return cfg.getboolean('maf-client', 'auto_discover', fallback=False)


def set_maf_auto_discover(enabled: bool) -> None:
    path = get_maf_config_path()
    cfg = _load_maf_config()
    if not cfg.has_section('maf-client'):
        cfg.add_section('maf-client')
    cfg.set('maf-client', 'auto_discover', 'true' if enabled else 'false')
    with open(path, 'w') as cfg_file:
        cfg.write(cfg_file)


def maf_capabilities() -> Dict[str, bool]:
    return {
        "maf_discovery_available": maf_config_exists(),
        "maf_auto_discover": is_maf_auto_discover_enabled()
    }


async def discover_sessions_via_maf(m1_session: Any, media_configuration: Any) -> Dict[str, Any]:
    from rt_maf_client.client import MafClient

    maf_client = MafClient(load_maf_authority())
    session_ids = await maf_client.enumerateProvisioningSessions()
    session_ids = [str(s) for s in (session_ids or [])]

    added = 0
    if session_ids:
        added = await m1_session.provisioningSessionAddIds(session_ids)

    await media_configuration.restoreModel()
    return {
        "status": "ok",
        "discovered_session_ids": session_ids,
        "discovered_count": len(session_ids),
        "added_count": added
    }
