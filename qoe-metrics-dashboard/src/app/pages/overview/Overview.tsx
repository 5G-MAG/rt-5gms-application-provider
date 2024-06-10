import { styled } from '@mui/material/styles';
import { chunk, defaults, pick, range } from 'lodash';
import React, { useContext, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    CircularProgress,
} from '@mui/material';
import { theme } from '../../../theme';
import { useReportList } from '../../api/ApiController';
import MetricTypeIcon from '../../components/metric-type-icon/metric-type-icon';
import ReloadButton from '../../components/reload-button/reload-button';
import { EnvContext } from '../../env.context';
import { metricsTypeIcon } from '../../models/const/metrics/metrics-type-icon.record';
import { EMetricsType } from '../../models/enums/metrics/metrics-type.enum';
import { ESortingOrder } from '../../models/enums/shared/sorting-order.enum';
import { IMetricsRequestParamsOverview } from '../../models/types/requests/metrics-overview-request-params.interface';
import { TMetricsOverviewReport } from '../../models/types/responses/metrics-overview-report.interface';
import './Overview.scss';
import { DataGrid, DEFAULT_GRID_AUTOSIZE_OPTIONS, GridColDef, GridRenderCellParams, GridToolbar, useGridApiRef } from '@mui/x-data-grid';


const ROWS_PER_PAGE = 5;
const MAX_ROWS_PER_PAGE = 25;

function Overview() {
    const navigate = useNavigate();
    const envCtx = useContext(EnvContext);

    const [, rerenderInternal] = useState({}); // integer state
    const rerender = () => {
        rerenderInternal({});
    }
    const [provisionSessionIds] = useState<RegExp>(/1-6/);
    const [offset, setOffset] = useState<number>(0);
    const [limit, setLimit] = useState<number>(ROWS_PER_PAGE);
    const [sortingOrder, setSortingOrder] = useState<ESortingOrder>(
        ESortingOrder.ASC
    );
    const [currentPage, setCurrentPage] = useState(0);
    const [selectedMetricsReports, setSelectedMetricsReports] = useState<number[]>([]);

    const [orderProperty, setOrderProperty] =
        useState<keyof TMetricsOverviewReport>('reportTime');

    const { reportList, error, loading } = useReportList(envCtx.backendUrl, {
        provisionSessionIds,
        // offset,
        // limit,
        // sortingOrder,
        // orderProperty,
    } as IMetricsRequestParamsOverview);

    useEffect(() => {
        setOffset(currentPage * limit);
    }, [currentPage, limit]);

    if (loading) {
        return (
            <div className="loading">
                <CircularProgress />
            </div>
        );
    }

    if (error) {
        return <div>{error}</div>;
    }

    if (!reportList) {
        return <div>No Records found</div>;
    }
    function handleClickMetric(filterQueryParams: TMetricsOverviewReport): void {
        const params = new URLSearchParams(filterQueryParams as unknown as Record<string, string>);
        navigate('/metrics/details?' + params.toString());
    }

    const columns: GridColDef<TMetricsOverviewReport>[] = [
        { field: 'clientID', headerName: 'Client ID' },
        { field: 'recordingSessionId', headerName: 'Recording Session ID'  },
        { field: 'reportTime', headerName: 'Date', maxWidth: 200 },
        { field: 'reportPeriod', headerName: 'Report Period', maxWidth: 120 },
        { field: 'contentURI', headerName: 'Content URI' },
        {
            field: 'availableMetrics',
            headerName: 'Available Metrics',
            renderCell: (params: GridRenderCellParams) => {
                const availableMetrics = params.value as EMetricsType[];
                return (
                    <>
                        {availableMetrics.map((metricType: EMetricsType, index: number) => (
                            <MetricTypeIcon key={index} metricType={metricType}/>
                        ))}
                    </>
                );
            },
            sortComparator: (v1: string[], v2: string[]) => v1.length - v2.length,
            cellClassName: 'icon-cell'
        },
    ];

    return (
        <div className="page-wrapper">
            <ReloadButton action={rerender}/>
            <DataGrid
                rows={reportList}
                columns={columns.map((column) => (defaults(
                    {},
                    column,
                    { flex: 1 }
                )))}
                initialState={{
                    pagination: {
                        paginationModel: { pageSize: ROWS_PER_PAGE },
                    },
                    sorting: {
                        sortModel: [{ field: 'reportTime', sort: ESortingOrder.ASC }],
                    },
                    columns: {
                        columnVisibilityModel: {
                            reportPeriod: false,
                            contentURI: false,
                        },
                    },
                }}
                pageSizeOptions={range(ROWS_PER_PAGE, MAX_ROWS_PER_PAGE + 1, ROWS_PER_PAGE)}
                getRowId={(row) => `${row.recordingSessionId}-${row.reportTime}`}
                autosizeOptions={{ expand: DEFAULT_GRID_AUTOSIZE_OPTIONS.expand, includeHeaders: true, includeOutliers: true }}
                autosizeOnMount
                checkboxSelection
                onPaginationModelChange={(params) => {
                    setOffset(params.page);
                    setLimit(params.pageSize);
                }}
                onRowClick={(params) => {
                    const filterQueryParams = pick(params.row, ['clientID', 'recordingSessionId', 'reportTime']);
                    handleClickMetric(filterQueryParams as TMetricsOverviewReport);
                }}
                getRowClassName={() => 'row'}
                sx={{
                    '& .MuiDataGrid-row:hover': {
                        backgroundColor: theme.palette.primary.light,
                    },
                    '& .icon-cell': {
                        display: 'flex',
                        alignContent: 'center',
                        alignItems: 'center'
                    },
                    '& .MuiDataGrid-toolbarContainer': {
                        'button': {
                            padding: '0.75rem',
                            margin: '0.5rem'
                        }
                    },
                }}
                loading={loading}
                slots={{ toolbar: GridToolbar}}
            />
        </div>
    );
}

export default Overview;
