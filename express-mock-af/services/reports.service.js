const xml2js = require('xml2js');
const { map, pick, chain, merge, isMatch, isNil, omitBy, defaults } = require('lodash');
const Utils = require('../utils/Utils');

class ReportsService {

    async translateXmlToJson(xml) {
        return xml2js.parseStringPromise(xml, {mergeAttrs: true, explicitArray: false});
    }

    async transformXmlToReport(XmlFiles) {
        return Object.values(omitBy(await Promise.all(XmlFiles.map(async (file) => {
            return await this.translateXmlToJson(file);
        })), isNil));
    }

    async generateMetricsReport (provisionSessionIds, queryFilter) {
        const readContent = (await Promise.all(
            provisionSessionIds.map(async (id) => {
                return Utils.readFiles(`public/reports/${id}/metrics_reports`);
            })
        )).filter(content => content.length !== 0).flat();

        const transformedJsonResponse = await this.transformXmlToReport(readContent);
        return await this.overviewMetricsReport(transformedJsonResponse, queryFilter);
    }

    async overviewMetricsReport(reports, queryFilter) {
        const { orderProperty, offset, limit, sortingOrder, provisionSessionId } = defaults(
            queryFilter,
            {
                orderProperty: 'reportTime',
                sortingOrder: 'desc',
                offset: 0,
                limit: 20
            }
        )

        return chain(reports)
            .map((report) => {
                const receptionReport = pick(report.ReceptionReport, [
                    'clientID',
                    'contentURI'
                ]);

                const qoeReport = pick(report.ReceptionReport.QoeReport, [
                    'reportPeriod',
                    'reportTime',
                    'recordingSessionId'
                ]);

                return defaults({}, receptionReport, qoeReport);
            })
            .orderBy(orderProperty, sortingOrder)
            .drop(offset)
            .take(limit)
            .value();
    }

    filterReports(reportsList, queryFilter) {
        const clearQueryFilter = omitBy(queryFilter, isNil);
        return reportsList.filter(report => {
            const flattenedReport = merge(report.ReceptionReport, report.ReceptionReport.QoeReport);
            console.log(flattenedReport, clearQueryFilter);
            return isMatch(flattenedReport, clearQueryFilter)
        });
    }
}


module.exports = ReportsService
