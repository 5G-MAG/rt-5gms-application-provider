/*
License: 5G-MAG Public License (v1.0)
Authors: Vuk Stojkovic, Erik Gaida (Fraunhofer FOKUS), Jordi Joan Gimenez (5G-MAG)
Copyright: (C) Fraunhofer FOKUS, 5G-MAG Association
For full license terms please see the LICENSE file distributed with this
program. If this file is missing then the license can be retrieved from
https://hub.5g-mag.com/Getting-Started/OFFICIAL_5G-MAG_Public_License_v1.0.pdf

Metrics rendered:
  - BufferLevel            → line chart
  - RepSwitchList          → line chart (stepped)
  - AvgThroughput          → line chart (kbit/s over time)
  - InitialPlayoutDelay    → bar chart (per report, per client)
  - PlayoutDelayforMediaStartup → bar chart (same axes as above)
  - PlayList               → bar chart (segment durations per representationId)
  - HttpList               → scatter chart (if present)
  - MPDInformation         → table
  - ReceptionReport        → table
  - QoeReport              → table
*/

class App {

    constructor() {
        this.POLL_INTERVAL_MS = 5000;

        // { sessionId: { clientId: Set<filename> } }
        this._loadedFiles = {};

        this._bufferLevelChart = null;
        this._representationSwitchChart = null;
        this._avgThroughputChart = null;
        this._playoutDelayChart = null;
        this._playlistChart = null;

        // Consumption report charts
        this._consumptionTotalChart = null;
        this._consumptionMap = null;

        // Track loaded consumption files separately
        this._loadedConsumptionFiles = {};

        // Set of active sessionIds
        this._activeSessions = new Set();
        // { sessionId: Set<clientId> }
        this._activeClients = {};

        this._pollTimer = null;
        this._autoRefreshEnabled = true;

        this._palette = [
            '#4e79a7', '#f28e2b', '#e15759', '#76b7b2',
            '#59a14f', '#edc948', '#b07aa1', '#ff9da7',
            '#9c755f', '#bab0ac'
        ];
        // colour keyed by "sessionId::clientId"
        this._colourIndex = {};
        this._nextColourIdx = 0;

    }

    // ── Startup ───────────────────────────────────────────────────────────────

    async init() {
        // Make legend labels use bold for metric name (which is now first in label)
        Chart.defaults.plugins.legend.labels.font = {
            size: 12,
            weight: 'bold'
        };
        this._injectControls();
        this._bindControls();
        await this._loadConfig();
    }

    // ── Controls injection ────────────────────────────────────────────────────

    _injectControls() {
        const root = document.getElementById('metrics-controls-root');
        if (!root) { console.error('App.js: #metrics-controls-root not found.'); return; }
        root.innerHTML = `
            <div class="qoe-card" style="margin-bottom:14px;">
                <div class="qoe-card-title">Configuration</div>
                <div style="margin-bottom:12px;">
                    <div class="ctrl-label">AF reports base path</div>
                    <div style="display:flex;gap:8px;">
                        <input id="base-path-input" type="text" class="ctrl-input" style="flex:1;"
                               placeholder="~/rt-5gms-examples/5gms-docker-setup/recipe1_with_5GC/af-reports" />
                        <button id="base-path-apply" class="ctrl-btn">Apply</button>
                    </div>
                    <div id="base-path-status" style="font-size:11px;margin-top:4px;min-height:1.2em;"></div>
                </div>
                <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px;">
                    <div>
                        <div class="ctrl-label">Provisioning sessions</div>
                        <div id="session-checkboxes" style="font-size:12px;color:#666;">
                            Apply a base path first.
                        </div>
                        <div style="margin-top:8px;">
                            <button id="load-sessions-btn" class="ctrl-btn" style="width:100%;">
                                Load selected sessions
                            </button>
                        </div>
                    </div>
                    <div>
                        <div class="ctrl-label">Client IDs</div>
                        <div id="client-checkboxes" style="font-size:12px;color:#666;">
                            Select sessions first.
                        </div>
                        <div style="margin-top:8px;">
                            <button id="load-clients-btn" class="ctrl-btn" style="width:100%;">
                                Load / refresh selected clients
                            </button>
                        </div>
                    </div>
                </div>
            </div>`;
    }

    _bindControls() {
        document.getElementById('base-path-apply').addEventListener('click', () => this._applyBasePath());
        document.getElementById('load-sessions-btn').addEventListener('click', () => this._onLoadSessions());
        document.getElementById('load-clients-btn').addEventListener('click', () => this._onLoadClients());
    }

    _setStatus(msg, isError) {
        const el = document.getElementById('base-path-status');
        if (!el) return;
        el.textContent = msg;
        el.style.color = isError ? '#c0392b' : '#27ae60';
        el.style.fontWeight = '500';
    }

    // ── Configuration ─────────────────────────────────────────────────────────

    async _loadConfig() {
        try {
            const res = await fetch('/qoe/config');
            const { basePath } = await res.json();
            document.getElementById('base-path-input').value = basePath;
            if (basePath) {
                this._setStatus('Path loaded. Click Apply to scan for sessions.', false);
            } else {
                this._setStatus('Enter the path to the af-reports directory and click Apply.', false);
            }
        } catch (err) {
            console.error('Could not load config:', err);
        }
    }

