# Command Line Interface Tool

## Introduction

The Python-based Command Line Interface tool for 5GMS management is a set of executable wrapper modules built upon
Python classes which interacts with the 5GMS Application Function's RESTful API at reference point M1 to provision 5GMS
services.

## Installation

In order to install the Python CLI tool to control 5GMS Application Function operations, compile the `python` library:

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

## Usage

For detailed instructions on how to use the Command Line Interface Tool please refer to
the [Wiki](https://github.com/5G-MAG/rt-5gms-application-function/wiki) of
the [5GMS Application Function](https://github.com/5G-MAG/rt-5gms-application-function)
