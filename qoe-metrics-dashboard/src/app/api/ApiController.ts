import axios from 'axios';
import { useEffect, useState } from 'react';

import { TMetricsReportOverviewResponse } from '../types/responses/backend/metrics/report-overview.interface';

const useAxiosGet = <T>({ url, params }: {
    url: string;
    params?: string;

}) => {
    const [response, setResponse] = useState<T>();
    const [error, setError] = useState('');
    const [loading, setloading] = useState(true);


    useEffect(() => {
        const fetchData = () => {
            axios<T>(url,{
                method: "get",
                params: params ? JSON.parse(params) : {},
            })
                .then((res) => {
                  console.log(res)
                    setResponse(res.data);
                })
                .catch((err) => {
                    setError(err);
                })
                .finally(() => {
                    setloading(false);
                });
        };


        fetchData();
    }, [url, params]);

    return { response, error, loading };
};


export const useReportList = (
    backendUrl = 'http://localhost:3003/reporting-ui/metrics',
    provisionSessionIds: string,
    offset: number,
    limit: number
) => {

    const {response: reportList, error, loading} =  useAxiosGet< TMetricsReportOverviewResponse >({
        url: `${backendUrl}`,
        params: JSON.stringify({ provisionSessionIds, offset, limit, }),
    });

    return {reportList, error, loading}
}
