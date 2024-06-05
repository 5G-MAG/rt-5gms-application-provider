import { IQoeReport, IReceptionReport } from '../responses/metrics-details-report.interface';

/**
 * The endpoint allows to filter based on the properties of the reception report and the QoE report
 */
export type TMetricsDetailsRequestParams = IReceptionReport | IQoeReport
