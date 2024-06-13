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

import { MPDInformation } from '../../models/types/metrics/qoe-report.type';

function MPDInformationTable({ mpdInfo }: { mpdInfo?: MPDInformation[] }) {
    if (!mpdInfo) {
        return null;
    }

    return (
        <Box
            padding={'2rem'}
            bgcolor={'background.default'}
            borderRadius={'2rem'}
            alignItems={'center'}
            display={'flex'}
            flexDirection={'column'}
        >
            <Typography component={'h2'} variant="h5" paddingBottom={'1rem'}>
                Representation Switches
            </Typography>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>Representation ID</TableCell>
                        <TableCell>Bandwidth</TableCell>
                        <TableCell>Codecs</TableCell>
                        <TableCell>Mime Type</TableCell>
                        <TableCell>Height</TableCell>
                        <TableCell>Width</TableCell>
                        <TableCell>Frame Rate</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {mpdInfo.map((info) => (
                        <TableRow key={info.representationId}>
                            <TableCell>{info.representationId}</TableCell>
                            <TableCell>{info.Mpdinfo.bandwidth}</TableCell>
                            <TableCell>{info.Mpdinfo.codecs}</TableCell>
                            <TableCell>{info.Mpdinfo.mimeType}</TableCell>
                            <TableCell>{info.Mpdinfo.height ?? '--'}</TableCell>
                            <TableCell>{info.Mpdinfo.width ?? '--'}</TableCell>
                            <TableCell>
                                {info.Mpdinfo.frameRate ?? '--'}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Box>
    );
}

export default MPDInformationTable;
