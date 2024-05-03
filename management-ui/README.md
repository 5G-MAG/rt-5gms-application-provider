# Management UI

## Introduction

A web-based Graphical User Interface for 5GMS management that uses the [Python library](../python/README.md) to
interact with the 5GMS Application Function. The source files and the documentation are located in
the `management-ui` folder of this repository.

## Installation

There are two ways to run this application. The recommendation is to use the **Docker Compose** service, because
lightweight container building and activation will solve the entire scope of dependencies and the rest of the
requirements.

### Option 1. Docker Compose

To install Docker Compose service follow the official [documentation](https://docs.docker.com/compose/install/). Next,
clone this
repository:

```
cd
git clone https://github.com/5G-MAG/rt-5gms-application-provider
cd ~/rt-5gms-application-provider
```

Building the Docker image will effectively install all dependencies for the 5GMS Application Function and the Management
UI:

```
sudo docker-compose build
```

Upon successful completion, activate Application Provider with:

```
sudo docker-compose up
```

Access the module at: `localhost:8000`

### Option 2. Separate installation

If you prefer to run the 5GMS Application Function separately,
without setting it up in the Docker environment, you have to build and install it as a local user. For that
purpose, please follow
this [documentation](https://5g-mag.github.io/Getting-Started/pages/5g-media-streaming/usage/application-function/installation-local-user-5GMSAF.html).

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

## Testing

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
