import axios from 'axios';

import { QoEMetricsReport, ReceptionReport } from '../types/qoe-report.type';

export default class ApiController {
  static async getMetricsReportsList(
    page: number,
    itemsPerPage: number
  ): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const rows = new Array(101)
        .fill(null)
        .map((_, i) => i + 1)
        .map((i) => ({
          name: 'Metrics Report ' + i,
          date: new Date('2024-05-21'),
          provisioningId: 'owihgnpo2pom134',
        }));
      resolve(rows.slice(page * itemsPerPage, (page + 1) * itemsPerPage));
    });
  }

  static async getMetricsReport(
    reportId: string
  ): Promise<QoEMetricsReport | null> {
    try {
      const report = (await axios.get<QoEMetricsReport>('/sample.json')).data;
      return report;
    } catch (error) {
      console.error('Error reading JSON file:', error);
      return null;
    }
  }
}
