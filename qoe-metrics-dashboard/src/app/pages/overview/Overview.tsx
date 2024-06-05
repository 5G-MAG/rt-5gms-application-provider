// import { pick } from 'lodash';
import { useEffect, useState } from 'react';
import { Simulate } from 'react-dom/test-utils';
import { useNavigate } from 'react-router-dom';

import { ChevronLeft, ChevronRight } from '@mui/icons-material';
import {
  Box,
  Button,
  Checkbox,
  Divider,
  IconButton,
  Typography,
} from '@mui/material';

import  { useReportList } from '../../api/ApiController';

import './Overview.scss';
import load = Simulate.load;

const ROWS_PER_PAGE = 20;
const backendUrl = undefined

function Overview() {
  const navigate = useNavigate();

  // params for metrics report overview
  const [ provisionSessionId, setProvisionSessionId] = useState<RegExp>(/1-6/);
  const [ offset, setOffset] = useState<number>(0)
  const [ limit, setLimit] = useState<number>(0)

  // params for metrics report details
  // const receptionReport = pick(report.ReceptionReport, [
  //   'clientID',
  //   'contentURI'
  // ]);
  //
  // const qoeReport = pick(report.ReceptionReport.QoeReport, [
  //   'reportPeriod',
  //   'reportTime',
  //   'recordingSessionId'
  // ]);
  //
  // const [ clientId, setClientId ] = useState<string>('');


  const {reportList, error, loading} = useReportList(backendUrl, provisionSessionId, offset, limit)

  const [currentPage, setCurrentPage] = useState(0);
  const [selectedMetricsReports, setSelectedMetricsReports] = useState<
    number[]
  >([]);

  // useEffect(() => {
  //   async function getMetricsReports(page: number): Promise<void> {
  //     const reports = await ApiController.getMetricsReportsList(
  //       page,
  //       ROWS_PER_PAGE
  //     );
  //     if (reports.length === 0) {
  //       setCurrentPage(currentPage - 1);
  //     } else {
  //       setMetricsReports(reports);
  //     }
  //   }
  //   getMetricsReports(currentPage);
  // }, [currentPage]);

  if (loading) {
    return "loading"
  }

  if (!reportList) {
    return <div>
      No Records found
    </div>
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

  function handleClickMetric(index: number): void {
    navigate('/metrics/' + index);
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
          {reportList.map((row, i) => (
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

              <Box component={'div'} onClick={() => handleClickMetric(i)}>
                <Typography component={'span'}>{row.clientID}</Typography>
                <Typography component={'span'}>{row.recordingSessionId}</Typography>
                <Typography component={'span'}>
                  {row.reportTime}
                </Typography>
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
            <IconButton onClick={() => handleChangePage(currentPage + 1)}>
              <ChevronRight></ChevronRight>
            </IconButton>
          </Box>
        </Box>
      </div>
    </div>
  );
}

export default Overview;
