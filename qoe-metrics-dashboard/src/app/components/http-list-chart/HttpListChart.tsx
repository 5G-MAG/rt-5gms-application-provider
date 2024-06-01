import { useEffect, useRef, useState } from 'react'; // Added useRef
import dayjs from 'dayjs';
import {
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { HttpList } from 'src/app/types/qoe-report.type';

import { Box, Typography, useTheme } from '@mui/material';

function HttpListChart({ httpList }: { httpList: HttpList | undefined }) {
  const theme = useTheme();
  const [seriesVisibility, setSeriesVisibility] = useState<
    Record<string, boolean>
  >({});

  type DataPoint = {
    duration: number;
    transferedBytes: number;
  };

  const dataByTypeRef = useRef<Record<string, DataPoint[]>>({});

  useEffect(() => {
    // Added useEffect to handle setting series visibility
    if (httpList) {
      dataByTypeRef.current = httpList.HttpListEntry.reduce(
        (acc: Record<string, DataPoint[]>, entry) => {
          if (!acc[entry.type]) {
            acc[entry.type] = [];
            setSeriesVisibility((prev) => ({ ...prev, [entry.type]: true }));
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
  }, [httpList]); // Added dependency array to useEffect

  const fillColors = [
    '#8884d8',
    '#ff7300',
    '#82ca9d',
    '#ff0000',
    '#00ff00',
    '#0000ff',
    '#ff00ff',
  ];

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
        <ScatterChart>
          <XAxis
            dataKey="duration"
            type="number"
            domain={['auto', 'auto']}
            tick={<TypographyTick></TypographyTick>}
          />
          <YAxis
            dataKey="transferedBytes"
            type="number"
            domain={['auto', 'auto']}
            tick={<TypographyTick></TypographyTick>}
          />
          <Tooltip />
          <Legend
            onClick={(e: { value: string }) => {
              console.log(e);
              setSeriesVisibility({
                ...seriesVisibility,
                [e.value]: !seriesVisibility[e.value],
              });
            }}
          />
          <CartesianGrid strokeDasharray="3 3" />
          {Object.entries(dataByTypeRef.current).map(([type, data], index) => (
            <Scatter
              key={type}
              name={type}
              data={data}
              fill={fillColors[index % fillColors.length]}
              hide={!seriesVisibility[type]}
            />
          ))}
        </ScatterChart>
      </ResponsiveContainer>
    </Box>
  );
}

export default HttpListChart;

// type is not exported
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TypographyTick(props: any) {
  const { payload, x, y } = props;
  return (
    <g transform={`translate(${x},${y})`}>
      <text fontSize={10} x={0} y={0} dy={4} textAnchor="end" fill="#666">
        {payload.value}
      </text>
    </g>
  );
}
