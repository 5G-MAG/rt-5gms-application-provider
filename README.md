<h1 align="center">5GMS Application Provider</h1>
<p align="left">
  <img src="https://img.shields.io/github/v/tag/5G-MAG/rt-5gms-application-function?label=version" alt="Version">
  <img src="https://img.shields.io/badge/Status-Under_Development-yellow" alt="Under Development">
  <img src="https://github.com/5G-MAG/rt-5gms-application-provider/actions/workflows/integration-test.yml/badge.svg" alt="Integration Test">
  <img src="https://img.shields.io/badge/License-5G--MAG%20Public%20License%20(v1.0)-blue" alt="License">
</p>

# Introduction

This repository represents the 5GMS Application Provider side in a 3GPP compliant 5G Media Streaming
architecture. It interacts with the [5GMS Application Function](https://github.com/5G-MAG/rt-5gms-application-function)
via the interface at reference point M1. For that reason, this repository comes with multiple different tools:

* **CLI tool**: The Python-based Command Line Interface tool for 5GMS management is a set of executable wrapper modules
  built upon Python classes which interacts with the 5GMS Application Function's RESTful API at reference point M1 to
  provision 5GMS services.
* **Management UI**: A web-based Graphical User Interface for 5GMS management that uses the aforementioned Python classes.
* **Postman**: Postman recipes to test the 5GMS Application Function's API at reference point M1. This is a collection
  of predefined HTTP requests for every Application Function's RESTful endpoint, including environmental variables and
  requests payload.

## Installing the Command Line Interface tool

In order to use Python CLI tool to control 5GMS Application Function operations, compile `python` library:

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

## Installing the Management UI

There are two ways to run this application. The recommendation is to use the **Docker Compose** service, because
lightweight container building and activation will solve the entire scope of dependencies and the rest of the
requirements.

### 1. Docker Compose

To install Docker Compose service follow the official [documentation](https://docs.docker.com/compose/install/). Next,
clone this
repository:

```
cd
git clone https://github.com/5G-MAG/rt-5gms-application-provider
cd ~/rt-5gms-application-provider
```

Building the Docker image will effectively install all dependencies for the 5GMS Application Function and the Management UI:

```
sudo docker-compose build
```

Upon successful completion, activate Application Provider with:

```
sudo docker-compose up
```

Access the module at: `localhost:8000`

### 2. Separate installation

If you prefer to run the 5GMS Application Function separately,
without setting it up in the Docker environment, you have to build and install it as a local user. For that
purpose, please follow
this [documentation](https://github.com/5G-MAG/rt-5gms-application-function/wiki/Testing-as-a-Local-User).

Once installed and built, run the 5GMS Application Function:

```
~/rt-5gms-application-function/install/bin/open5gs-msafd
```

Subsequently, install the Python dependencies required for Management UI:

```
cd ~/rt-5gms-application-provider
python3 -m pip install ./python
pip3 install -r requirements.txt
```

Activate the Management UI application:

```
cd management-ui/
uvicorn server:app --reload
```

The Management UI will be accessible at port `8000`.

### Testing Management UI

This repository contains CI/CD workflows for building native Docker image, Docker Compose and integration test for
Management UI application.

Automated integration test is written to provide entire provisioning cycle, starting with creation of provisioning
session, activating all network procedures, and finalizing with deletion of all resources. It effectively conducts
sequence of HTTP requests to every Management UI web server's endpoint.

Run integration test :

```
cd ~/rt-5gms-application-provider/management-ui/tests
pytest integration_test.py
```

Please be aware that this procedure is already provided with the repository's CI/CD pipeline.

## Using the Postman Collection

A Postman collection comprises a set of predefined HTTP requests, each containing the necessary payloads for every M1
Application Function endpoint, along with environment variables for endpoint URLs. For detailed explanation on how to
import, configure and use this collection please visit
this [wiki page](https://github.com/5G-MAG/rt-5gms-application-function/wiki/Testing-with-Postman).
