import { EMetricsType } from '../../enums/metrics/metrics-type.enum';

/**
 * The response type for the backend endpoint for metrics report overview
 */
export type TMetricsOverviewReportResponse = TMetricsOverviewReport[]

/**
 * Interface for an individual metrics overview report
 */
export type TMetricsOverviewReport = {
    /**
     * The client ID
     */
    clientID: string;

    /**
     * The content URI of the report
     */
    contentURI: string;

    /**
     * The interval of the report
     */
    reportPeriod: string;

    /**
     * The time when the report was generated
     */
    reportTime: string;

    /**
     * The ID of the recording session
     */
    recordingSessionId: string;

    /**
     * Indicates which metrics are available in the report
     */
    availableMetrics: EMetricsType[];
}
