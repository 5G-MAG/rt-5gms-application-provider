<h1 align="center">5GMS Application Provider</h1>
<p align="center">
  <img src="https://img.shields.io/badge/Status-Under_Development-yellow" alt="Under Development">
  <img src="https://img.shields.io/github/v/tag/5G-MAG/rt-5gms-application-function?label=version" alt="Version">
  <img src="https://img.shields.io/badge/License-5G--MAG%20Public%20License%20(v1.0)-blue" alt="License">
</p>

# Introduction
This full-stack web application represents Application Provider of 3GPP compliant 5G Media Streaming architecure, and it is part of 5GMAG's Reference Tools. It interacts with Application Function via interface with reference point M1, with possibility to establish connection over unstandardized M8.

It utilizes Python tool classes that has been developed as CLI-based Application Provider. Every provisioning procedure is implemented as related web-server's endpoint, supported with the graphical control dashboard. With full-stack approach, the codebase of Application Provider becomes maintainable, scalable for a new provisioning features, and the interaction with Application Function is enhanced with modern engineering design.

# Building and installing
There are two ways to run this project, and the warm reccomendation is to use **Docker Compose** service, because lightweight container building and activation will solve entire scope of dependecies and the rest of requirements.

## Docker Compose
To install this service follow the official [documentation](https://docs.docker.com/compose/install/). Next, clone this repository:
```
cd
git clone https://github.com/5G-MAG/rt-5gms-application-provider
```

Building this Docker image will effectivelly install all requirements for RT Application Function and the rest of Python packages:
```
cd ~/rt-5gms-application-provider
sudo docker-compose build
```

Upon successful completion, activate RT Application Provider with:
```
sudo docker-compose up
```

Accessed the module at: `localhost:8000`

## Separate installation
If you prefere to have both services installed separately, without setting up the Docker environment, you have to build and install RT Application Function as the local user. Please use this [documentation](https://github.com/5G-MAG/rt-5gms-application-function/wiki/Testing-as-a-Local-User). Subsequently, you must install Python requirements in order to activate this Application Provider.

Clone this repository, and install Python dependencies:
```
cd
git clone https://github.com/5G-MAG/rt-5gms-application-provider
cd ~/rt-5gms-application-provider
pip3 install -r requirements.txt
pip3 install ./python
```

Activate server with the following command:
```
uvicorn server:app --reload
```
The application will be accessible at the port `8000`, but it must communicate with the Reference tool Application Function running as the separate process.

## Testing and deployment
This repository contains CI/CD workflows for building native Docker image, Docker Compose and integration test. Automated integration test is written to provide entire provisioning cycle starting with creation of provisioning session, activating realted procedures, and finalizing with deletion of resources. 

Run automated test:
```
cd ~/rt-5gms-application-provider/tests
pytest integration_test.py
```
Please be aware that this procedure is already provided with the repository's CI/CD pipeline. 

# Licensing and authorization
This project is developed under 5GMAG's Public License and in accordance with BBC and Fraunhofer Fokus legal norms & regulations. For the full license terms, please see the LICENSE file distributed along with the repository or retrieve it from [here.](https://drive.google.com/file/d/1cinCiA778IErENZ3JN52VFW-1ffHpx7Z/view)
