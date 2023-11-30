<h1 align="center">5GMS M1 Interface Management UI</h1>
<p align="center">
  <img src="https://img.shields.io/badge/Status-Under_Development-yellow" alt="Under Development">
  <img src="https://img.shields.io/github/v/tag/5G-MAG/rt-5gms-application-function?label=version" alt="Version">
  <img src="https://img.shields.io/badge/License-5G--MAG%20Public%20License%20(v1.0)-blue" alt="License">

M1 Management tool is one of the 5GMAG's reference tools, designed and developed to facilitate network operations within 3GPP standardize 5G streaming architecture. Is supports and expands the M1 CLI Tools with meticulously designed control panel. This UI implements all network operations, that are happening at the data network side of overall architecture, as endpoints meant to be visualized and used by the browser.

## Activate the UI server:

Run the server:

```
uvicorn server:app --reload
```

## Licensing and authorization
TBD

## Run tests:
```
cd tests/
pytest integration_test.py
```

## Development
This project follows the [Gitflow workflow](https://www.atlassian.com/git/tutorials/comparing-workflows/gitflow-workflow). The potential development branch of this project serves as an integration branch for new features. Consequently, please make sure to switch to the development branch before starting the implementation of a new feature.