    async _applyBasePath() {
        const basePath = document.getElementById('base-path-input').value.trim();
        if (!basePath) { this._setStatus('Please enter a path.', true); return; }
        this._setStatus('Scanning...', false);
        try {
            const res = await fetch('/qoe/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ basePath })
            });
            if (!res.ok) {
                const err = await res.json();
                this._setStatus('Error: ' + (err.error || res.status), true);
                return;
            }
            this._resetAll();
            await this._refreshSessions();
        } catch (err) {
            this._setStatus('Could not reach server: ' + err.message, true);
        }
    }

    // ── Sessions ──────────────────────────────────────────────────────────────

    async _refreshSessions() {
        try {
            const res = await fetch('/qoe/sessions');
            if (!res.ok) {
                const err = await res.json();
                this._setStatus('Could not read path: ' + (err.detail || err.error), true);
                return;
            }
            const sessions = await res.json();
            if (sessions.length === 0) {
                this._setStatus('Path is valid but no session folders were found.', true);
                return;
            }
            this._renderSessionCheckboxes(sessions);
            this._setStatus(`Found ${sessions.length} session(s).`, false);
        } catch (err) {
            this._setStatus('Failed to fetch sessions: ' + err.message, true);
        }
    }

    _renderSessionCheckboxes(sessions) {
        const container = document.getElementById('session-checkboxes');
        container.innerHTML = '';
        sessions.forEach(sessionId => {
            const colour = this._colourForKey(sessionId);
            const label = document.createElement('label');
            label.style.cssText = 'display:flex;align-items:center;gap:6px;margin:4px 0;cursor:pointer;font-family:monospace;font-size:0.8em;';
            const swatch = document.createElement('span');
            swatch.style.cssText = `display:inline-block;width:10px;height:10px;border-radius:2px;background:${colour};flex-shrink:0;`;
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.value = sessionId;
            label.appendChild(cb);
            label.appendChild(swatch);
            label.appendChild(document.createTextNode(sessionId));
            container.appendChild(label);
        });
    }

    // ── Load sessions → fetch clients for each ────────────────────────────────

    async _onLoadSessions() {
        const checked = [...document.querySelectorAll('#session-checkboxes input[type=checkbox]:checked')]
            .map(cb => cb.value);
        if (checked.length === 0) return;

        // Remove sessions that were deselected
        const toRemove = [...this._activeSessions].filter(s => !checked.includes(s));
        toRemove.forEach(s => this._removeSessionData(s));
        this._activeSessions = new Set(checked);

        // Update session label in topbar
        const label = document.getElementById('session-label');
        if (label) label.textContent = checked.length === 1 ? checked[0] : `${checked.length} sessions`;

        // Fetch client IDs for all selected sessions and render combined list
        const clientContainer = document.getElementById('client-checkboxes');
        clientContainer.textContent = 'Loading clients...';
        clientContainer.innerHTML = '';

        for (const sessionId of checked) {
            try {
                const res = await fetch(`/qoe/sessions/${encodeURIComponent(sessionId)}/clients`);
                if (!res.ok) continue;
                const clients = await res.json();
                this._renderClientCheckboxesForSession(sessionId, clients, clientContainer);
            } catch (err) {
                console.error(`Could not load clients for ${sessionId}:`, err);
            }
        }

        if (!clientContainer.children.length) {
            clientContainer.textContent = 'No clients found in selected sessions.';
        }
    }

    _renderClientCheckboxesForSession(sessionId, clients, container) {
        if (clients.length === 0) return;

        // Session header
        const header = document.createElement('div');
        header.style.cssText = 'font-size:10px;font-weight:600;color:#888;margin:8px 0 2px;font-family:monospace;letter-spacing:0.03em;';
        header.textContent = sessionId;
        container.appendChild(header);

        clients.forEach(clientId => {
            const key = `${sessionId}::${clientId}`;
            const colour = this._colourForKey(key);
            const label = document.createElement('label');
            label.style.cssText = 'display:flex;align-items:center;gap:6px;margin:3px 0;cursor:pointer;font-family:monospace;font-size:0.82em;';
            const swatch = document.createElement('span');
            swatch.style.cssText = `display:inline-block;width:10px;height:10px;border-radius:50%;background:${colour};flex-shrink:0;`;
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.dataset.sessionId = sessionId;
            cb.dataset.clientId = clientId;
            label.appendChild(cb);
            label.appendChild(swatch);
            label.appendChild(document.createTextNode(clientId));
            container.appendChild(label);
        });
    }

    // ── Load clients ──────────────────────────────────────────────────────────

    _onLoadClients() {
        const checked = [...document.querySelectorAll('#client-checkboxes input[type=checkbox]:checked')];
        if (checked.length === 0) return;

        // Build new active set { sessionId -> Set<clientId> }
        const newActive = {};
        checked.forEach(cb => {
            const s = cb.dataset.sessionId;
            const c = cb.dataset.clientId;
            if (!newActive[s]) newActive[s] = new Set();
            newActive[s].add(c);
        });

        // Remove clients that were deselected
        Object.keys(this._activeClients).forEach(s => {
            this._activeClients[s].forEach(c => {
                if (!newActive[s] || !newActive[s].has(c)) {
                    this._removeClientData(s, c);
                }
            });
        });

        // Detect if selection changed BEFORE updating _activeClients
        const prevKeys = JSON.stringify(Object.fromEntries(
            Object.entries(this._activeClients).map(([s, cs]) => [s, [...cs].sort()])
        ));
        const newKeys = JSON.stringify(Object.fromEntries(
            Object.entries(newActive).map(([s, cs]) => [s, [...cs].sort()])
        ));
        const selectionChanged = prevKeys !== newKeys;

        this._activeClients = newActive;

        // Ensure QoE loaded-file tracking exists
        Object.keys(newActive).forEach(s => {
            if (!this._loadedFiles[s]) this._loadedFiles[s] = {};
            newActive[s].forEach(c => {
                if (!this._loadedFiles[s][c]) this._loadedFiles[s][c] = new Set();
            });
        });

        // If selection changed: clear consumption UI and reset consumption tracking
        // If same selection: do nothing — poll will only pick up new files
        if (selectionChanged) {
            this._clearConsumptionUI();
            this._loadedConsumptionFiles = {};
            Object.keys(newActive).forEach(s => {
                this._loadedConsumptionFiles[s] = {};
                newActive[s].forEach(c => {
                    this._loadedConsumptionFiles[s][c] = new Set();
                });
            });
        } else {
            // Same selection — just ensure tracking exists without clearing
            Object.keys(newActive).forEach(s => {
                if (!this._loadedConsumptionFiles[s]) this._loadedConsumptionFiles[s] = {};
                newActive[s].forEach(c => {
                    if (!this._loadedConsumptionFiles[s][c]) this._loadedConsumptionFiles[s][c] = new Set();
                });
            });
        }

        // Update stat card
        const totalClients = Object.values(newActive).reduce((sum, set) => sum + set.size, 0);
        const clientsEl = document.getElementById('stat-clients');
        if (clientsEl) clientsEl.textContent = totalClients;

        this._stopPolling();
        this._poll(); // one-shot load; interval starts once reportPeriod is read from a report
    }

    // ── Polling ───────────────────────────────────────────────────────────────

    manualRefresh() {
        this._poll();
    }

    toggleAutoRefresh() {
        this._autoRefreshEnabled = !this._autoRefreshEnabled;
        const btn = document.getElementById('auto-refresh-btn');
        const badgeText = document.getElementById('live-badge-text');
        const dot = document.querySelector('.live-dot');
        if (this._autoRefreshEnabled) {
            if (Object.keys(this._activeClients).length > 0 && this._pollTimer === null) {
                this._pollTimer = setInterval(() => this._poll(), this.POLL_INTERVAL_MS);
            }
            if (btn) btn.classList.add('active');
            if (dot) dot.classList.remove('paused');
            const secs = this.POLL_INTERVAL_MS / 1000;
            if (badgeText) badgeText.textContent = `Live · polling every ${secs} s`;
        } else {
            this._stopPolling();
            if (btn) btn.classList.remove('active');
            if (dot) dot.classList.add('paused');
            if (badgeText) badgeText.textContent = 'Auto-refresh off';
        }
    }

    _clearConsumptionUI() {
        // Clear summary table
        const tbody = document.querySelector('#consumption-summary-table tbody');
        if (tbody) tbody.innerHTML = '';
        this._consumptionCounts = {};

        // Destroy and null consumption charts so they rebuild fresh
        if (this._consumptionTimelineChart) {
            this._consumptionTimelineChart.destroy();
            }
        if (this._consumptionTotalChart) {
            this._consumptionTotalChart.destroy();
            this._consumptionTotalChart = null;
        }
        if (this._consumptionMap) {
            this._consumptionMap.remove();
            this._consumptionMap = null;
            const mapDiv = document.getElementById('consumption-map');
            if (mapDiv) mapDiv.innerHTML = '<div id="consumption-map-placeholder" style="height:100%;display:flex;align-items:center;justify-content:center;color:#aaa;font-size:13px;font-family:Poppins,sans-serif;">No location data available yet.</div>';
        }
    }

    async _pollConsumption(sessionId, clientId) {
        try {
            const url = `/qoe/sessions/${encodeURIComponent(sessionId)}/consumption?clientId=${encodeURIComponent(clientId)}&_=${Date.now()}`;
            const resp = await fetch(url);
            if (!resp.ok) return;
            const filenames = await resp.json();
            if (!this._loadedConsumptionFiles[sessionId]) this._loadedConsumptionFiles[sessionId] = {};
            if (!this._loadedConsumptionFiles[sessionId][clientId]) {
                this._loadedConsumptionFiles[sessionId][clientId] = new Set();
            }
            const loaded = this._loadedConsumptionFiles[sessionId][clientId];
            const newFiles = filenames.filter(f => !loaded.has(f));
            for (const filename of newFiles) {
                try {
                    await this._loadAndProcessConsumption(filename, sessionId, clientId);
                    loaded.add(filename);
                } catch (err) {
                    console.error(`Failed to process consumption ${filename}:`, err);
                }
            }
        } catch (err) {
            console.error(`Consumption poll error for ${sessionId}/${clientId}:`, err);
        }
    }

    _stopPolling() {
        if (this._pollTimer !== null) { clearInterval(this._pollTimer); this._pollTimer = null; }
    }

    _updatePollInterval(seconds) {
        const ms = seconds * 1000;
        if (ms === this.POLL_INTERVAL_MS && this._pollTimer !== null) return;
        this.POLL_INTERVAL_MS = ms;
        if (this._autoRefreshEnabled) {
            if (this._pollTimer !== null) clearInterval(this._pollTimer);
            this._pollTimer = setInterval(() => this._poll(), this.POLL_INTERVAL_MS);
        }
        const badge = document.getElementById('live-badge');
        const badgeText = document.getElementById('live-badge-text');
        if (badge) badge.style.display = 'inline-flex';
        if (badgeText) {
            badgeText.textContent = this._autoRefreshEnabled
                ? `Live · polling every ${seconds} s`
                : 'Auto-refresh off';
        }
    }

    async _poll() {
        for (const sessionId of Object.keys(this._activeClients)) {
                for (const clientId of this._activeClients[sessionId]) {
                        // QoE metrics
                try {
                    const url = `/qoe/sessions/${encodeURIComponent(sessionId)}/reports?clientId=${encodeURIComponent(clientId)}&_=${Date.now()}`;
                    const filenames = await (await fetch(url)).json();
                    const loaded = this._loadedFiles[sessionId][clientId];
                    const newFiles = filenames.filter(f => !loaded.has(f));
                    for (const filename of newFiles) {
                        try {
                            await this._loadAndProcessFile(filename, sessionId, clientId);
                            loaded.add(filename);
                        } catch (err) {
                            console.error(`Failed to process ${filename}:`, err);
                        }
                    }
                } catch (err) {
                    console.error(`Poll error for ${sessionId}/${clientId}:`, err);
                }

                // Consumption reports
                await this._pollConsumption(sessionId, clientId);
            }
        }
    }

    // ── Per-file processing ───────────────────────────────────────────────────

    async _loadAndProcessFile(filename, sessionId, clientId) {
        const url = `/qoe/sessions/${encodeURIComponent(sessionId)}/reports/${encodeURIComponent(filename)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status} for ${filename}`);
        const xml = await res.text();
        const json = JSON.parse(xml2json(xml));

        const receptionReport = json.elements[0];
        const qoeReport = receptionReport.elements.find(e => e.name === 'QoeReport');
        if (!qoeReport) { console.warn('No QoeReport found in', filename); return; }

        const reportPeriod = parseInt(qoeReport.attributes.reportPeriod, 10);
        if (!isNaN(reportPeriod) && reportPeriod > 0) this._updatePollInterval(reportPeriod);

        this._populateTablesOnce(receptionReport, qoeReport);
        this._appendBufferLevelData(qoeReport, sessionId, clientId);
        this._appendRepresentationSwitchData(qoeReport, sessionId, clientId);
        this._appendAvgThroughputData(qoeReport, sessionId, clientId);
        this._appendPlayoutDelayData(qoeReport, sessionId, clientId);
        this._appendPlaylistData(qoeReport, sessionId, clientId);
        this._updateStatCards(qoeReport);
    }

    // ── Consumption Reports ───────────────────────────────────────────────────

    async _loadAndProcessConsumption(filename, sessionId, clientId) {
        const url = `/qoe/sessions/${encodeURIComponent(sessionId)}/consumption/file?name=${encodeURIComponent(filename)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status} for ${filename}`);
        const data = await res.json();
        const units = data.consumptionReportingUnits || [];
        units.forEach(unit => {
            this._appendConsumptionTableRow(unit, sessionId, clientId);
            this._accumulateConsumptionCount(unit, sessionId, clientId);
            this._appendConsumptionLocations(unit, sessionId, clientId);
        });
        // Rebuild chart once after all units in this file are processed
        this._rebuildConsumptionTotalChart();
    }

    _appendConsumptionTableRow(unit, sessionId, clientId) {
        const tbody = document.querySelector('#consumption-summary-table tbody');
        if (!tbody) return;

        // Aggregate by sessionId + clientId + mediaConsumed — one row per combination
        const rowId = `csr-${sessionId}-${clientId}-${unit.mediaConsumed}`.replace(/[^a-z0-9\-]/gi, '_');
        let row = document.getElementById(rowId);

        const clientIp = unit.clientEndpointAddress ? unit.clientEndpointAddress.ipv4Addr || '—' : '—';
        const serverIp = unit.serverEndpointAddress ? unit.serverEndpointAddress.ipv4Addr || '—' : '—';

        if (!row) {
            row = tbody.insertRow();
            row.id = rowId;
            // client, media, count, total duration, first seen, client IP, server IP
            [clientId, unit.mediaConsumed || '—', '1',
             unit.duration != null ? unit.duration : 0,
             unit.startTime || '—', clientIp, serverIp
            ].forEach(val => {
                const cell = row.insertCell();
                cell.innerHTML = val;
            });
        } else {
            // Update count and total duration
            row.cells[2].innerHTML = parseInt(row.cells[2].innerHTML) + 1;
            row.cells[3].innerHTML = parseFloat(row.cells[3].innerHTML) + (unit.duration || 0);
        }
    }

    _appendConsumptionLocations(unit, sessionId, clientId) {
        const locations = unit.locations || [];
        if (locations.length === 0) return;

        // Initialise Leaflet map on first real location data
        if (!this._consumptionMap) {
            const placeholder = document.getElementById('consumption-map-placeholder');
            if (placeholder) placeholder.remove();

            this._consumptionMap = L.map('consumption-map').setView([0, 0], 2);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                maxZoom: 19
            }).addTo(this._consumptionMap);
        }

        const colour = this._colourForKey(`${sessionId}::${clientId}`);
        const markerIcon = L.divIcon({
            className: '',
            html: `<div style="width:12px;height:12px;border-radius:50%;background:${colour};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>`,
            iconSize: [12, 12],
            iconAnchor: [6, 6]
        });

        locations.forEach(loc => {
            const coords = this._extractGpsCoords(loc);
            if (!coords) return;

            const marker = L.marker([coords.lat, coords.lon], { icon: markerIcon });
            const popupLines = [
                `<strong>Client:</strong> ${clientId.substring(0, 18)}…`,
                `<strong>Session:</strong> ${sessionId.substring(0, 18)}…`,
                `<strong>Media:</strong> ${unit.mediaConsumed || '—'}`,
                `<strong>Start:</strong> ${unit.startTime || '—'}`,
                `<strong>Duration:</strong> ${unit.duration != null ? unit.duration + ' s' : '—'}`,
                `<strong>Type:</strong> ${loc.locationType || 'GPS'}`
            ];
            if (loc.civicAddress) {
                popupLines.push(`<strong>Address:</strong> ${JSON.stringify(loc.civicAddress)}`);
            }
            marker.bindPopup(popupLines.join('<br>'));
            marker.addTo(this._consumptionMap);
        });
    }

    /**
     * Extract {lat, lon} from a TypedLocation entry.
     * Handles the common cases defined in TS 29.571.
     */
    _extractGpsCoords(loc) {
        if (!loc) return null;

        // Direct lat/lon (non-standard but common in implementations)
        if (loc.lat != null && loc.lon != null) return { lat: loc.lat, lon: loc.lon };
        if (loc.latitude != null && loc.longitude != null) return { lat: loc.latitude, lon: loc.longitude };

        // geoArea.point (TS 29.572 GeographicArea)
        if (loc.geoArea && loc.geoArea.point) {
            const p = loc.geoArea.point;
            if (p.lat != null && p.lon != null) return { lat: p.lat, lon: p.lon };
        }

        // point directly on loc
        if (loc.point) {
            const p = loc.point;
            if (p.lat != null && p.lon != null) return { lat: p.lat, lon: p.lon };
        }

        if (loc.locationType === 'POINT' && loc.lat != null) {
            return { lat: loc.lat, lon: loc.lon };
        }

        return null;
    }

    _accumulateConsumptionCount(unit, sessionId, clientId) {
        if (!unit.mediaConsumed) return;
        if (!this._consumptionCounts) this._consumptionCounts = {};
        const key = `${sessionId}::${clientId}`;
        if (!this._consumptionCounts[key]) this._consumptionCounts[key] = {};
        this._consumptionCounts[key][unit.mediaConsumed] =
            (this._consumptionCounts[key][unit.mediaConsumed] || 0) + 1;
    }

    _rebuildConsumptionTotalChart() {
        if (!this._consumptionCounts) return;

        // Collect all media types across all clients
        const allMedia = [...new Set(
            Object.values(this._consumptionCounts).flatMap(c => Object.keys(c))
        )].sort();

        if (!this._consumptionTotalChart) {
            this._consumptionTotalChart = new Chart(
                document.getElementById('consumption-total-chart'), {
                type: 'bar',
                data: { labels: allMedia, datasets: [] },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: false,
                    plugins: { legend: { position: 'top' } },
                    datasets: { bar: { barPercentage: 0.5, categoryPercentage: 0.6 } },
                    scales: {
                        y: { title: { display: true, text: 'Number of reports' }, beginAtZero: true },
                        x: { title: { display: true, text: 'Media type' } }
                    }
                }
            });
        }

        const chart = this._consumptionTotalChart;
        chart.data.labels = allMedia;

        // Rebuild datasets from scratch each time
        Object.entries(this._consumptionCounts).forEach(([key, counts]) => {
            const [sessionId, clientId] = key.split('::');
            const dsLabel = `${this._shortId(sessionId)}/${this._shortId(clientId)}`;
            let ds = chart.data.datasets.find(d => d._key === key);
            if (!ds) {
                const colour = this._colourForKey(key);
                ds = {
                    label: dsLabel,
                    _key: key,
                    _sessionId: sessionId,
                    _clientId: clientId,
                    _metricLabel: dsLabel,
                    backgroundColor: colour + 'cc',
                    borderColor: colour,
                    data: []
                };
                chart.data.datasets.push(ds);
            }
            // Set data directly — never increment
            ds.data = allMedia.map(m => counts[m] || 0);
        });

        chart.update();
    }

    // ── Tables ────────────────────────────────────────────────────────────────

    _populateTablesOnce(receptionReport, qoeReport) {
        const receptionTbody = document.querySelector('#reception-report-table tbody');
        if (receptionTbody && receptionTbody.rows.length === 0) {
            ['clientID', 'contentURI'].forEach(key => {
                this._addTableRow([key, receptionReport.attributes[key]], 'reception-report-table');
            });
        }
        const qoeTbody = document.querySelector('#qoe-report-table tbody');
        if (qoeTbody && qoeTbody.rows.length === 0) {
            ['recordingSessionId', 'reportPeriod', 'reportTime'].forEach(key => {
                this._addTableRow([key, qoeReport.attributes[key]], 'qoe-report-table');
            });
        }
        const mpdTbody = document.querySelector('#mpd-information-table tbody');
        if (mpdTbody && mpdTbody.rows.length === 0) {
            const mpdMetric = qoeReport.elements.find(e =>
                e.name === 'QoeMetric' && e.elements && e.elements[0] &&
                e.elements[0].name === 'MPDInformation'
            );
            if (mpdMetric) {
                mpdMetric.elements.forEach(el => {
                    const repId = el.attributes.representationId;
                    (el.elements || []).forEach(inner => {
                        if (inner.name === 'Mpdinfo') {
                            this._addTableRow(
                                [repId, inner.attributes.bandwidth, inner.attributes.codecs, inner.attributes.mimeType],
                                'mpd-information-table'
                            );
                        }
                    });
                });
            }
        }
        const deviceTbody = document.querySelector('#device-information-table tbody');
        if (deviceTbody && deviceTbody.rows.length === 0) {
            const suppMetric = (qoeReport.elements || []).find(e =>
                this._localName(e.name) === 'supplementQoEMetric'
            );
            if (suppMetric) {
                const deviceInfo = (suppMetric.elements || []).find(e =>
                    this._localName(e.name) === 'deviceinformation'
                );
                if (deviceInfo) {
                    const entry = (deviceInfo.elements || []).find(e =>
                        this._localName(e.name) === 'Entry'
                    );
                    if (entry && entry.attributes) {
                        const attrs = entry.attributes;
                        [
                            ['Screen resolution', `${attrs.screenWidth} × ${attrs.screenHeight} px`],
                            ['Video resolution', `${attrs.videoWidth} × ${attrs.videoHeight} px`],
                            ['Pixel width', attrs.pixelWidth],
                            ['Pixel height', attrs.pixelHeight],
                            ['Field of view', attrs.fieldOfView],
                            ['Start', attrs.start],
                        ].forEach(row => this._addTableRow(row, 'device-information-table'));
                    }
                }
            }
        }
    }

    _updateStatCards(qoeReport) {
        const reportsEl = document.getElementById('stat-reports');
        if (reportsEl) {
            let total = 0;
            Object.keys(this._loadedFiles).forEach(s => {
                Object.keys(this._loadedFiles[s]).forEach(c => {
                    total += this._loadedFiles[s][c].size;
                });
            });
            reportsEl.textContent = total;
        }
        const tpEl = document.getElementById('stat-throughput');
        if (tpEl) {
            const metric = qoeReport.elements.find(e =>
                e.name === 'QoeMetric' && e.elements && e.elements[0] &&
                e.elements[0].name === 'AvgThroughput'
            );
            if (metric) {
                const el = metric.elements[0];
                const numBytes = parseInt(el.attributes.numBytes || 0);
                const duration = parseInt(el.attributes.duration || 1);
                const kbps = ((numBytes * 8) / duration / 1000).toFixed(1);
                tpEl.textContent = kbps + ' kbit/s';
            }
        }
        const bufEl = document.getElementById('stat-buffer');
        if (bufEl && this._bufferLevelChart) {
            const allVals = this._bufferLevelChart.data.datasets
                .flatMap(ds => ds.data.map(d => d.y))
                .filter(v => v != null && !isNaN(v));
            if (allVals.length > 0) {
                const avg = Math.round(allVals.reduce((a, b) => a + b, 0) / allVals.length);
                bufEl.textContent = avg.toLocaleString() + ' ms';
            }
        }
    }

    _addTableRow(data, tableId) {
        const tbody = document.querySelector(`#${tableId} tbody`);
        if (!tbody) return;
        const newRow = tbody.insertRow();
        data.forEach(value => {
            const cell = newRow.insertCell();
            cell.innerHTML = value != null ? value : '';
        });
    }

    // ── Buffer Level ──────────────────────────────────────────────────────────

    _appendBufferLevelData(qoeReport, sessionId, clientId) {
        const metric = qoeReport.elements.find(e =>
            e.name === 'QoeMetric' && e.elements && e.elements[0] &&
            e.elements[0].name === 'BufferLevel'
        );
        if (!metric) return;
        const rawData = metric.elements[0].elements;
        if (!rawData || rawData.length === 0) return;

        if (!this._bufferLevelChart) {
            this._bufferLevelChart = new Chart(document.getElementById('buffer-level-chart'), {
                type: 'line',
                data: { datasets: [] },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    spanGaps: false,
                    plugins: { legend: { position: 'top' } },
                    scales: {
                        y: { title: { display: true, text: 'Buffer level in ms' } },
                        x: { type: 'time', time: { tooltipFormat: 'HH:mm:ss', displayFormats: { second: 'HH:mm:ss', minute: 'HH:mm' } }, title: { display: true, text: 'Timestamp' } }
                    }
                }
            });
        }
        const chart = this._bufferLevelChart;
        const ds = this._getOrCreateDataset(chart, sessionId, clientId, 'Buffer Level');
        rawData.forEach(dp => {
            ds.data.push({ x: new Date(dp.attributes.t).getTime(), y: parseFloat(dp.attributes.level) });
        });
        ds.data.sort((a, b) => a.x - b.x);
        chart.update();
    }

    // ── Representation Switch ─────────────────────────────────────────────────

    _appendRepresentationSwitchData(qoeReport, sessionId, clientId) {
        const metric = qoeReport.elements.find(e =>
            e.name === 'QoeMetric' && e.elements && e.elements[0] &&
            e.elements[0].name === 'RepSwitchList'
        );
        if (!metric) return;
        const rawData = metric.elements[0].elements;
        if (!rawData || rawData.length === 0) return;

        if (!this._representationSwitchChart) {
            this._representationSwitchChart = new Chart(document.getElementById('representation-switch-chart'), {
                type: 'line',
                data: { datasets: [] },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    spanGaps: false,
                    plugins: { legend: { position: 'top' } },
                    scales: {
                        y: { title: { display: true, text: 'Bandwidth in bit/s' } },
                        x: { type: 'time', time: { tooltipFormat: 'HH:mm:ss', displayFormats: { second: 'HH:mm:ss', minute: 'HH:mm' } }, title: { display: true, text: 'Timestamp' } }
                    }
                }
            });
        }
        const chart = this._representationSwitchChart;
        rawData.forEach(dp => {
            const mpdInfo = this._getMpdInfoByRepresentationId(qoeReport, dp.attributes.to);
            if (!mpdInfo) return;
            const ds = this._getOrCreateDataset(chart, sessionId, clientId, mpdInfo.attributes.mimeType);
            ds.data.push({ x: new Date(dp.attributes.t).getTime(), y: parseFloat(mpdInfo.attributes.bandwidth) });
        });
        chart.data.datasets.forEach(ds => ds.data.sort((a, b) => a.x - b.x));
        chart.update();
    }

    // ── Average Throughput ────────────────────────────────────────────────────

    _appendAvgThroughputData(qoeReport, sessionId, clientId) {
        const metric = qoeReport.elements.find(e =>
            e.name === 'QoeMetric' && e.elements && e.elements[0] &&
            e.elements[0].name === 'AvgThroughput'
        );
        if (!metric) return;
        const el = metric.elements[0];
        const t = el.attributes.t;
        const numBytes = parseInt(el.attributes.numBytes || 0);
        const duration = parseInt(el.attributes.duration || 1);
        const throughputKbps = parseFloat(((numBytes * 8) / duration / 1000).toFixed(2));

        if (!this._avgThroughputChart) {
            this._avgThroughputChart = new Chart(document.getElementById('avg-throughput-chart'), {
                type: 'line',
                data: { datasets: [] },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    spanGaps: false,
                    plugins: { legend: { position: 'top' } },
                    scales: {
                        y: { title: { display: true, text: 'Throughput in kbit/s' } },
                        x: { type: 'time', time: { tooltipFormat: 'HH:mm:ss', displayFormats: { second: 'HH:mm:ss', minute: 'HH:mm' } }, title: { display: true, text: 'Timestamp' } }
                    }
                }
            });
        }
        const chart = this._avgThroughputChart;
        const ds = this._getOrCreateDataset(chart, sessionId, clientId, 'Avg Throughput');
        ds.data.push({ x: new Date(t).getTime(), y: throughputKbps });
        ds.data.sort((a, b) => a.x - b.x);
        chart.update();
    }

    // ── Playout Delays ────────────────────────────────────────────────────────

    _appendPlayoutDelayData(qoeReport, sessionId, clientId) {
        const ipd = qoeReport.elements.find(e =>
            e.name === 'QoeMetric' && e.elements && e.elements[0] &&
            e.elements[0].name === 'InitialPlayoutDelay'
        );
        const pms = qoeReport.elements.find(e =>
            e.name === 'QoeMetric' && e.elements && e.elements[0] &&
            e.elements[0].name === 'PlayoutDelayforMediaStartup'
        );
        if (!ipd && !pms) return;

        const label = qoeReport.attributes.reportTime;

        if (!this._playoutDelayChart) {
            this._playoutDelayChart = new Chart(document.getElementById('playout-delay-chart'), {
                type: 'bar',
                data: { labels: [], datasets: [] },
                options: {
                    responsive: true,
                    plugins: { legend: { position: 'top' } },
                    datasets: { bar: { barPercentage: 0.5, categoryPercentage: 0.6 } },
                    scales: {
                        y: { title: { display: true, text: 'Delay in ms' } },
                        x: { title: { display: true, text: 'Report time' } }
                    }
                }
            });
        }
        const chart = this._playoutDelayChart;
        if (!chart.data.labels.includes(label)) {
            chart.data.labels.push(label);
            chart.data.labels.sort();
        }
        const idx = chart.data.labels.indexOf(label);
        const playoutMetrics = [
            { metric: ipd, label: 'Initial playout delay' },
            { metric: pms, label: 'Playout delay — media startup' }
        ];
        const alphas = ['dd', '77'];
        playoutMetrics.forEach(({ metric, label }, i) => {
            if (!metric) return;
            const val = parseFloat(this._textContent(metric.elements[0]) || 0);
            const ds = this._getOrCreateDataset(chart, sessionId, clientId, label);
            const colour = this._colourForKey(`${sessionId}::${clientId}`);
            ds.backgroundColor = colour + alphas[i];
            ds.borderColor = colour;
            ds.data[idx] = val;
        });
        chart.update();
    }

    // ── Play List ─────────────────────────────────────────────────────────────

    _appendPlaylistData(qoeReport, sessionId, clientId) {
        const metric = qoeReport.elements.find(e =>
            e.name === 'QoeMetric' && e.elements && e.elements[0] &&
            e.elements[0].name === 'PlayList'
        );
        if (!metric) return;
        const traces = metric.elements[0].elements || [];

        if (!this._playlistChart) {
            this._playlistChart = new Chart(document.getElementById('playlist-chart'), {
                type: 'bar',
                data: { labels: [], datasets: [] },
                options: {
                    responsive: true,
                    plugins: { legend: { position: 'top' } },
                    datasets: { bar: { barPercentage: 0.5, categoryPercentage: 0.6 } },
                    scales: {
                        y: { title: { display: true, text: 'Duration in ms' } },
                        x: { title: { display: true, text: 'Segment start time' } }
                    }
                }
            });
        }
        const chart = this._playlistChart;
        traces.forEach(trace => {
            (trace.elements || []).forEach(entry => {
                if (entry.name !== 'TraceEntry') return;
                const label = entry.attributes.start;
                const repId = entry.attributes.representationId;
                const duration = parseFloat(entry.attributes.duration || 0);
                if (!chart.data.labels.includes(label)) {
                    chart.data.labels.push(label);
                    chart.data.labels.sort();
                }
                const ds = this._getOrCreateDataset(chart, sessionId, clientId, repId);
                const baseColour = this._colourForKey(`${sessionId}::${clientId}`);
                const repIds = [...new Set(
                    chart.data.datasets
                        .filter(d => d._sessionId === sessionId && d._clientId === clientId)
                        .map(d => d._metricLabel)
                )];
                if (!repIds.includes(repId)) repIds.push(repId);
                const alphas = ['dd', '77', 'aa', '44'];
                const alpha = alphas[repIds.indexOf(repId) % alphas.length];
                ds.backgroundColor = baseColour + alpha;
                ds.borderColor = baseColour;
                ds.data[chart.data.labels.indexOf(label)] = duration;
            });
        });
        chart.update();
    }

    // ── Namespace helpers ────────────────────────────────────────────────────

    _localName(name) {
        if (!name) return '';
        const idx = name.indexOf(':');
        return idx === -1 ? name : name.substring(idx + 1);
    }

    // ── Text content helper ───────────────────────────────────────────────────

    _textContent(el) {
        if (!el) return '';
        if (el.text != null) return String(el.text);
        if (el.elements) {
            const textNode = el.elements.find(e => e.type === 'text');
            if (textNode) return String(textNode.text);
        }
        return '';
    }

    // ── MPD Info lookup ───────────────────────────────────────────────────────

    _getMpdInfoByRepresentationId(qoeReport, representationId) {
        const mpdMetric = qoeReport.elements.find(e =>
            e.name === 'QoeMetric' && e.elements && e.elements[0] &&
            e.elements[0].name === 'MPDInformation'
        );
        if (!mpdMetric) return null;
        const target = mpdMetric.elements.find(e =>
            e.name === 'MPDInformation' && e.attributes.representationId === representationId
        );
        if (!target || !target.elements || target.elements.length === 0) return null;
        return target.elements[0];
    }

    // ── Chart helpers ─────────────────────────────────────────────────────────

    _colourForKey(key) {
        if (!(key in this._colourIndex)) {
            this._colourIndex[key] = this._nextColourIdx % this._palette.length;
            this._nextColourIdx++;
        }
        return this._palette[this._colourIndex[key]];
    }

    _shortId(id) { return id.substring(0, 8); }

    _getOrCreateDataset(chart, sessionId, clientId, labelSuffix) {
        const fullLabel = `${labelSuffix}  (${this._shortId(sessionId)}/${this._shortId(clientId)})`;
        let ds = chart.data.datasets.find(d =>
            d._sessionId === sessionId && d._clientId === clientId && d.label === fullLabel
        );
        if (!ds) {
            const colour = this._colourForKey(`${sessionId}::${clientId}`);
            ds = {
                label: fullLabel,
                _sessionId: sessionId,
                _clientId: clientId,
                _metricLabel: labelSuffix,
                borderColor: colour,
                backgroundColor: colour + '88',
                data: []
            };
            chart.data.datasets.push(ds);
        }
        return ds;
    }

    _removeClientData(sessionId, clientId) {
        [this._bufferLevelChart, this._representationSwitchChart, this._avgThroughputChart,
         this._playoutDelayChart, this._playlistChart,
         this._consumptionTotalChart]
            .forEach(chart => {
                if (!chart) return;
                chart.data.datasets = chart.data.datasets.filter(
                    ds => !(ds._sessionId === sessionId && ds._clientId === clientId)
                );
                chart.update();
            });
    }

    _removeSessionData(sessionId) {
        [this._bufferLevelChart, this._representationSwitchChart, this._avgThroughputChart,
         this._playoutDelayChart, this._playlistChart,
         this._consumptionTotalChart]
            .forEach(chart => {
                if (!chart) return;
                chart.data.datasets = chart.data.datasets.filter(ds => ds._sessionId !== sessionId);
                chart.update();
            });
        delete this._loadedFiles[sessionId];
        delete this._loadedConsumptionFiles[sessionId];
        delete this._activeClients[sessionId];
    }

    _resetAll() {
        this._stopPolling();
        this.POLL_INTERVAL_MS = 5000;
        const badge = document.getElementById('live-badge');
        if (badge) badge.style.display = 'none';
        this._loadedFiles = {};
        this._activeSessions = new Set();
        this._activeClients = {};
        this._colourIndex = {};
        this._nextColourIdx = 0;
        [this._bufferLevelChart, this._representationSwitchChart, this._avgThroughputChart,
         this._playoutDelayChart, this._playlistChart,
         this._consumptionTotalChart]
            .forEach(c => { if (c) c.destroy(); });
        this._bufferLevelChart = null;
        this._representationSwitchChart = null;
        this._avgThroughputChart = null;
        this._playoutDelayChart = null;
        this._playlistChart = null;
        this._consumptionTotalChart = null;
        if (this._consumptionMap) {
            this._consumptionMap.remove();
            this._consumptionMap = null;
            const mapDiv = document.getElementById('consumption-map');
            if (mapDiv) {
                mapDiv.innerHTML = '<div id="consumption-map-placeholder" style="height:100%;display:flex;align-items:center;justify-content:center;color:#aaa;font-size:13px;font-family:Poppins,sans-serif;">No location data available yet. Locations will appear here when reports include GPS coordinates.</div>';
            }
        }
        this._loadedConsumptionFiles = {};
        ['reception-report-table', 'qoe-report-table', 'mpd-information-table', 'device-information-table',
         'consumption-summary-table'].forEach(id => {
            const tbody = document.querySelector(`#${id} tbody`);
            if (tbody) tbody.innerHTML = '';
        });
    }
}
