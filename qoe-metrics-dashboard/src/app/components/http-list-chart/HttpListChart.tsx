import { useEffect, useRef, useState } from 'react'; // Added useRef
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
import { HttpList } from 'src/app/types/qoe-report.type';

import { Box, Typography } from '@mui/material';

import { graphColors } from '../../../theme';

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
            setScatterisibility((prev) => ({ ...prev, [entry.type]: true }));
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
            type="number"
            domain={['auto', 'auto']}
            tick={<TypographyTick></TypographyTick>}
          >
            <Label
              value="Duration in ms"
              position="bottom"
              style={{ textAnchor: 'middle' }}
            ></Label>
          </XAxis>
          <YAxis
            dataKey="transferedBytes"
            type="number"
            domain={['auto', 'auto']}
            tick={<TypographyTick></TypographyTick>}
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
              return [
                value + ' bytes',
                name.charAt(0).toUpperCase() +
                  name.replace(/([A-Z])/g, ' $1').slice(1),
              ];
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
          />
          {Object.entries(dataByTypeRef.current).map(([type, data], index) => (
            <Scatter
              key={type}
              name={type}
              data={data}
              fill={graphColors[index % graphColors.length]}
              hide={!scatterVisibility[type]}
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
