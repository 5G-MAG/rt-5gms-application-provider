# Refactoring in progress!

```
uvicorn server:app --reload
```

## Functionalities

- Create Provisioning session ✅
- Create Provisioning session with CHC

### Per provisioning session:
- Remove Provisioning session ✅
- CHC from JSON ✅
- Check the session details ✅
- Create Server Certificate
- Show Certificate Details
- Show Content Protocols
- Create CHC without certificate
- Cosumption Reporting



# 5GMS Application Function Management tool
TBD
## Licensing and authorization
TBD

## Set up
This program requires Linux operating environment with warm recommendation for **Ubuntu (based) 22.04 LTS**.

1️⃣ Clone this repository:

```
git clone https://github.com/stojkovicv/5gms-m1-user-interface.git
```
2️⃣ Install dependencies:

```
pip3 install -r requirements. txt
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
 
## Activate Management tool

Run the main server:

```
uvicorn server:app --reload
```

## Development
This project follows the [Gitflow workflow](https://www.atlassian.com/git/tutorials/comparing-workflows/gitflow-workflow). The potential development branch of this project serves as an integration branch for new features. Consequently, please make sure to switch to the development branch before starting the implementation of a new feature.
