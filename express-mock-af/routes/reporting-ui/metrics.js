var express = require('express');
const Utils = require('../../utils/Utils');
const ReportsService = require('../../services/reports.service');
var router = express.Router();

const reportsService = new ReportsService();

/**
 * This endpoint returns an overview of all the metrics for the given provisionSessionIds
 */
router.get('/', async (req, res) => {
    let provisionSessionIds = req.query.provisionSessionIds;
    if (!provisionSessionIds) {
        return res.status(400).send('provisionSessionId is required');
    }

    provisionSessionIds = Utils.regexRangeToArray(provisionSessionIds);

    const report = await reportsService.generateMetricsReport(provisionSessionIds, req.query);
    res.status(200).send(report);
});

/**
 * This endpoint filters reports based on the query parameters and returns them in a detailed format
 */
router.get('/details', async (req, res) => {
    const readContent = await Utils.readFiles('public/reports');
    const transformedJsonResponse = await reportsService.transformXmlToReport(readContent);
    const filteredList = await reportsService.filterReports(transformedJsonResponse, req.query);
    res.status(200).send(filteredList);
});

/**
 * This endpoint functions as an event source that sends a message every time a new file is written.
 * This is base on {@link https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events SSE } (Server-Sent Events)
 */
router.get('/reload', (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });

    const subscription = Utils.fileWritten$.subscribe({
        next: async () => {
            res.write(`event: reload\ndata: A new file has been written\n\n`);
        },
        error: (err) => {
            console.error(err);
            res.status(500).send(err.message);
        }
    });

    req.on('close', () => {
        subscription.unsubscribe();
    });

    // This is a workaround to trigger the event every 10 seconds
    setInterval(() => {
        Utils.fileWritten$.next('Artificial event triggered');
    }, 10000);
});

module.exports = router;
