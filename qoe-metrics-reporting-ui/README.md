# QoE Metrics Reporting UI

## Introduction
This project provides a simple webpage to evaluate QoE metrics reported by a 5GMS client during a DASH streaming session.

## Project Structure
* `assets`: Contains static files used in `index.html`
* `samples`: Contains the QoE metrics reports in XML format. By default, the webpage parses and visualizes the data from `sample.xml`
* `src`: The source code of the UI

## Installation
Install the dependencies: `npm install`

## Run
1. Start the application server: `npm start`
2. Navigate to `http://localhost:3000/` in your browser
