<h1 align="center">5GMS M1 Interface Management UI</h1>
<p align="center">
  <img src="https://img.shields.io/badge/Status-Under_Development-yellow" alt="Under Development">
  <img src="https://img.shields.io/github/v/tag/5G-MAG/rt-5gms-application-function?label=version" alt="Version">
  <img src="https://img.shields.io/badge/License-5G--MAG%20Public%20License%20(v1.0)-blue" alt="License">


## Development progress  
| Network functionalities| Asynchronous endpoints|UI elements|Unit test|
| ------------------------------------- | --------- | -- |--|
| Create Provisioning session|✅|✅|✅
| Remove Provisioning session|✅|✅|✅|
| Content Hosting Configuration from JSON|✅|✅||
| Check the session details|✅|✅||
| Create Server Certificate|✅|✅||
| Show Certificate Details|✅|✅||
| Show Content Protocols|✅|✅||
| Cosumption Reporting|✅|✅||
| Create Provisioning session with Content Hosting Configuration|❌|❌||

## Activate the UI server:

Run the server:

```
uvicorn server:app --reload
```

## Licensing and authorization
TBD

## Run tests:
TBD

```
cd tests
pytest integration_test.py
```

## Development
This project follows the [Gitflow workflow](https://www.atlassian.com/git/tutorials/comparing-workflows/gitflow-workflow). The potential development branch of this project serves as an integration branch for new features. Consequently, please make sure to switch to the development branch before starting the implementation of a new feature.
