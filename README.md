# 5GMS Application Function Management UI
M1 Client tool user interface has been built as graphical extension for 5GMS reference tool (RT) [**Application Function** (AF)](https://github.com/5G-MAG/rt-5gms-application-function) which represents network component that operates in accordance with another RT [**Application Server** (AS)](https://github.com/5G-MAG/rt-5gms-application-server), enriching entire [**5GMAGs**](https://github.com/5G-MAG) platform with network functionalities such are provisioning session, content hosting configuration, consumetrics reporting etc. The user interface represent graphical layer on top of existing M1 interface (endpoint which establishes communication between 5GMs application provider and AF), and it operates as [M1 CLI testing tool](https://github.com/5G-MAG/rt-5gms-application-function/wiki/Testing-the-M1-Interface-on-v1.3.0) but in user-friendy way.


## 📜 Licensing and authorization
UI application has been developed as part of educational module for master students. Licence and autorization are alligned with **5GMAG's** and institutional norms of **Techincal University of Berlin**.

## ⚙️ Installation
This application requires Linux operating environment with warm recommendation for **Ubuntu (based) 22.04 LTS**.

1️⃣ Clone this repository:

```
git clone https://github.com/stojkovicv/5gms-m1-user-interface.git
```
2️⃣ Install UI dependencies:

```
pip install flask
```

3️⃣ Next, you must have installed above-mentioned RT Application Function. Please follow the guide in order to it properly:
- [Application Function](https://github.com/5G-MAG/rt-5gms-application-function/wiki/Testing-as-a-Local-User) (**recommended installation as local user**)

Be aware which versions are required for correct setup (time sensitive!). 

4️⃣ After installation is completed, run Application Function in separate terminals:

- Start Application Function:

```
~/rt-5gms-application-function/install/bin/open5gs-msafd
```

5️⃣ If required allow root permission on configuration files:

```
sudo chmod 777 /var/cache/rt-5gms/m1-client/provisioning_sessions.json
```
 
## 🚀 Running

Run the application:

```
python3 m1-user-interface.py
```

Although application is self-explanatory, complete actions results can be followed in running terminals.


## Development
This project follows the [Gitflow workflow](https://www.atlassian.com/git/tutorials/comparing-workflows/gitflow-workflow). The potential development branch of this project serves as an integration branch for new features. Consequently, please make sure to switch to the development branch before starting the implementation of a new feature.
