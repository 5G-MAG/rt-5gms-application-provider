<h1 align="center">5GMS Application Provider</h1>
<p align="center">
  <img src="https://img.shields.io/github/v/tag/5G-MAG/rt-5gms-application-provider?label=version" alt="Version">
  <img src="https://img.shields.io/badge/Status-Under_Development-yellow" alt="Under Development">
  <img src="https://github.com/5G-MAG/rt-5gms-application-provider/actions/workflows/integration-test.yml/badge.svg" alt="Integration Test">
  <img src="https://img.shields.io/badge/License-5G--MAG%20Public%20License%20(v1.0)-blue" alt="License">
</p>

# Introduction

This repository represents the 5GMS Application Provider side in a 3GPP compliant 5G Media Streaming
architecture. It provides multiple tools to interact with
the [5GMS Application Function](https://github.com/5G-MAG/rt-5gms-application-function)
via the interface at reference point M1. In addition, this repository contains a web-based graphical user interface to
visualize QoE Metrics Reports.

# Command Line Interface Tool

The Python-based Command Line Interface tool for 5GMS management is a set of executable wrapper modules
built upon Python classes which interacts with the 5GMS Application Function's RESTful API at reference point M1 to
provision 5GMS services. The source files and the documentation are located in the `python` folder of
this repository.

The installation instructions for the Command Line Interface Tool can be found [here](python/README.md).

# Management UI

A web-based Graphical User Interface for 5GMS management that uses the aforementioned Python
classes and interacts with the 5GMS Application Function. The source files and the documentation are located in
the `management-ui` folder of this repository.

The installation instructions for the Management UI can be found [here](management-ui/README.md).

# Postman Collection

Postman recipes to test the 5GMS Application Function's API at reference point M1. This is a collection
of predefined HTTP requests for every Application Function's RESTful endpoint, including environmental variables and
requests payload. The source files and the documentation are located in the `postman` folder of this repository.

The installation instructions for the Postman Collection can be found [here](postman/README.md).

# QoE Metrics Reporting UI

A web-based Graphical User Interface that parses a QoE Metrics Report provided in XML
format and outputs its content in graphical and tabular form. The source files and the documentation are located in
the `qoe-metrics-reporting-ui` folder of this repository.

The installation instructions for the Management UI can be found [here](qoe-metrics-reporting-ui/README.md).
