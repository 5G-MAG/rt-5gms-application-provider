# QoE Metrics Reporting UI

## Introduction

This project provides a web-based dashboard to visualise QoE metrics reported by a 5GMS client during a DASH streaming session. It polls a live directory of XML report files and renders all available metrics in real time, with support for multiple provisioning sessions and multiple clients simultaneously.

## Project Structure

* `assets/` — Static files used by the UI
  * `images/` — Logo and image assets
  * `fonts/` — Poppins font files (Bold, SemiBold, ExtraLight)
* `index.html` — Main page
* `App.js` — Frontend logic: controls panel, XML parsing, chart rendering, live polling
* `server.js` — Express backend: serves the UI and exposes the `/api` endpoints
* `styles.css` — Stylesheet

## Metrics visualised

* **Buffer Level** — line chart, Y: buffer level in ms, X: timestamp
* **Representation Switches** — stepped line chart, Y: bandwidth in bit/s, X: timestamp
* **Average Throughput** — line chart, Y: throughput in kbit/s, X: timestamp
* **Playout Delays** — bar chart showing Initial Playout Delay and Playout Delay for Media Startup per report
* **Play List** — bar chart showing segment durations per representation ID
* **HTTP List** — scatter chart, Y: transferred bytes, X: request duration in ms (shown when present in the report)
* **MPD Information** — table
* **Reception Report** — table
* **QoE Report** — table
* **Device Information** — table (screen/video resolution, pixel dimensions, field of view)

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
2. Select a **Provisioning Session** from the dropdown.
3. Tick one or more **Client IDs** to load.
4. Click **Load / Refresh Selected Clients**. The dashboard will load all existing report files and then poll for new ones every 5 seconds automatically.

Multiple clients can be loaded simultaneously — each client is assigned a distinct colour and all charts show their datasets overlaid for comparison.

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

## License

5G-MAG Public License (v1.0)
