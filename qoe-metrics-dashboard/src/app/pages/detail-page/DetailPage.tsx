import { pickBy } from 'lodash';
import { useEffect, useState } from 'react';

import { Box, CircularProgress } from '@mui/material';
import { useSearchParams } from 'react-router-dom';

import BufferLevelChart from '../../components/buffer-level-chart/BufferLevelChart';
import HttpListChart from '../../components/http-list-chart/HttpListChart';
import RepSwitchesChart from '../../components/rep-switches-chart/RepSwitchesChart';
import { EnvContext } from '../../env.context';
import { TMetricsDetailsRequestParams } from '../../models/types/requests/metrics-details-request-params.type';

import { useContext } from 'react';
import { useReportDetail } from '../../api/ApiController';
import { DetailPageContext } from './DetailPage.context';

import './DetailPage.scss'

function DetailPage({ reportId }: { reportId: string }) {

    const envCtx = useContext(EnvContext);

    const [searchParams, setSearchParams] = useSearchParams();

    const { reportDetails, error, loading } = useReportDetail(envCtx.backendUrl, searchParams as unknown as TMetricsDetailsRequestParams);


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

    if (!reportDetails) {
        return <div>No Data found</div>;
    }

    return (
        <div>
            { Array.isArray(reportDetails) && reportDetails.map ((report) => (

                <DetailPageContext.Provider value={reportDetails}>
                    { Array.isArray(report?.ReceptionReport.QoeReport.QoeMetric) &&
                    <Box
                        padding={'2rem'}
                        component={'div'}
                        overflow={'scroll'}
                        display={'flex'}
                        flexDirection={'column'}
                        gap={'2rem'}
                    >

                            <BufferLevelChart
                                bufferLevel={
                                    report?.ReceptionReport.QoeReport.QoeMetric?.find(
                                        (metric) => metric.BufferLevel
                                    )?.BufferLevel
                                }
                            ></BufferLevelChart>




                        <HttpListChart
                            httpList={
                                report?.ReceptionReport.QoeReport.QoeMetric?.find(
                                    (metric) => metric.HttpList
                                )?.HttpList
                            }
                        ></HttpListChart>

                        {/*<RepSwitchesChart*/}
                        {/*    repSwitchList={*/}
                        {/*        report?.ReceptionReport.QoeReport.QoeMetric?.find(*/}
                        {/*            (metric) => metric.RepSwitchList*/}
                        {/*        )?.RepSwitchList*/}
                        {/*    }*/}
                        {/*    mpdInfo={*/}
                        {/*        report?.ReceptionReport.QoeReport.QoeMetric?.find(*/}
                        {/*            (metric) => metric.MPDInformation*/}
                        {/*        )?.MPDInformation*/}
                        {/*    }*/}
                        {/*></RepSwitchesChart>*/}
                    </Box>
                    }

                </DetailPageContext.Provider>
        ))}
    </div>
    )




}

export default DetailPage;
