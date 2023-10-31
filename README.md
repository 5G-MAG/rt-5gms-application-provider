<h1 align="center">5GMS M1 Interface Management UI</h1>
<p align="center">
  <img src="https://img.shields.io/badge/Status-Under_Development-yellow" alt="Under Development">
  <img src="https://img.shields.io/github/v/tag/5G-MAG/rt-5gms-application-function?label=version" alt="Version">
  <img src="https://img.shields.io/badge/License-5G--MAG%20Public%20License%20(v1.0)-blue" alt="License">


## Development progress  
| Network functionalities                 | Asynchronous endpoints | UI elements |
| ------------------------------------- | --------- | -- |
| Create Provisioning session           | ✅        | ✅ |
| Create Provisioning session with Content Hosting Configuration  | ✅        |    |
| Remove Provisioning session           | ✅        |    |
| Content Hosting Configuration from JSON                         | ✅        |    |
| Check the session details             | ✅        |    |
| Create Server Certificate             | ✅        |    |
| Show Certificate Details              | ✅        |    |
| Show Content Protocols                | ✅        |    |
| Cosumption Reporting                  | ✅        |    |

## Installation
TBD

1️⃣ Clone this repository:

```
git clone https://github.com/stojkovicv/5gms-m1-user-interface.git
```
2️⃣ Install dependencies:

```
pip3 install -r requirements.txt
```

3️⃣ Set up Application Function. Please follow the guide in order to it properly:
- [Application Function](https://github.com/5G-MAG/rt-5gms-application-function/wiki/Testing-as-a-Local-User) (**installation as local user**)

Be aware of required versions for correct setup.

4️⃣ Start Application Function in separate CLI:

```
~/rt-5gms-application-function/install/bin/open5gs-msafd
```

5️⃣ If needed allow root permission on configuration files:

```
sudo chmod 777 /var/cache/rt-5gms/m1-client/provisioning_sessions.json
```
 
## Activate UI

Run the server:

```
uvicorn server:app --reload
```

## Licensing and authorization
TBD

## Development
This project follows the [Gitflow workflow](https://www.atlassian.com/git/tutorials/comparing-workflows/gitflow-workflow). The potential development branch of this project serves as an integration branch for new features. Consequently, please make sure to switch to the development branch before starting the implementation of a new feature.
