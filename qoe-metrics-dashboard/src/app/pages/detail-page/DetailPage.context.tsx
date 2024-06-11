import { createContext } from 'react';

import { TMetricsDetailsReportResponse } from '../../models/types/responses/metrics-details-report.interface';

export const DetailPageContext = createContext<
    TMetricsDetailsReportResponse
>(
    {} as TMetricsDetailsReportResponse
);
