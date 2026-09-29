<p align="center">
  <img src=".github/banner.svg" width="100%" alt="Reference Tools · 5G Media Streaming (5GMS): 5GMS Application Provider">
</p>

<p align="center">
  The 5GMS Application Provider side of a 5G Media Streaming system: tools that provision services at
  the 5GMS Application Function over reference point M1, and a viewer for the reports it collects.
</p>

<p align="center">
  <img alt="Status: under development"
    src="https://img.shields.io/badge/Status-Under%20Development-e67e22">
  <a href="https://github.com/5G-MAG/rt-5gms-application-provider/releases"><img alt="Version"
    src="https://img.shields.io/github/v/release/5G-MAG/rt-5gms-application-provider?label=Version"></a>
  <a href="LICENSE"><img alt="License: 5G-MAG Public License v1.0"
    src="https://img.shields.io/badge/License-5G--MAG%20PL%20v1.0-blue"></a>
</p>

<p align="center">
  <a href="https://www.5g-mag.com/reference-tools/5gms/">Project page</a> &nbsp;&middot;&nbsp;
  <a href="https://github.com/5G-MAG/rt-5gms-application-provider/issues">Issues</a> &nbsp;&middot;&nbsp;
  <a href="https://www.5g-mag.com/contributing">Contributing</a>
</p>

---

## At a glance

|  |  |
|---|---|
| **Part of** | [5G Media Streaming (5GMS)](https://www.5g-mag.com/reference-tools/5gms/), alongside [cmcd-toolkit](https://github.com/5G-MAG/cmcd-toolkit), [rt-5gc-service-consumers](https://github.com/5G-MAG/rt-5gc-service-consumers), [rt-5gms-application](https://github.com/5G-MAG/rt-5gms-application), [rt-5gms-application-function](https://github.com/5G-MAG/rt-5gms-application-function), [rt-5gms-application-server](https://github.com/5G-MAG/rt-5gms-application-server), [rt-5gms-common-android-library](https://github.com/5G-MAG/rt-5gms-common-android-library), [rt-5gms-examples](https://github.com/5G-MAG/rt-5gms-examples), [rt-5gms-media-session-handler](https://github.com/5G-MAG/rt-5gms-media-session-handler), [rt-5gms-media-stream-handler](https://github.com/5G-MAG/rt-5gms-media-stream-handler), [rt-cmmf-encoder](https://github.com/5G-MAG/rt-cmmf-encoder), [rt-media-origin](https://github.com/5G-MAG/rt-media-origin) |

## Introduction

This repository holds the Application Provider side of a 3GPP 5G Media Streaming architecture. Its
tools interact with the [5GMS Application Function](https://github.com/5G-MAG/rt-5gms-application-function)
at reference point M1 to provision 5GMS services, and a web interface shows the QoE metrics reports
the Application Function has received. Each tool has its own folder and its own README with the
installation steps.

More information is on the [project page](https://www.5g-mag.com/reference-tools/5gms/).

### Command Line Interface Tool

A set of Python executables, built on Python classes, that call the 5GMS Application Function's
RESTful API at reference point M1 to provision 5GMS services. The source and documentation are in
the `python` folder; installation is described in [python/README.md](python/README.md).

### Management UI

A web interface for 5GMS management that uses the same Python classes to work with the 5GMS
Application Function. The source and documentation are in the `management-ui` folder; installation
is described in [management-ui/README.md](management-ui/README.md).

The Management UI also includes the QoE Metrics Reporting UI, which parses QoE metrics reports in
XML and shows their content as charts and tables. It is served by the Management UI at `/monitor/`;
it was previously a separate `qoe-metrics-reporting-ui` folder.

### Postman Collection

Postman collections for testing the 5GMS Application Function's API: predefined HTTP requests for
each of its RESTful endpoints, with environment variables and request payloads. The source and
documentation are in the `postman` folder; see [postman/README.md](postman/README.md).

## Contributing

Contributions are welcome. How to raise an issue, fork the repository and open a pull request, and
the Contributor License Agreement required before code can be merged, are described at
<https://www.5g-mag.com/contributing>.

## License

Distributed under the 5G-MAG Public License v1.0. See [LICENSE](LICENSE).
