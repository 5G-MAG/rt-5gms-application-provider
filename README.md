# 5G Reference Tools - 5GMS Application Function Management UI
M1 Client tool user interface is build as graphical extension for 5GMS reference tool (RT) [**Application Function** (AF)](https://github.com/5G-MAG/rt-5gms-application-function). It represent network component that operates in accordance with another RT [**Application Server** (AS)](https://github.com/5G-MAG/rt-5gms-application-server), enriching entire [5GMAGs](https://github.com/5G-MAG) platform with network functionalities such are provisioning session, content hosting configuration, consumetrics reporting etc. The user interface has been developed as layer on top of existing M1 interface (which establish communication between 5GMs application provider and AF), and it shows [M1 CLI testing tool](https://github.com/5G-MAG/rt-5gms-application-function/wiki/Testing-the-M1-Interface-on-v1.3.0) in meticulous, smooth and user-friendy way.


## 📜 Licensing and authorization
UI application has been developed as part of educational module for master students. Licence and autorization are alligned with **5GMAG's** and institutional norms of **Techincal University of Berlin**.

## Installing
This application requires Linux environment, and warm recommendation is Ubuntu 22.04 LTS.

1️⃣ Clone this repository:

`git clone add_link_for_repository`

2️⃣ Next, you must have installed before mentioned RTs. Please follow the provided guides to install components properly:
- [Application Function](https://github.com/5G-MAG/rt-5gms-application-function/wiki/Testing-as-a-Local-User) (recommended installation as local user)
- [Application Server](https://github.com/5G-MAG/rt-5gms-application-server/wiki/Development-and-Testing#build-and-install-the-5gms-application-server) (recommended installation as system service). Be aware which versions are required for setup (time sensitive!). 

3️⃣ After installation is completed, run both components in separate terminals:

`sudo 5gms-application-server`

`~/rt-5gms-application-function/install/bin/open5gs-msafd`

## 🚀 Running

Once both RTs are running flawlessly, install requirements:
- flask

Run the application:

`python3 m1-user-interface.py`

Application is self explanatory, but results of actions can be followed in running terminals for RTs.


## Development
This project follows the [Gitflow workflow](https://www.atlassian.com/git/tutorials/comparing-workflows/gitflow-workflow). The development branch of this project serves as an integration branch for new features. Consequently, please make sure to switch to the development branch before starting the implementation of a new feature.