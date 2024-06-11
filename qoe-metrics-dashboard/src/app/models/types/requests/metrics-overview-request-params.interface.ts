import { ESortingOrder } from '../../enums/shared/sorting-order.enum';
import { TMetricsOverviewReport } from '../responses/metrics-overview-report.interface';

/**
 * The interface for request parameters for the metrics report overview
 */
export interface IMetricsRequestParamsOverview {
    /**
     * The id of the provision session (the video used in demo app) usually it is 1-6
     */
    provisionSessionIds: RegExp;

    /**
     * The offset of the report
     */
    offset?: number;

    /**
     * The limit of the report
     */
    limit?: number;

    /**
     * The property to order the report by
     */
    orderProperty?: keyof TMetricsOverviewReport;

    /**
     * The sorting order
     */
    sortingOrder?: ESortingOrder;
}
