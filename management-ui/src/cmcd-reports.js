/*
License: 5G-MAG Public License (v1.0)
Author: Jordi Joan Gimenez (5G-MAG)
Copyright: (C) 5G-MAG Association
*/

const CMCD_COLORS = [
    '#4e79a7','#f28e2b','#59a14f','#e15759','#76b7b2',
    '#edc948','#b07aa1','#ff9da7','#9c755f','#bab0ac',
];

class CmcdReportsApp {

    constructor() {
        this.POLL_INTERVAL_MS = 5000;
        this._pollTimer = null;
        this._charts = {};
    }

    init() {
        document.getElementById('cmcd-range').addEventListener('change', () => this._refresh());
        this._refresh();
        this._pollTimer = setInterval(() => this._refresh(), this.POLL_INTERVAL_MS);
    }

    _setDbError(error) {
        const el = document.getElementById('cmcd-db-status');
        if (!el) return;
        el.classList.toggle('af-ok', !error);
        el.classList.toggle('af-error', error);
        el.innerHTML = `<span class="af-dot"></span>${error ? 'CMCD DB not connected' : 'CMCD DB connected'}`;
    }

    async _refresh() {
        const range = document.getElementById('cmcd-range').value;
        try {
            const resp = await fetch(`/cmcd/metrics?range=${range}`);
            if (!resp.ok) {
                this._setDbError(true);
                return;
            }
            this._setDbError(false);
            const data = await resp.json();
            this._renderStats(data);
            this._renderPieChart(data);
            this._renderMeanBl(data);
            this._renderMultiSidChart('cmcd-chart-bl',  data.bl_by_sid,  'cmcd_key_bl',  'Buffer Level (ms)');
            this._renderMultiSidChart('cmcd-chart-mtp', data.mtp_by_sid, 'cmcd_key_mtp', 'Throughput (kbit/s)');
            this._renderMultiSidChart('cmcd-chart-br',  data.br_by_sid,  'cmcd_key_br',  'Bitrate (kbit/s)');
            this._renderMultiSidChart('cmcd-chart-tb',  data.tb_by_sid,  'cmcd_key_tb',  'Top Bitrate (kbit/s)');
            this._renderBufferDrain(data.buffer_drain);
            this._renderSessionsTable(data.sessions_table);
            this._renderContentTable(data.content_table);
        } catch (e) {
            this._setDbError(true);
            console.error('CMCD fetch error', e);
        }
    }

    _series(queryResult) {
        return queryResult?.results?.[0]?.series || [];
    }

    _firstVal(queryResult, col) {
        const s = this._series(queryResult)[0];
        if (!s) return null;
        const i = s.columns.indexOf(col);
        return s.values?.[0]?.[i] ?? null;
    }

    _renderStats(data) {
        const msg = this._firstVal(data.total_messages, 'count');
        document.getElementById('cmcd-stat-messages').textContent = msg ?? '—';

        const sessions = this._series(data.unique_sessions).length;
        document.getElementById('cmcd-stat-sessions').textContent = sessions || '—';

        const lat = this._firstVal(data.mean_dl_latency, 'latency');
        document.getElementById('cmcd-stat-latency').textContent =
            lat !== null ? `${Number(lat).toFixed(1)} ms` : '—';
    }

    _renderPieChart(data) {
        const id = 'cmcd-chart-pie-mode';
        const series = this._series(data.messages_by_mode);
        const noData = document.getElementById('cmcd-pie-nodata');

        if (!series.length) {
            if (noData) noData.style.display = '';
            return;
        }
        if (noData) noData.style.display = 'none';

        const labels = series.map(s => s.tags?.cmcd_mode || '?');
        const values = series.map(s => {
            const i = s.columns.indexOf('count');
            return s.values?.[0]?.[i] ?? 0;
        });

        if (this._charts[id]) {
            this._charts[id].data.labels = labels;
            this._charts[id].data.datasets[0].data = values;
            this._charts[id].update('none');
            return;
        }
        const ctx = document.getElementById(id)?.getContext('2d');
        if (!ctx) return;
        this._charts[id] = new Chart(ctx, {
            type: 'doughnut',
            data: { labels, datasets: [{ data: values, backgroundColor: CMCD_COLORS }] },
            options: {
                responsive: true,
                animation: false,
                plugins: { legend: { position: 'right' } },
            },
        });
    }

    _renderMeanBl(data) {
        const id = 'cmcd-chart-mean-bl';
        const s = this._series(data.mean_bl)[0];
        if (!s) return;
        const ti = s.columns.indexOf('time');
        const bi = s.columns.indexOf('bl');
        const points = s.values.map(r => ({ x: new Date(r[ti]), y: r[bi] === null ? null : Number(r[bi]) }));
        this._lineChart(id, [{
            label: 'Mean Buffer Level (ms)',
            data: points,
            borderColor: CMCD_COLORS[0],
            backgroundColor: CMCD_COLORS[0] + '22',
            borderWidth: 2, pointRadius: 2, tension: 0.3, spanGaps: false,
        }], 'Buffer Level (ms)', false);
    }

    _renderMultiSidChart(id, queryResult, field, yLabel) {
        const allSeries = this._series(queryResult);
        if (!allSeries.length) return;

        const datasets = allSeries.map((s, idx) => {
            const sid = s.tags?.cmcd_key_sid || `session-${idx}`;
            const sidShort = sid.length > 14 ? '…' + sid.slice(-14) : sid;
            const ti = s.columns.indexOf('time');
            const fi = s.columns.indexOf(field);
            const points = (s.values || []).map(r => ({
                x: new Date(r[ti]),
                y: r[fi] === null ? null : Number(r[fi]),
            }));
            const color = CMCD_COLORS[idx % CMCD_COLORS.length];
            return {
                label: sidShort,
                data: points,
                borderColor: color,
                backgroundColor: color + '22',
                borderWidth: 2, pointRadius: 2, tension: 0.3, spanGaps: false,
            };
        });

        this._lineChart(id, datasets, yLabel, datasets.length > 1);
    }

