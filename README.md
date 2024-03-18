<h1 align="center">5GMS Application Provider</h1>
<p align="center">
  <img src="https://img.shields.io/badge/Status-Under_Development-yellow" alt="Under Development">
  <img src="https://img.shields.io/github/v/tag/5G-MAG/rt-5gms-application-function?label=version" alt="Version">
  <img src="https://img.shields.io/badge/License-5G--MAG%20Public%20License%20(v1.0)-blue" alt="License">
</p>

# Introduction
This full-stack web application represents Application Provider of 3GPP compliant 5G Media Streaming architecure, and is part of 5GMAG's Reference Tools. It interacts with the RT Application Function via interface with reference point M1, with the possibility to establish connection over unstandardized M8.

It utilizes a Python library to interact with the RT Application Function. Every provisioning procedure is implemented as a related web-server's endpoint, supported with a graphical control dashboard.

# Building and installing
There are two ways to run this project, and the warm reccomendation is to use **Docker Compose** service, because lightweight container building and activation will solve entire scope of dependecies and the rest of requirements.

## Docker Compose
To install this service follow the official [documentation](https://docs.docker.com/compose/install/). Next, clone this repository:
```
cd
git clone https://github.com/5G-MAG/rt-5gms-application-provider
cd ~/rt-5gms-application-provider
```

Building Docker image will effectivelly install all dependecies for RT Application Function and the rest of Python dependencies:

```
sudo docker-compose build
```

Upon successful completion, activate RT Application Provider with:
```
sudo docker-compose up
```

Open the module at: `localhost:8000`

## Separate installation
If you prefere to run RT Application Function and Provisioning Web server separately, without setting up the Docker environment, you have to build and install RT Application Function as a local user. Please follow this [documentation](https://github.com/5G-MAG/rt-5gms-application-function/wiki/Testing-as-a-Local-User). 

Once installed and built, activate RT Application Function:

```
~/rt-5gms-application-function/install/bin/open5gs-msafd
```

Subsequently, install Python dependencies in order to run web-based GUI server:

```
cd ~/rt-5gms-application-provider
python3 -m pip install ./python
pip3 install -r requirements.txt
```

Activate GUI with the following command:
```
cd management-ui/
uvicorn server:app --reload
```
Web application will be accessible at the port `8000`, and it requires active communication with the RT Application Function running as a separate process.

## CLI program
Python Web Server implements classes and methods from `python` library. If you prefere to control RT Application Function operations using Command Line Interface, independently of the web-based GUI, run the following command on the `python` subdirectory:

```
cd rt-5gms-application-provider
python3 -m pip install ./python
```

This will install the executables i.e. `m1-session`, `m1-client` and `msaf-configuration` and associated `rt_m1_client` python module.
For testing use a venv so that you don't change system python modules, e.g.:

```
cd rt-5gms-application-provider
python3 -m venv venv
venv/bin/python3 -m pip install ./python
```

## Testing and deployment
This repository contains CI/CD workflows for building native Docker image, Docker Compose and integration test. Automated integration test is written to provide entire provisioning cycle starting with creation of provisioning session, activating realted procedures, and finalizing with deletion of resources. 

Run automated test:
```
cd ~/rt-5gms-application-provider/management-ui/tests
pytest integration_test.py
```
Please be aware that this procedure is already provided with the repository's CI/CD pipeline. 

# Licensing and authorization
This project is developed under 5GMAG's Public License and in accordance with BBC and Fraunhofer Fokus legal norms & regulations. For the full license terms, please see the LICENSE file distributed along with the repository or retrieve it from [here.](https://drive.google.com/file/d/1cinCiA778IErENZ3JN52VFW-1ffHpx7Z/view)
