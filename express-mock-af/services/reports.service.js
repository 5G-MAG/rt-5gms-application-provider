const xml2js = require('xml2js');
const { map, pick, chain, merge, isMatch, isNil, omitBy, defaults } = require('lodash');
const Utils = require('../utils/Utils');

class ReportsService {

    /**
     * Translates XML to JSON
     *
     * @param xml
     * @returns {Promise<*>}
     */
    async translateXmlToJson(xml) {
        return xml2js.parseStringPromise(xml, { mergeAttrs: true, explicitArray: false });
    }

    /**
     * Transforms XML to a report
     *
     * @param XmlFiles
     * @returns {Promise<any[]>}
     */
    async transformXmlToReport(XmlFiles) {
        return Object.values(omitBy(await Promise.all(XmlFiles.map(async (file) => {
            return await this.translateXmlToJson(file);
        })), isNil));
    }

    /**
     * Reads multiple saved metrics reports and generates a combined report
     *
     * @param provisionSessionIds
     * @param queryFilter
     * @returns {Promise<(any)[] | *>}
     */
    async generateMetricsReport(provisionSessionIds, queryFilter) {
        const readContent = (await Promise.all(
            provisionSessionIds.map(async (id) => {
                return Utils.readFiles(`public/reports/${id}/metrics_reports`);
            })
        )).filter(content => content.length !== 0).flat();

        const transformedJsonResponse = await this.transformXmlToReport(readContent);
        return await this.overviewMetricsReport(transformedJsonResponse, queryFilter);
    }

    /**
     * Returns an overview of all the metrics for the given provisionSessionIds
     *
     * @param reports
     * @param queryFilter
     * @returns {Promise<(any)[]>}
     */
    async overviewMetricsReport(reports, queryFilter) {
        const { orderProperty, offset, limit, sortingOrder } = defaults(
            queryFilter,
            {
                orderProperty: 'reportTime',
                sortingOrder: 'desc',
                offset: 0,
                limit: 20
            }
        );

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

    /**
     * Filters reports based on the query parameters
     *
     * @param reportsList
     * @param queryFilter
     * @returns {*}
     */
    filterReports(reportsList, queryFilter) {
        const clearQueryFilter = omitBy(queryFilter, isNil);
        return reportsList.filter(report => {
            const flattenedReport = merge(report.ReceptionReport, report.ReceptionReport.QoeReport);
            console.log(flattenedReport, clearQueryFilter);
            return isMatch(flattenedReport, clearQueryFilter);
        });
    }
}


module.exports = ReportsService;
