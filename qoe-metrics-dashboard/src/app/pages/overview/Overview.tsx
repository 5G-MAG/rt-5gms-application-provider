// import { pick } from 'lodash';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';
import { Box, Button, Checkbox, CircularProgress, Divider, IconButton, Typography } from '@mui/material';
import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useReportList } from '../../api/ApiController';

import './Overview.scss';
import { EnvContext } from '../../env.context';
import { ESortingOrder } from '../../models/enums/shared/sorting-order.enum';
import { TMetricsOverviewReport } from '../../models/types/responses/metrics-overview-report.interface';

const ROWS_PER_PAGE = 20;

function Overview() {
  const navigate = useNavigate();

  const envCtx = useContext(EnvContext);

  // params for metrics report overview
  const [ provisionSessionIds, setProvisionSessionId] = useState<RegExp>(/1-6/);
  const [ offset, setOffset] = useState<number>(0)
  const [ limit, setLimit] = useState<number>(ROWS_PER_PAGE)
  const [ sortingOrder, setSortingOrder] = useState<ESortingOrder>(ESortingOrder.ASC)
  const [ orderProperty, setOrderProperty] = useState<keyof TMetricsOverviewReport>('reportTime')

  const {reportList, error, loading} = useReportList(envCtx.backendUrl, {
    provisionSessionIds,
    offset,
    limit,
    sortingOrder,
    orderProperty
  })

  const [currentPage, setCurrentPage] = useState(0);
  const [selectedMetricsReports, setSelectedMetricsReports] = useState<
    number[]
  >([]);

  useEffect(() => {
    setOffset(currentPage * limit)
  }, [currentPage, limit]);

  if (loading) {
    return (
      <div className="loading">
        <CircularProgress  />
      </div>
    );
  }


  if (error) {
    return <div>{error}</div>;
  }

  if (!reportList) {
    return <div>No Records found</div>;
  }


  function handleChangePage(page: number): void {
    setCurrentPage(page);
  }

  function handleSelectMetricsReport(index: number): void {
    if (selectedMetricsReports.includes(index)) {
      setSelectedMetricsReports(
        selectedMetricsReports.filter((i) => i !== index)
      );
    } else {
      setSelectedMetricsReports([...selectedMetricsReports, index]);
    }
  }

  function handleClickMetric(filterQueryParams: TMetricsOverviewReport): void {
    const params = new URLSearchParams(filterQueryParams as unknown as Record<string, string>);
    navigate('/metrics/details?' + params.toString());
  }

  return (
    <div className="page-wrapper">
      <div className="list-wrapper">
        <Box className="table-header spacer">
          <Checkbox
            className="table-checkbox"
            sx={{ visibility: 'hidden' }}
          ></Checkbox>
          <div>
            <Typography component={'span'} fontWeight={'bold'}>
              Name
            </Typography>
            <Typography component={'span'} fontWeight={'bold'}>
              Provisioning ID
            </Typography>
            <Typography component={'span'} fontWeight={'bold'}>
              Date
            </Typography>
          </div>
        </Box>
        <Divider></Divider>
        <Box className="table-body">
          { Array.isArray(reportList) && reportList.map((row, i) => (
            <Box
              key={i}
              className="table-row spacer"
              component={'div'}
              sx={{
                '&:hover': {
                  backgroundColor: 'primary.light',
                },
              }}
            >
              <Checkbox
                className="table-checkbox"
                onClick={() => handleSelectMetricsReport(i)}
              ></Checkbox>

              <Box component={'div'} onClick={() => handleClickMetric(row)}>
                <Typography component={'span'}>{row.clientID}</Typography>
                <Typography component={'span'}>{row.recordingSessionId}</Typography>
                <Typography component={'span'}>
                  {row.recordingSessionId}
                </Typography>
                <Typography component={'span'}>{row.reportTime}</Typography>
              </Box>
            </Box>
          ))}
        </Box>
        <Divider></Divider>
        <Box className="table-footer">
          <Box>
            <Button
              variant="contained"
              color="primary"
              disabled={!selectedMetricsReports.length}
            >
              Show aggregated metrics
            </Button>
          </Box>
          <Box display={'flex'} alignItems={'center'} gap={1}>
            <IconButton
              onClick={() => handleChangePage(currentPage - 1)}
              disabled={!currentPage}
            >
              <ChevronLeft></ChevronLeft>
            </IconButton>
            <Typography component={'span'}>{currentPage + 1}</Typography>
            <IconButton onClick={() => handleChangePage(currentPage + 1)} disabled={reportList.length < ROWS_PER_PAGE}>
              <ChevronRight></ChevronRight>
            </IconButton>
          </Box>
        </Box>
      </div>
    </div>
  );
}

export default Overview;
