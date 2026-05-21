/**
 * App.js — 5GMS QoE Metrics Viewer
 *
 * Metrics rendered:
 *   - BufferLevel            → line chart
 *   - RepSwitchList          → line chart (stepped)
 *   - AvgThroughput          → line chart (kbit/s over time)
 *   - InitialPlayoutDelay    → bar chart (per report, per client)
 *   - PlayoutDelayforMediaStartup → bar chart (same axes as above)
 *   - PlayList               → bar chart (segment durations per representationId)
 *   - HttpList               → scatter chart (if present)
 *   - MPDInformation         → table
 *   - ReceptionReport        → table
 *   - QoeReport              → table
 */

class App {

    constructor() {
        this.POLL_INTERVAL_MS = 5000;
        this._loadedFiles = {};

        this._bufferLevelChart = null;
        this._representationSwitchChart = null;
        this._avgThroughputChart = null;
        this._playoutDelayChart = null;
        this._playlistChart = null;
        this._httpListChart = null;

        this._activeSession = null;
        this._activeClients = new Set();
        this._pollTimer = null;

        this._palette = [
            '#4e79a7', '#f28e2b', '#e15759', '#76b7b2',
            '#59a14f', '#edc948', '#b07aa1', '#ff9da7',
            '#9c755f', '#bab0ac'
        ];
        this._clientColourIndex = {};
        this._nextColourIdx = 0;

        // Track report index per client for playout delay x-axis
        this._reportCount = {};
    }

    // ── Startup ───────────────────────────────────────────────────────────────

