const express = require('express');
const { log } = require('debug');
global.EventSource = require('eventsource');

/**
 * Create an express app which should validate the functionality of the SSE endpoint of the regular mock server.
 * @type {*|Express}
 */
const app = express();
const port = 3004;

app.get('/', (req, res) => {
    observeEndpoint();
    res.send(200);
});

function observeEndpoint() {
    const eventSource = new EventSource('http://localhost:3003/frontend/metrics/reload');

    eventSource.onopen = function (event) {
        log('Connection opened');
    };

    eventSource.onerror = function (e) {
        log('Event: error');
        if (this.readyState == EventSource.CONNECTING) {
            log(`Reconnecting (readyState=${this.readyState})...`);
        } else {
            log('Error has occured.');
        }
    };

    eventSource.addEventListener('reload', function (e) {
        log(e.data);
    });

    eventSource.onmessage = function (e) {
        log('Event: message, data: ' + e.data);
    };
}


app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
