var express = require('express');
const Utils = require('../../utils/Utils');
const ReportsService = require('../../services/reports.service');
var router = express.Router();

const reportsService = new ReportsService();

// It is necessary to set provisionSessionId
router.get('/', async (req, res) => {
    let provisionSessionIds = req.query.provisionSessionIds;
    if (!provisionSessionIds) {
        return res.status(400).send('provisionSessionId is required');
    }

    const isValidFormat = provisionSessionIds.match(/([1-6],)*[1-6]|([1-6]-[1-6])/g);
    if (!isValidFormat) {
        return res.status(400).send('Invalid format for provisionSessionIds must be of the form 1-6 or 1,2,3,4,5,6 or 1');
    }
    provisionSessionIds = Utils.regexRangeToNumberArray(provisionSessionIds);

    const report = await reportsService.generateMetricsReport(provisionSessionIds, req.query);
    res.status(200).send(report);
});

router.get('/details', async (req, res) => {
    const readContent = await Utils.readFiles('public/reports');
    const transformedJsonResponse = await reportsService.transformXmlToReport(readContent);
    const filteredList = await reportsService.filterReports(transformedJsonResponse, req.query);
    res.status(200).send(filteredList);
});

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
