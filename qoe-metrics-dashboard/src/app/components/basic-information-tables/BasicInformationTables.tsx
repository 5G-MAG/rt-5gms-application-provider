import React from 'react';

import {
    Box,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material';

import { IReceptionReport } from '../../models/types/responses/metrics-details-report.interface';

function BasicInformationTables({
    receptionReport,
}: {
    receptionReport?: IReceptionReport;
}) {
    if (!receptionReport) {
        return null;
    }

    return (
        <Box display={'flex'} gap={'2rem'} flexWrap={'wrap'}>
            <Box
                padding={'2rem'}
                bgcolor={'background.default'}
                borderRadius={'2rem'}
                alignItems={'center'}
                display={'flex'}
                flexDirection={'column'}
                flex={1}
            >
                <Typography
                    component={'h2'}
                    variant="h5"
                    paddingBottom={'1rem'}
                >
                    Reception Report
                </Typography>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Field</TableCell>
                            <TableCell>Value</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        <TableRow>
                            <TableCell>clientID</TableCell>
                            <TableCell>{receptionReport.clientID}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>contentURI</TableCell>
                            <TableCell>
                                <a href={receptionReport.contentURI}>
                                    {receptionReport.contentURI}
                                </a>
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </Box>
            <Box
                padding={'2rem'}
                bgcolor={'background.default'}
                borderRadius={'2rem'}
                alignItems={'center'}
                display={'flex'}
                flexDirection={'column'}
                flex={1}
            >
                <Typography
                    component={'h2'}
                    variant="h5"
                    paddingBottom={'1rem'}
                >
                    QoE Report
                </Typography>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Field</TableCell>
                            <TableCell>Value</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        <TableRow>
                            <TableCell>recordingSessionId</TableCell>
                            <TableCell>
                                {receptionReport.QoeReport.recordingSessionId}
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>reportPeriod</TableCell>
                            <TableCell>
                                {receptionReport.QoeReport.reportPeriod}
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>reportTime</TableCell>
                            <TableCell>
                                {receptionReport.QoeReport.reportTime}
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </Box>
        </Box>
    );
}

export default BasicInformationTables;
