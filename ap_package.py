import os
import sys

def append_ap_packages_to_sys_path():
    installed_packages_dir = '/home/stepski/rt-5gms-application-function/install/lib/python3.9/site-packages/'
    if os.path.isdir(installed_packages_dir) and installed_packages_dir not in sys.path:
        sys.path.append(installed_packages_dir)
