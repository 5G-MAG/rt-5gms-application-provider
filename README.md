<h1 align="center">5GMS Application Provider</h1>
<p align="center">
  <img src="https://img.shields.io/badge/Status-Under_Development-yellow" alt="Under Development">
  <img src="https://img.shields.io/github/v/tag/5G-MAG/rt-5gms-application-function?label=version" alt="Version">
  <img src="https://img.shields.io/badge/License-5G--MAG%20Public%20License%20(v1.0)-blue" alt="License">
</p>

# Introduction
This full-stack web application represents Application Provider of 3GPP compliant 5G Media Streaming architecure, and it is part of 5GMAG's Reference Tools. It interacts with Application Function via interface with reference point M1, with possibility to establish connection over unstandardized M8.

It utilizes Python tool classes that has been developed as CLI-based Application Provider. Every provisioning procedure is implemented as related web-server's endpoint, supported with the graphical control dashboard. With full-stack approach, the codebase of Application Provider becomes maintainable, scalable for new provisioning features, and the interaction with Application Function is enhanced with modern engineering design.

Furthermore, automated integration test is written to provide entire provisioning cycle starting with creation of provisioning session, activating realted procedures, and finalizing with deletion of resources. In addition - project has been wrapped with Docker Compose to prevent building & dependency issues and development supported with realted GitHub CI/CD actions.

## Licensing and authorization
Licence and authorization are aligned with Fraunhofer Fokus, 5GMAG's and British Broadcast Company's (BBC) norms & regulations.
For the full license terms, please see the LICENSE file distributed along with the repository for 5GMS Reference Tools or retrieve it from [here.](https://drive.google.com/file/d/1cinCiA778IErENZ3JN52VFW-1ffHpx7Z/view")

TBD:

## Building and installing
There are two ways to run this project, and the warm reccomendation is to use **Docker Compose** service, because lightweight container building and activation will solve entire scope of dependecies and the rest of requirements.
Please follow the official [documentation](https://docs.docker.com/compose/install/) to install Docker Compose.

Next, clone this repository:
```
cd
git clone https://github.com/5G-MAG/rt-5gms-m1-management-ui
```

Building this Docker image will effectivelly install all requirements for RT Application Function and the rest of Python packages:
```
cd ~/rt-5gms-m1-management-ui
sudo docker-compose build
```

Upon successful building of both services within Docker container, activate 5GMAG's Reference Tools with:
```
sudo docker-compose up
```

Be aware that M1 Management tool is supposed to be accessed at: `localhost:8000`

## Separate installation
If you prefere to have both services installed separately, without setting up the Docker environment, you can achieve this by building and installing 5GMAG's Reference Tool Application Function, as the local user, from this [documentation](https://github.com/5G-MAG/rt-5gms-application-function/wiki/Testing-as-a-Local-User). Subsequently, you will have to take care of Python requirements in order to activate M1 Management tool's server and run the tests.

Clone this repository, and install Python required dependencies:
```
cd
git clone https://github.com/5G-MAG/rt-5gms-m1-management-ui
cd ~/rt-5gms-m1-management-ui
pip3 install -r requirements.txt
```

Activate M1 Management UI server with the following command:
```
uvicorn server:app --reload
```
The application will be accessible at the port `8000`, but it must communicate with the Reference tool Application Function running as the separate process.

## Testing and deployment
This repository contains 3 CI/CD workflows for building native Docker image, Docker Compose and endpoint's testing.
Those actions are configured to happen automatically after evey change within this repository.

Integration test ensures care that every endpoint, implemented for M1 Management Tool UI, corresponds with RT Appliation Function correctly. Instead of manually checking each network operations, one can run automated test instead:
```
cd ~/rt-5gms-m1-management-ui/tests
pytest integration_test.py
```
Please be aware that this testing is already provided with the repository's CI/CD workflow.

## Development
This project follows the [Gitflow workflow](https://www.atlassian.com/git/tutorials/comparing-workflows/gitflow-workflow). The potential development branch of this project serves as an integration branch for new features. Consequently, please make sure to switch to the development branch before starting the implementation of a new feature.
