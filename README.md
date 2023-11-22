<h1 align="center">5GMS M1 Interface Management UI</h1>
<p align="center">
  <img src="https://img.shields.io/badge/Status-Under_Development-yellow" alt="Under Development">
  <img src="https://img.shields.io/github/v/tag/5G-MAG/rt-5gms-application-function?label=version" alt="Version">
  <img src="https://img.shields.io/badge/License-5G--MAG%20Public%20License%20(v1.0)-blue" alt="License">


## Development progress  
| Network functionalities| Asynchronous endpoints|UI elements|Unit test|
| ------------------------------------- | --------- | -- |--|
| Create Provisioning session|`/create_session`|✅|✅
| Remove Provisioning session|`/delete_session/{provisioning_session_id}`|✅|✅|
| Content Hosting Configuration from JSON|`/set_stream/{provisioning_session_id}`|✅||
| Check the session details|`/details`|✅||
| Create Server Certificate|`/certificate/{provisioning_session_id}`|✅||
| Show Certificate Details|`/show_certificate/{provisioning_session_id}/{certificate_id}`|✅||
| Show Content Protocols|`/show_protocol/{provisioning_session_id}`|✅|✅|
| Cosumption Reporting|`/set_consumption/{provisioning_session_id} /show_consumption/{provisioning_session_id} /del_consumption/{provisioning_session_id}`|✅||
| Create Provisioning session with Content Hosting Configuration|TBD|TBD|TBD|

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