    _lineChart(id, datasets, yLabel, showLegend) {
        if (this._charts[id]) {
            this._charts[id].data.datasets = datasets;
            this._charts[id].update('none');
            return;
        }
        const ctx = document.getElementById(id)?.getContext('2d');
        if (!ctx) return;
        this._charts[id] = new Chart(ctx, {
            type: 'line',
            data: { datasets },
            options: {
                responsive: true,
                animation: false,
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            minUnit: 'second',
                            tooltipFormat: 'HH:mm:ss',
                            displayFormats: { second: 'HH:mm:ss', minute: 'HH:mm' },
                        },
                        ticks: { maxTicksLimit: 8 },
                    },
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: yLabel },
                    },
                },
                plugins: { legend: { display: showLegend } },
            },
        });
    }

    _renderBufferDrain(queryResult) {
        const id = 'cmcd-chart-buffer-drain';
        const series = this._series(queryResult);
        if (!series.length) return;

        const labels = series.map(s => {
            const t = s.tags?.cmcd_key_sid || '?';
            return t.length > 18 ? '…' + t.slice(-18) : t;
        });

        // Formula matches Grafana: 1 - (mtp / br)
        // Negative = buffer filling (good), positive = buffer draining (bad)
        const drainVals = series.map(s => {
            const bi  = s.columns.indexOf('br');
            const mi  = s.columns.indexOf('mtp');
            const br  = s.values?.[0]?.[bi];
            const mtp = s.values?.[0]?.[mi];
            if (!br || br === 0) return null;
            return Number((1 - mtp / br).toFixed(3));
        });

        const colors = drainVals.map(v => v === null ? '#ccc' : v >= 0 ? '#c4291c' : '#3d9e44');

        // Symmetric axis: 0 in the centre, with extra room for the datalabels
        const maxAbs = Math.max(...drainVals.filter(v => v !== null).map(Math.abs), 1);
        const axisMax = maxAbs * 1.6;

        if (this._charts[id]) {
            this._charts[id].data.labels = labels;
            this._charts[id].data.datasets[0].data = drainVals;
            this._charts[id].data.datasets[0].backgroundColor = colors;
            this._charts[id].options.scales.x.min = -axisMax;
            this._charts[id].options.scales.x.max =  axisMax;
            this._charts[id].update('none');
            return;
        }
        const ctx = document.getElementById(id)?.getContext('2d');
        if (!ctx) return;
        this._charts[id] = new Chart(ctx, {
            type: 'bar',
            plugins: [ChartDataLabels],
            data: {
                labels,
                datasets: [{
                    label: 'Buffer Drain',
                    data: drainVals,
                    backgroundColor: colors,
                }],
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                animation: false,
                scales: {
                    x: {
                        min: -axisMax,
                        max:  axisMax,
                        title: { display: true, text: '1 − (mtp / br)  ·  negative = filling, positive = draining' },
                        grid: { color: ctx => ctx.tick.value === 0 ? '#555' : '#e5e5e5', lineWidth: ctx => ctx.tick.value === 0 ? 2 : 1 },
                    },
                },
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false },
                    datalabels: {
                        anchor: 'end',
                        align: 'end',
                        offset: 4,
                        color: '#333',
                        font: { size: 11, weight: '600' },
                        formatter: v => v === null ? '' : `${v >= 0 ? 'Draining' : 'Filling'}  ${v}`,
                    },
                },
            },
        });
    }

    _renderSessionsTable(queryResult) {
        const tbody = document.querySelector('#cmcd-table-sessions tbody');
        if (!tbody) return;
        const series = this._series(queryResult);
        tbody.innerHTML = '';
        if (!series.length) {
            tbody.innerHTML = '<tr><td colspan="5" class="cmcd-no-data">No sessions in range</td></tr>';
            return;
        }
        series.forEach(s => {
            const sid = s.tags?.cmcd_key_sid || '?';
            const ua  = s.tags?.request_user_agent || '?';
            const cols = s.columns;
            const row  = s.values?.[0] || [];
            const get  = name => { const i = cols.indexOf(name); return i >= 0 ? (row[i] ?? '—') : '—'; };
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="truncate" title="${sid}">${sid.length > 16 ? '…' + sid.slice(-16) : sid}</td>
                <td>${get('messages')}</td>
                <td>${get('stream_type')}</td>
                <td>${get('version')}</td>
                <td class="truncate" title="${ua}">${ua}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    _renderContentTable(queryResult) {
        const tbody = document.querySelector('#cmcd-table-content tbody');
        if (!tbody) return;
        const series = this._series(queryResult);
        tbody.innerHTML = '';
        if (!series.length) {
            tbody.innerHTML = '<tr><td colspan="3" class="cmcd-no-data">No content data in range</td></tr>';
            return;
        }
        series.forEach(s => {
            const cid = s.tags?.cmcd_key_cid || '?';
            const sid = s.tags?.cmcd_key_sid || '?';
            const i   = s.columns.indexOf('messages');
            const count = s.values?.[0]?.[i] ?? '—';
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="truncate" title="${cid}">${cid}</td>
                <td class="truncate" title="${sid}">${sid.length > 16 ? '…' + sid.slice(-16) : sid}</td>
                <td>${count}</td>
            `;
            tbody.appendChild(tr);
        });
    }
}
