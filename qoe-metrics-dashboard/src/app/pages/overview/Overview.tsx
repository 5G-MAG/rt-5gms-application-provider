import {
  Box,
  Button,
  Checkbox,
  Divider,
  IconButton,
  Typography,
} from '@mui/material';

import './Overview.scss';
import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const rows = new Array(101)
  .fill(null)
  .map((_, i) => i + 1)
  .map((i) => ({
    name: 'Metrics Report ' + i,
    date: new Date('2024-05-21'),
    provisioningId: 'owihgnpo2pom134',
  }));

const ROWS_PER_PAGE = 20;

function Overview() {
  const navigate = useNavigate();

  const [metricsReports, setMetricsReports] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedMetricsReports, setSelectedMetricsReports] = useState<
    number[]
  >([]);

  useEffect(() => {
    const reports = getMetricsReports(currentPage);
    if (reports.length === 0) {
      setCurrentPage(currentPage - 1);
    } else {
      setMetricsReports(reports);
    }
  }, [currentPage]);

  function getMetricsReports(page: number): any[] {
    return rows.slice(page * ROWS_PER_PAGE, (page + 1) * ROWS_PER_PAGE);
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
          <Typography component={'span'} fontWeight={'bold'}>
            Name
          </Typography>
          <Typography component={'span'} fontWeight={'bold'}>
            Provisioning ID
          </Typography>
          <Typography component={'span'} fontWeight={'bold'}>
            Date
          </Typography>
        </Box>
        <Divider></Divider>
        <Box className="table-body">
          {metricsReports.map((row, i) => (
            <Box
              key={i}
              className="table-row spacer"
              component={'div'}
              onClick={() => handleClickMetric(i)}
            >
              <Checkbox
                className="table-checkbox"
                onClick={() => handleSelectMetricsReport(i)}
              ></Checkbox>
              <Typography component={'span'}>{row.name}</Typography>
              <Typography component={'span'}>{row.provisioningId}</Typography>
              <Typography component={'span'}>
                {row.date.toUTCString()}
              </Typography>
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
