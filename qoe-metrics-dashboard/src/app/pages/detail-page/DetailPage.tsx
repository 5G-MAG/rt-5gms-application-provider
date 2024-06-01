import { useEffect, useState } from 'react';

import { Box } from '@mui/material';

import ApiController from '../../api/ApiController';
import BufferLevelChart from '../../components/buffer-level-chart/BufferLevelChart';
import HttpListChart from '../../components/http-list-chart/HttpListChart';
import { QoEMetricsReport } from '../../types/qoe-report.type';

function DetailPage({ reportId }: { reportId: string }) {
  const [report, setReport] = useState<QoEMetricsReport | null>(null);

  useEffect(() => {
    async function getMetricsReport(reportId: string): Promise<void> {
      const report = await ApiController.getMetricsReport(reportId);
      if (report) {
        setReport(report);
      }
    }
    getMetricsReport(reportId);
  }, [reportId]);

  return (
    <Box padding={'2rem'} component={'div'} overflow={'scroll'}>
      <BufferLevelChart
        bufferLevel={
          report?.ReceptionReport.QoeReport.QoeMetric.find(
            (metric) => metric.BufferLevel
          )?.BufferLevel
        }
      ></BufferLevelChart>
      <div
        style={{
          height: '2rem',
        }}
      ></div>
      <HttpListChart
        httpList={
          report?.ReceptionReport.QoeReport.QoeMetric.find(
            (metric) => metric.HttpList
          )?.HttpList
        }
      ></HttpListChart>
    </Box>
  );
}

export default DetailPage;
