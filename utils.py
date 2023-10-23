import os
import sys
import datetime
import OpenSSL
import configparser


def append_ap_packages_to_sys_path():
    installed_packages_dir = '/home/stepski/rt-5gms-application-function/install/lib/python3.9/site-packages/'
    if os.path.isdir(installed_packages_dir) and installed_packages_dir not in sys.path:
        sys.path.append(installed_packages_dir)

async def __prettyPrintCertificate(cert: str, indent: int = 0) -> None:
    cert_desc = {}
    try:
        x509 = OpenSSL.crypto.load_certificate(OpenSSL.crypto.FILETYPE_PEM, cert)
    except OpenSSL.crypto.Error as err:
        print(f'{" "*indent} Certificate not understood as PEM data: {err}')
        return
    serial = x509.get_serial_number()
    subject = x509.get_subject()
    issuer = x509.get_issuer()
    start_str = x509.get_notBefore()
    if isinstance(start_str, bytes):
        start_str = start_str.decode('utf-8')
    start = datetime.datetime.strptime(start_str, '%Y%m%d%H%M%SZ').replace(tzinfo=datetime.timezone.utc)
    end_str = x509.get_notAfter()
    if isinstance(end_str, bytes):
        end_str = end_str.decode('utf-8')
    end = datetime.datetime.strptime(end_str, '%Y%m%d%H%M%SZ').replace(tzinfo=datetime.timezone.utc)
    subject_key = None
    issuer_key = None
    sans = []
    for ext_num in range(x509.get_extension_count()):
        ext = x509.get_extension(ext_num)
        ext_name = ext.get_short_name().decode('utf-8')
        if ext_name == "subjectKeyIdentifier":
            subject_key = str(ext)
        elif ext_name == "authorityKeyIdentifier":
            issuer_key = str(ext)
        elif ext_name == "subjectAltName":
            sans += [s.strip() for s in str(ext).split(',')]
    cert_info_prefix=' '*indent
    cert_desc=f'{cert_info_prefix}Serial = {serial}\n{cert_info_prefix}Not before = {start}\n{cert_info_prefix}Not after = {end}\n{cert_info_prefix}Subject = {__formatX509Name(subject)}\n'
    if subject_key is not None:
        cert_desc += f'{cert_info_prefix}          key={subject_key}\n'
    cert_desc += f'{cert_info_prefix}Issuer = {__formatX509Name(issuer)}'
    if issuer_key is not None:
        cert_desc += f'\n{cert_info_prefix}         key={issuer_key}'
    if len(sans) > 0:
        cert_desc += f'\n{cert_info_prefix}Subject Alternative Names:'
        cert_desc += ''.join([f'\n{cert_info_prefix}  {san}' for san in sans])
    return cert_desc

def __formatX509Name(x509name: OpenSSL.crypto.X509Name) -> str:
    ret = ",".join([f"{name.decode('utf-8')}={value.decode('utf-8')}" for name,value in x509name.get_components()])
    return ret
