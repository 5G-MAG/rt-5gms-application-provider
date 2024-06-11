import { QoeMetric } from '../metrics/qoe-report.type';

/**
 * The response type for the backend endpoint for metrics report detail
 */
export type TMetricsDetailsReportResponse = TMetricsDetailReport[];

/**
 * The interface for a single metrics report detail
 */
export interface TMetricsDetailReport {
    ReceptionReport: IReceptionReport;
}

/**
 * Template for a reception report
 */
export interface IReceptionReport {
    clientID: string;
    contentURI: string;
    'xsi:schemaLocation': string;
    'xmlns:sv': string;
    xmlns: string;
    'xmlns:xsi': string;
    QoeReport: IQoeReport;
}

/**
 * The interface for a QoE report
 */
export interface IQoeReport {
    recordingSessionId: string;
    reportPeriod: string;
    reportTime: string;
    periodID: string;
    QoeMetric?: QoeMetric[];
}
