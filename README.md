<h1 align="center">5GMS Application Provider</h1>
<p align="center">
  <img src="https://img.shields.io/badge/Status-Under_Development-yellow" alt="Under Development">
  <img src="https://img.shields.io/github/v/tag/5G-MAG/rt-5gms-application-function?label=version" alt="Version">
  <img src="https://img.shields.io/badge/License-5G--MAG%20Public%20License%20(v1.0)-blue" alt="License">
</p>

# Introduction

This repository represents the 5GMS Application Provider side in a 3GPP compliant 5G Media Streaming
architecture. It interacts with the [5GMS Application Function](https://github.com/5G-MAG/rt-5gms-application-function)
via the interface at reference point M1. For that reason, this repository comes with multiple different tools:

* Management-UI: Tbd
* CLI: Tbd
* Postman: Tbd

This application utilizes a Python library to interact with
the [5GMS Application Function](https://github.com/5G-MAG/rt-5gms-application-function). Every M1 provisioning procedure
is implemented as a related web-server's endpoint, supported with a graphical control dashboard.

# Building and installing the GUI

There are two ways to run this project. The recommendation is to use the **Docker Compose** service, because
lightweight container building and activation will solve the entire scope of dependencies and the rest of the
requirements.

## Docker Compose

To install this service follow the official [documentation](https://docs.docker.com/compose/install/). Next, clone this
repository:

```
cd
git clone https://github.com/5G-MAG/rt-5gms-application-provider
cd ~/rt-5gms-application-provider
```

Building the Docker image will effectively install all dependencies for
the [5GMS Application Function](https://github.com/5G-MAG/rt-5gms-application-function) and this application:

```
sudo docker-compose build
```

Upon successful completion, activate Application Provider with:

```
sudo docker-compose up
```

Open the module at: `localhost:8000`

## Separate installation

If you prefer to run the [5GMS Application Function](https://github.com/5G-MAG/rt-5gms-application-function) separately,
without setting it up in the Docker environment, you have to build and install
the [5GMS Application Function](https://github.com/5G-MAG/rt-5gms-application-function) as a local user. For that
reason, please follow
this [documentation](https://github.com/5G-MAG/rt-5gms-application-function/wiki/Testing-as-a-Local-User).

Once installed and built, run the 5GMS Application Function:

```
~/rt-5gms-application-function/install/bin/open5gs-msafd
```

Subsequently, install the Python dependencies in order to run web-based GUI server:

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

The web application will be accessible at port `8000`, and it requires active communication with the 5GMS Application
Function running as a separate process.

# Building and installing the CLI program

If you prefer to control 5GMS Application Function operations using a Command Line Interface (CLI), independently of the
web-based GUI, run the following command in the `python` subdirectory:

```
cd rt-5gms-application-provider
python3 -m pip install ./python
```

This will install the executables i.e. `m1-session`, `m1-client` and `msaf-configuration` and associated `rt_m1_client`
python module.
For testing use a venv so that you don't change system python modules, e.g.:

```
cd rt-5gms-application-provider
python3 -m venv venv
venv/bin/python3 -m pip install ./python
```

# Using the Postman Collection
Tbd

## Testing and deployment

This repository contains CI/CD workflows for building native Docker image, Docker Compose and integration test.
Automated integration test is written to provide entire provisioning cycle starting with creation of provisioning
session, activating realted procedures, and finalizing with deletion of resources.

Run automated test:

```
cd ~/rt-5gms-application-provider/management-ui/tests
pytest integration_test.py
```

Please be aware that this procedure is already provided with the repository's CI/CD pipeline.