    async init() {
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
                <div class="qoe-card-title" style="display:flex;align-items:center;gap:6px;">
                    Configuration
                </div>
                <div style="margin-bottom:12px;">
                    <div class="ctrl-label">AF reports base path</div>
                    <div style="display:flex;gap:8px;">
                        <input id="base-path-input" type="text" class="ctrl-input"
                               style="flex:1;"
                               placeholder="/home/fivegmag/5GMS/.../af-reports" />
                        <button id="base-path-apply" class="ctrl-btn">Apply</button>
                    </div>
                    <div id="base-path-status" style="font-size:11px;margin-top:4px;min-height:1.2em;"></div>
                </div>
                <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px;">
                    <div>
                        <div class="ctrl-label">Provisioning session</div>
                        <select id="session-select" class="ctrl-input" style="width:100%;">
                            <option value="">— apply a base path first —</option>
                        </select>
                    </div>
                    <div>
                        <div class="ctrl-label">Client IDs</div>
                        <div id="client-checkboxes" style="font-size:12px;color:#666;">
                            Select a session above to see available clients.
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
        document.getElementById('session-select').addEventListener('change', (e) => this._onSessionChange(e.target.value));
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
            const res = await fetch('/api/config');
            const { basePath } = await res.json();
            document.getElementById('base-path-input').value = basePath;
            this._setStatus('Current server path loaded. Click Apply to scan for sessions.', false);
        } catch (err) {
            console.error('Could not load config:', err);
        }
    }

    async _applyBasePath() {
        const basePath = document.getElementById('base-path-input').value.trim();
        if (!basePath) { this._setStatus('Please enter a path.', true); return; }
        this._setStatus('Scanning...', false);
        try {
            const res = await fetch('/api/config', {
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
            const res = await fetch('/api/sessions');
            if (!res.ok) {
                const err = await res.json();
                this._setStatus('Could not read path: ' + (err.detail || err.error), true);
                return;
            }
            const sessions = await res.json();
            const select = document.getElementById('session-select');
            select.innerHTML = '<option value="">— select a session —</option>';
            if (sessions.length === 0) {
                this._setStatus('Path is valid but no session folders were found.', true);
                return;
            }
            sessions.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s;
                opt.textContent = s;
                select.appendChild(opt);
            });
            this._setStatus(`Found ${sessions.length} session(s).`, false);
        } catch (err) {
            this._setStatus('Failed to fetch sessions: ' + err.message, true);
        }
    }

    async _onSessionChange(sessionId) {
        this._stopPolling();
        this._activeSession = sessionId || null;
        this._activeClients = new Set();
        const label = document.getElementById('session-label');
        if (label) label.textContent = sessionId || '';
        const container = document.getElementById('client-checkboxes');
        container.innerHTML = '';
        if (!sessionId) return;
        container.textContent = 'Loading clients...';
        try {
            const res = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}/clients`);
            if (!res.ok) {
                const err = await res.json();
                container.textContent = 'Error: ' + (err.detail || err.error);
                return;
            }
            const clients = await res.json();
            this._renderClientCheckboxes(clients);
        } catch (err) {
            container.textContent = 'Failed to load clients: ' + err.message;
        }
    }

    _renderClientCheckboxes(clients) {
        const container = document.getElementById('client-checkboxes');
        container.innerHTML = '';
        if (clients.length === 0) { container.textContent = 'No clients found in this session.'; return; }
        clients.forEach(clientId => {
            const colour = this._colourForClient(clientId);
            const label = document.createElement('label');
            label.style.cssText = 'display:flex;align-items:center;gap:6px;margin:4px 0;cursor:pointer;font-family:monospace;font-size:0.85em;';
            const swatch = document.createElement('span');
            swatch.style.cssText = `display:inline-block;width:12px;height:12px;border-radius:50%;background:${colour};flex-shrink:0;`;
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.value = clientId;
            label.appendChild(cb);
            label.appendChild(swatch);
            label.appendChild(document.createTextNode(clientId));
            container.appendChild(label);
        });
    }

    // ── Load / polling trigger ────────────────────────────────────────────────

    _onLoadClients() {
        const checked = [...document.querySelectorAll('#client-checkboxes input[type=checkbox]:checked')]
            .map(cb => cb.value);
        if (checked.length === 0 || !this._activeSession) return;
        const toRemove = [...this._activeClients].filter(c => !checked.includes(c));
        toRemove.forEach(c => this._removeClientData(c));
        this._activeClients = new Set(checked);
        if (!this._loadedFiles[this._activeSession]) this._loadedFiles[this._activeSession] = {};
        checked.forEach(c => {
            if (!this._loadedFiles[this._activeSession][c]) this._loadedFiles[this._activeSession][c] = new Set();
            if (!this._reportCount[c]) this._reportCount[c] = 0;
        });
        this._stopPolling();
        const clientsEl = document.getElementById('stat-clients');
        if (clientsEl) clientsEl.textContent = checked.length;
        this._poll();
        this._pollTimer = setInterval(() => this._poll(), this.POLL_INTERVAL_MS);
    }

    _stopPolling() {
        if (this._pollTimer !== null) { clearInterval(this._pollTimer); this._pollTimer = null; }
    }

    async _poll() {
        if (!this._activeSession || this._activeClients.size === 0) return;
        for (const clientId of this._activeClients) {
            try {
                const url = `/api/sessions/${encodeURIComponent(this._activeSession)}/reports?clientId=${encodeURIComponent(clientId)}`;
                const filenames = await (await fetch(url)).json();
                const loaded = this._loadedFiles[this._activeSession][clientId];
                const newFiles = filenames.filter(f => !loaded.has(f));
                for (const filename of newFiles) {
                    try {
                        await this._loadAndProcessFile(filename, clientId);
                        loaded.add(filename);
                    } catch (err) {
                        console.error(`Failed to process ${filename}:`, err);
                    }
                }
            } catch (err) {
                console.error(`Poll error for client ${clientId}:`, err);
            }
        }
    }

    // ── Per-file processing ───────────────────────────────────────────────────

    async _loadAndProcessFile(filename, clientId) {
        const url = `/api/sessions/${encodeURIComponent(this._activeSession)}/reports/${encodeURIComponent(filename)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status} for ${filename}`);
        const xml = await res.text();
        const json = JSON.parse(xml2json(xml));

        const receptionReport = json.elements[0];
        const qoeReport = receptionReport.elements.find(e => e.name === 'QoeReport');
        if (!qoeReport) { console.warn('No QoeReport found in', filename); return; }

        this._populateTablesOnce(receptionReport, qoeReport);
        this._appendBufferLevelData(qoeReport, clientId);
        this._appendRepresentationSwitchData(qoeReport, clientId);
        this._appendAvgThroughputData(qoeReport, clientId, filename);
        this._appendPlayoutDelayData(qoeReport, clientId, filename);
        this._appendPlaylistData(qoeReport, clientId, filename);
        this._appendHttpListData(qoeReport, clientId);
        this._updateStatCards(qoeReport);
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
            // sup:supplementQoEMetric is a direct child of ReceptionReport
            const suppMetric = receptionReport.elements.find(e =>
                e.name === 'sup:supplementQoEMetric'
            );
            if (suppMetric) {
                const deviceInfo = suppMetric.elements && suppMetric.elements.find(e =>
                    e.name === 'sup:deviceinformation'
                );
                if (deviceInfo) {
                    const entry = deviceInfo.elements && deviceInfo.elements.find(e =>
                        e.name === 'sup:Entry'
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
        // Reports loaded counter
        const reportsEl = document.getElementById('stat-reports');
        if (reportsEl) {
            let total = 0;
            this._activeClients.forEach(c => {
                if (this._loadedFiles[this._activeSession] && this._loadedFiles[this._activeSession][c]) {
                    total += this._loadedFiles[this._activeSession][c].size;
                }
            });
            reportsEl.textContent = total;
        }

        // Avg throughput
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

        // Avg buffer (last known buffer level — shown in ms to match chart)
        const bufEl = document.getElementById('stat-buffer');
        if (bufEl && this._bufferLevelChart) {
            const datasets = this._bufferLevelChart.data.datasets;
            if (datasets.length > 0) {
                const allVals = datasets.flatMap(ds => ds.data.map(d => d.y)).filter(v => v != null && !isNaN(v));
                if (allVals.length > 0) {
                    const avg = Math.round(allVals.reduce((a, b) => a + b, 0) / allVals.length);
                    bufEl.textContent = avg.toLocaleString() + ' ms';
                }
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

    _appendBufferLevelData(qoeReport, clientId) {
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
        const ds = this._getOrCreateDataset(chart, clientId, 'Buffer Level');
        rawData.forEach(dp => {
            ds.data.push({ x: new Date(dp.attributes.t).getTime(), y: parseFloat(dp.attributes.level) });
        });
        ds.data.sort((a, b) => a.x - b.x);
        chart.update();
    }

    // ── Representation Switch ─────────────────────────────────────────────────

    _appendRepresentationSwitchData(qoeReport, clientId) {
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
            const ds = this._getOrCreateDataset(chart, clientId, mpdInfo.attributes.mimeType);
            ds.data.push({ x: new Date(dp.attributes.t).getTime(), y: parseFloat(mpdInfo.attributes.bandwidth) });
        });
        chart.data.datasets.forEach(ds => ds.data.sort((a, b) => a.x - b.x));
        chart.update();
    }

    // ── Average Throughput ────────────────────────────────────────────────────

    _appendAvgThroughputData(qoeReport, clientId, filename) {
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
        const ds = this._getOrCreateDataset(chart, clientId, 'Avg Throughput');
        ds.data.push({ x: new Date(t).getTime(), y: throughputKbps });
        ds.data.sort((a, b) => a.x - b.x);
        chart.update();
    }

    // ── Playout Delays ────────────────────────────────────────────────────────

    _appendPlayoutDelayData(qoeReport, clientId, filename) {
        const ipd = qoeReport.elements.find(e =>
            e.name === 'QoeMetric' && e.elements && e.elements[0] &&
            e.elements[0].name === 'InitialPlayoutDelay'
        );
        const pms = qoeReport.elements.find(e =>
            e.name === 'QoeMetric' && e.elements && e.elements[0] &&
            e.elements[0].name === 'PlayoutDelayforMediaStartup'
        );
        if (!ipd && !pms) return;

        // Use reportTime as label
        const label = qoeReport.attributes.reportTime || filename;

        if (!this._playoutDelayChart) {
            this._playoutDelayChart = new Chart(document.getElementById('playout-delay-chart'), {
                type: 'bar',
                data: { labels: [], datasets: [] },
                options: {
                    responsive: true,
                    plugins: { legend: { position: 'top' } },
                    scales: {
                        y: { title: { display: true, text: 'Delay in ms' } },
                        x: { title: { display: true, text: 'Report Time' } }
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

        if (ipd) {
            const val = parseFloat(this._textContent(ipd.elements[0]) || 0);
            const ds = this._getOrCreateDataset(chart, clientId, 'Initial playout delay');
            ds.data[idx] = val;
        }
        if (pms) {
            const val = parseFloat(this._textContent(pms.elements[0]) || 0);
            const ds = this._getOrCreateDataset(chart, clientId, 'Playout delay — media startup');
            ds.data[idx] = val;
        }
        chart.update();
    }

    // ── Play List ─────────────────────────────────────────────────────────────

    _appendPlaylistData(qoeReport, clientId, filename) {
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
                    scales: {
                        y: { title: { display: true, text: 'Buffer level in ms' } },
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
                const ds = this._getOrCreateDataset(chart, clientId, repId);
                ds.data[chart.data.labels.indexOf(label)] = duration;
            });
        });
        chart.update();
    }

    // ── HTTP List ─────────────────────────────────────────────────────────────

    _appendHttpListData(qoeReport, clientId) {
        const metric = qoeReport.elements.find(e =>
            e.name === 'QoeMetric' && e.elements && e.elements[0] &&
            e.elements[0].name === 'HttpList'
        );
        if (!metric) return;

        if (!this._httpListChart) {
            this._httpListChart = new Chart(document.getElementById('http-list-chart'), {
                type: 'scatter',
                data: { datasets: [] },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { position: 'top' },
                        title: { display: true, text: 'HTTP Requests: Duration and bytes per type' }
                    },
                    scales: {
                        y: { title: { display: true, text: 'Transferred Bytes' } },
                        x: { title: { display: true, text: 'Request Duration in ms' } }
                    }
                }
            });
        }
        const chart = this._httpListChart;
        metric.elements[0].elements.forEach(dp => {
            const ds = this._getOrCreateDataset(chart, clientId, dp.attributes.type || 'unknown');
            const traces = (dp.elements || []).filter(e => e.name === 'Trace');
            let bytes = 0, duration = 0;
            traces.forEach(t => {
                bytes += parseInt(t.attributes.b || 0);
                duration += parseInt(t.attributes.d || 0);
            });
            ds.data.push([duration, bytes]);
        });
        chart.update();
    }

    // ── Text content helper ──────────────────────────────────────────────────

    /** Robustly extract text from an xml-js element that may have a direct
     *  .text property or wrap its text in a child text node. */
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

    _colourForClient(clientId) {
        if (!(clientId in this._clientColourIndex)) {
            this._clientColourIndex[clientId] = this._nextColourIdx % this._palette.length;
            this._nextColourIdx++;
        }
        return this._palette[this._clientColourIndex[clientId]];
    }

    _shortId(clientId) { return clientId.substring(0, 8); }

    _getOrCreateDataset(chart, clientId, labelSuffix) {
        const fullLabel = `${this._shortId(clientId)} — ${labelSuffix}`;
        let ds = chart.data.datasets.find(d => d._clientId === clientId && d.label === fullLabel);
        if (!ds) {
            ds = {
                label: fullLabel,
                _clientId: clientId,
                borderColor: this._colourForClient(clientId),
                backgroundColor: this._colourForClient(clientId) + '88',
                data: []
            };
            chart.data.datasets.push(ds);
        }
        return ds;
    }

    _removeClientData(clientId) {
        [this._bufferLevelChart, this._representationSwitchChart, this._avgThroughputChart,
         this._playoutDelayChart, this._playlistChart, this._httpListChart]
            .forEach(chart => {
                if (!chart) return;
                chart.data.datasets = chart.data.datasets.filter(ds => ds._clientId !== clientId);
                chart.update();
            });
    }

    _resetAll() {
        this._stopPolling();
        this._loadedFiles = {};
        this._reportCount = {};
        this._activeSession = null;
        this._activeClients = new Set();
        this._clientColourIndex = {};
        this._nextColourIdx = 0;
        [this._bufferLevelChart, this._representationSwitchChart, this._avgThroughputChart,
         this._playoutDelayChart, this._playlistChart, this._httpListChart]
            .forEach(c => { if (c) c.destroy(); });
        this._bufferLevelChart = null;
        this._representationSwitchChart = null;
        this._avgThroughputChart = null;
        this._playoutDelayChart = null;
        this._playlistChart = null;
        this._httpListChart = null;
        ['reception-report-table', 'qoe-report-table', 'mpd-information-table', 'device-information-table'].forEach(id => {
            const tbody = document.querySelector(`#${id} tbody`);
            if (tbody) tbody.innerHTML = '';
        });
    }
}
