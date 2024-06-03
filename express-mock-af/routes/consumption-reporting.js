var express = require('express');
var router = express.Router();
var Utils = require('../utils/Utils.js')

router.post('/:provisioningSessionId', function(req, res, next) {
  try {
    //console.log(`ConsumptionReporting: `, req.body)
    const payload = req.body
    const path = `public/reports/${req.params.provisioningSessionId}/consumption_reports/${payload.reportingClientId}_${new Date().toISOString()}.json`

    Utils.writeToDisk(path, JSON.stringify(payload))
    res.send(204);
  }
  catch(e) {
    console.error(e)
  }

});


module.exports = router;
