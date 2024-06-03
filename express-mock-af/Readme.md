# Express Mock Application Function

## Introduction

This project provides a very simple HTTP server that implements two routes.

The first route `m8.js` is used to return
information about the available services and the available base URL of the Application Function. The 5GMSd Aware
Application uses this route as M8 interface.

The second route `service-access-information.js` provides the corresponding Service Access Information to the data that
is returned via M8.

This server is intended to be used for development when static responses are enough to implement or test a new feature.

## Downloading

The source can be obtained by cloning the github repository.

```
cd ~
git clone https://github.com/5G-MAG/rt-5gms-examples.git
```

## Building

````
cd express-mock-af
npm install
```` 

## Running

````
cd express-mock-af
npm start
```` 

The server is started on port `3003` per default.

To query the M8 information call `http://localhost:3003/m8/m8.json`.

To query the Service Access Information
call `http://localhost:3003/3gpp-m5/v2/service-access-information/<provisioningSessionID>`, for
example `http://localhost:3003/3gpp-m5/v2/service-access-information/1` returns

````
{
  "provisioningSessionId": 1,
  "provisioningSessionType": "DOWNLINK",
  "streamingAccess": {
    "entryPoints": [
      {
        "locator": "https://livesim.dashif.org/livesim/testpic_2s/Manifest.mpd",
        "contentType": "application/dash+xml",
        "profiles": [
          "urn:mpeg:dash:profile:isoff-live:2011"
        ]
      }
    ]
  }
}
````

To access the server from a mobile device or another machine replace `localhost`
with the IP address of your machine.
