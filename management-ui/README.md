# Management UI

This is a full-stack web application based on Python classes and Vanilla JS. It interacts with the 5GMS Application Function via M1 Interface and enables publishing of the M8 json file.
It can be utilized as the part of overall 5GMS architecture or isolated with 5GMS AF for development purposes.
Set of provisioning operations implemented in this application is defiend in the TS26.512.
Backend server is based on FastAPI framework to convert CLI Python methods into web endpoints. Frontend JavaScript `modules` are sending dedicated HTTP requests to the backend, with the required payload generated through the stylized HTML `forms`.


## Installation

### Option 1: Docker image

To install Docker Compose, follow the official [documentation](https://docs.docker.com/compose/install/).

Clone 5GMS Application Provider repository:

```
cd
git clone https://github.com/5G-MAG/rt-5gms-application-provider
cd ~/rt-5gms-application-provider
```

Building the Docker image will effectively install all dependencies for the 5GMS Application Function and the Management UI:

```
sudo docker-compose build
```

Upon successful completion, activate 5GMS Application Provider with:
```
sudo docker-compose up
```

Access the module at: `localhost:8000`

### Option 2: Separate installation

Firstly install 5GMS Application Function following
this [documentation](https://5g-mag.github.io/Getting-Started/pages/5g-media-streaming/usage/application-function/installation-local-user-5GMSAF.html).

Subsequently, install the Python dependencies required for the Management UI:

```
cd ~/rt-5gms-application-provider
sudo python3 -m pip install ./python
pip3 install -r requirements.txt
```

Activate 5GMS Application Function:

```
~/rt-5gms-application-function/install/bin/open5gs-msafd
```

Activate the Management UI application:

```
cd management-ui/
uvicorn server:app --reload
```

The Management UI will be accessible at port `8000`.

In case that you're receving any kind of web proxy errors, you can bypass that by using empty `http` and `https` proxy flags when running the server:

```
cd management-ui/
http_proxy= https_proxy= uvicorn server:app --reload
```

## Testing

All endpoints are covered with this test, which runs one provisioning cycle and activates all network procedures, checks the responses before deleting all resources.

Run automated test:

```
cd ~/rt-5gms-application-provider/management-ui/tests
pytest integration_test.py
```
