# Consumption and QoE Metrics Reporting UI

## Introduction

This project provides a web-based dashboard to visualise QoE metrics and consumption reports from a 5GMS client during a DASH streaming session. It polls live directories of XML and JSON report files and renders all available metrics in real time, with support for multiple provisioning sessions and multiple clients simultaneously.

## Project Structure

* `assets/` — Static files used by the UI
  * `images/` — Logo and image assets
  * `fonts/` — Poppins font files (Bold, SemiBold, ExtraLight)
* `index.html` — Main page
* `App.js` — Frontend logic: controls panel, XML/JSON parsing, chart rendering, live polling
* `server.js` — Express backend: serves the UI and exposes the `/api` endpoints
* `styles.css` — Stylesheet

## Metrics visualised

### QoE Metrics tab

* **Buffer Level** — line chart, Y: buffer level in ms, X: timestamp
* **Representation Switches** — stepped line chart, Y: bandwidth in bit/s, X: timestamp
* **Average Throughput** — line chart, Y: throughput in kbit/s, X: timestamp
* **Playout Delays** — bar chart showing Initial Playout Delay and Playout Delay for Media Startup per report
* **Play List** — bar chart showing segment durations per representation ID
* **MPD Information** — table
* **Reception Report** — table
* **QoE Report** — table
* **Device Information** — table (screen/video resolution, pixel dimensions, field of view)

### Consumption Reports tab

* **Consumption Summary** — aggregated table showing report count, total duration, first seen timestamp and endpoint addresses per media type and client
* **Client Locations** — Leaflet map showing GPS locations from `TypedLocation` entries when present in the report

## Installation

Install the dependencies:

```bash
npm install
```

## Running

1. Start the application server:

```bash
npm start
```

2. Navigate to `http://localhost:3000/` in your browser.

## Usage

1. Enter the path to your AF reports base directory in the **AF Reports Base Path** field and click **Apply**. This is the folder that contains one subfolder per provisioning session ID, e.g. `/home/fivegmag/5GMS/rt-5gms-examples/5gms-docker-setup/recipe1/af-reports`.
2. Tick one or more **Provisioning Sessions** and click **Load selected sessions**. Client IDs are discovered automatically from the report filenames.
3. Tick one or more **Client IDs** to load.
4. Click **Load / Refresh Selected Clients**. The dashboard loads all existing report files and polls for new ones every 5 seconds automatically.

Multiple sessions and clients can be loaded simultaneously — each combination is assigned a distinct colour and all charts show their datasets overlaid for comparison.

## Report file formats

* **QoE metrics** — XML files in `<sessionId>/metrics_reports/`, named `<clientId>_<recordingSessionId>_<timestamp>.xml`, conforming to 3GPP TS 26.247
* **Consumption reports** — JSON files in `<sessionId>/consumption_reports/`, named `<clientId>_<timestamp>.json`, conforming to 3GPP TS 26.512 section 11.3

## API Endpoints

The Express server exposes the following endpoints:

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/config` | Get the current AF reports base path |
| `POST` | `/api/config` | Update the AF reports base path at runtime |
| `GET` | `/api/sessions` | List all provisioning session IDs (subfolders) |
| `GET` | `/api/sessions/:sessionId/clients` | List unique client IDs found in a session |
| `GET` | `/api/sessions/:sessionId/reports` | List XML report filenames, optionally filtered by `?clientId=` |
| `GET` | `/api/sessions/:sessionId/reports/:filename` | Serve the raw XML of one report file |
| `GET` | `/api/sessions/:sessionId/consumption` | List JSON consumption report filenames, optionally filtered by `?clientId=` |
| `GET` | `/api/sessions/:sessionId/consumption/file` | Serve a consumption report JSON file via `?name=<filename>` |

## License

5G-MAG Public License (v1.0)
