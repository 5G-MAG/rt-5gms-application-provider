/**
 * server.js — Express backend for 5GMS QoE metrics viewer
 *
 * Place this file in the project root (qoe-metrics-reporting-ui/)
 * alongside index.html, App.js, styles.css etc.
 *
 * Run with: node server.js (from the project root)
 *
 * Endpoints:
 *   GET /api/config                              → get current base path
 *   POST /api/config                             → update base path at runtime
 *   GET /api/sessions                            → list provisioning session IDs
 *   GET /api/sessions/:sessionId/clients         → list unique client IDs for a session
 *   GET /api/sessions/:sessionId/reports         → list XML filenames (optionally filter by clientId)
 *   GET /api/sessions/:sessionId/reports/:file   → serve raw XML of one report file
 */

const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Serve everything in the project root (index.html, App.js, styles.css, assets/, samples/ etc.)
app.use(express.static(__dirname));

// ── Runtime-configurable base path ──────────────────────────────────────────
let AF_REPORTS_BASE = process.env.AF_REPORTS_BASE ||
    '/home/fivegmag/5GMS/rt-5gms-examples/5gms-docker-setup/recipe1/af-reports';

// ── Helpers ──────────────────────────────────────────────────────────────────

function safeResolve(root, ...parts) {
    const resolved = path.resolve(root, ...parts);
    return resolved.startsWith(path.resolve(root)) ? resolved : null;
}

function extractTimestamp(filename) {
    const base = filename.replace(/\.xml$/, '');
    const parts = base.split('_');
    return parts[parts.length - 1] || filename;
}

function extractClientId(filename) {
    const base = filename.replace(/\.xml$/, '');
    const match = base.match(/^([0-9a-f\-]+)_([0-9a-f\-]+)_(.+)$/i);
    return match ? match[1] : base;
}

// ── Routes ───────────────────────────────────────────────────────────────────

app.get('/api/config', (req, res) => {
    res.json({ basePath: AF_REPORTS_BASE });
});

app.post('/api/config', (req, res) => {
    const { basePath } = req.body;
    if (!basePath || typeof basePath !== 'string') {
        return res.status(400).json({ error: 'basePath must be a non-empty string' });
    }
    AF_REPORTS_BASE = basePath;
    console.log('Base path updated to:', AF_REPORTS_BASE);
    res.json({ basePath: AF_REPORTS_BASE });
});

app.get('/api/sessions', (req, res) => {
    fs.readdir(AF_REPORTS_BASE, { withFileTypes: true }, (err, entries) => {
        if (err) {
            return res.status(500).json({ error: 'Cannot read base path', detail: err.message });
        }
        const sessions = entries
            .filter(e => e.isDirectory())
            .map(e => e.name)
            .sort();
        res.json(sessions);
    });
});

app.get('/api/sessions/:sessionId/clients', (req, res) => {
    const reportsDir = safeResolve(AF_REPORTS_BASE, req.params.sessionId, 'metrics_reports');
    if (!reportsDir) return res.status(400).json({ error: 'Invalid session ID' });

    fs.readdir(reportsDir, (err, files) => {
        if (err) {
            return res.status(500).json({ error: 'Cannot read metrics_reports', detail: err.message });
        }
        const clientIds = [...new Set(
            files.filter(f => f.endsWith('.xml')).map(extractClientId)
        )].sort();
        res.json(clientIds);
    });
});

app.get('/api/sessions/:sessionId/reports', (req, res) => {
    const reportsDir = safeResolve(AF_REPORTS_BASE, req.params.sessionId, 'metrics_reports');
    if (!reportsDir) return res.status(400).json({ error: 'Invalid session ID' });

    const clientFilter = req.query.clientId || null;

    fs.readdir(reportsDir, (err, files) => {
        if (err) {
            return res.status(500).json({ error: 'Cannot read metrics_reports', detail: err.message });
        }
        let xmlFiles = files.filter(f => f.endsWith('.xml'));
        if (clientFilter) {
            xmlFiles = xmlFiles.filter(f => extractClientId(f) === clientFilter);
        }
        xmlFiles.sort((a, b) => extractTimestamp(a).localeCompare(extractTimestamp(b)));
        res.json(xmlFiles);
    });
});

app.get('/api/sessions/:sessionId/reports/:filename', (req, res) => {
    const { sessionId, filename } = req.params;

    if (!filename.endsWith('.xml') || filename.includes('/') || filename.includes('..')) {
        return res.status(400).json({ error: 'Invalid filename' });
    }

    const filePath = safeResolve(AF_REPORTS_BASE, sessionId, 'metrics_reports', filename);
    if (!filePath) return res.status(400).json({ error: 'Path traversal attempt detected' });

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') return res.status(404).json({ error: 'File not found' });
            return res.status(500).json({ error: 'Could not read file', detail: err.message });
        }
        res.type('application/xml').send(data);
    });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`5GMS metrics server running on http://localhost:${PORT}`);
    console.log(`Serving files from: ${__dirname}`);
    console.log(`AF reports base path: ${AF_REPORTS_BASE}`);
});
