import { useEffect, useRef, useState } from 'react';
import {
    CartesianGrid,
    Label,
    Legend,
    ResponsiveContainer,
    Scatter,
    ScatterChart,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

import { Box, Typography } from '@mui/material';

import { graphColors } from '../../../theme';
import { HttpList } from '../../models/types/metrics/qoe-report.type';
import { TypographyTick } from '../utils/chart';

type DataPoint = {
    duration: number;
    transferedBytes: number;
};

type TypeDataPoint = Record<string, DataPoint[]>;

function HttpListChart({ httpList }: { httpList: HttpList | undefined }) {
    const [scatterVisibility, setScatterisibility] = useState<
        Record<string, boolean>
    >({});

    const dataByTypeRef = useRef<TypeDataPoint>({});

    useEffect(() => {
        if (httpList) {
            dataByTypeRef.current = httpList.HttpListEntry.reduce(
                (acc: TypeDataPoint, entry) => {
                    if (!acc[entry.type]) {
                        acc[entry.type] = [];
                        setScatterisibility((prev) => ({
                            ...prev,
                            [entry.type]: true,
                        }));
                    }

                    acc[entry.type].push({
                        duration: Number(entry.Trace.d),
                        transferedBytes: Number(entry.Trace.b),
                    });
                    return acc;
                },
                {}
            );
        }
    }, [httpList]);

    if (!httpList) {
        return <Box>No data found for Http List</Box>;
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
                Http List
            </Typography>
            <ResponsiveContainer minHeight={500} minWidth={200}>
                <ScatterChart
                    width={500}
                    height={1000}
                    margin={{ top: 0, bottom: 20, left: 20, right: 20 }}
                >
                    <CartesianGrid strokeDasharray="3 3" />

                    <XAxis
                        dataKey="duration"
                        name="Duration"
                        type="number"
                        unit={'ms'}
                        domain={['auto', 'auto']}
                        tick={(args) => (
                            <TypographyTick {...args}></TypographyTick>
                        )}
                    >
                        <Label
                            value="Duration in ms"
                            position="bottom"
                            style={{ textAnchor: 'middle' }}
                        ></Label>
                    </XAxis>
                    <YAxis
                        dataKey="transferedBytes"
                        name="Transfered Bytes"
                        type="number"
                        unit={'bytes'}
                        domain={['auto', 'auto']}
                        tick={(args) => (
                            <TypographyTick {...args}></TypographyTick>
                        )}
                    >
                        <Label
                            value="Transferred Bytes"
                            position="insideLeft"
                            angle={-90}
                            offset={-10}
                            style={{ textAnchor: 'middle' }}
                        />
                    </YAxis>
                    <Tooltip
                        formatter={(value: string, name: string) => {
                            return [value, name];
                        }}
                    />

                    <Legend
                        verticalAlign="top"
                        onClick={(e: { value: string }) => {
                            setScatterisibility({
                                ...scatterVisibility,
                                [e.value]: !scatterVisibility[e.value],
                            });
                        }}
                        height={40}
                    />
                    {Object.entries(dataByTypeRef.current).map(
                        ([type, data], index) => (
                            <Scatter
                                key={type}
                                name={type}
                                data={data}
                                fill={graphColors[index % graphColors.length]}
                                hide={!scatterVisibility[type]}
                            />
                        )
                    )}
                </ScatterChart>
            </ResponsiveContainer>
        </Box>
    );
}

export default HttpListChart;
