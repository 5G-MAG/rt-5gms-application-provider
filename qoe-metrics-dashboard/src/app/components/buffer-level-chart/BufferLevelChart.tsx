import dayjs from 'dayjs';
import {
  CartesianGrid,
  Label,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BufferLevel } from 'src/app/types/qoe-report.type';

import { Box, Typography, useTheme } from '@mui/material';

function BufferLevelChart({
  bufferLevel,
}: {
  bufferLevel: BufferLevel | undefined;
}) {
  const theme = useTheme();

  if (!bufferLevel) {
    return <Box>No data</Box>;
  }

  const data = bufferLevel.BufferLevelEntry.map((entry) => ({
    level: Number(entry.level),
    datetime: new Date(entry.t).getTime(),
  }));

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
        Buffer Level
      </Typography>
      <ResponsiveContainer minHeight={500} minWidth={200}>
        <LineChart
          data={data}
          width={500}
          height={1000}
          margin={{ top: 0, bottom: 20, left: 20, right: 20 }}
        >
          <CartesianGrid />
          <XAxis
            dataKey="datetime"
            tick={<XAxisTick></XAxisTick>}
            height={80}
            allowDuplicatedCategory={true}
            angle={10}
            padding={{ right: 40 }}
            type="number"
            domain={['auto', 'auto']}
            scale={'time'}
          >
            <Label
              value="Datetime"
              position="bottom"
              style={{ textAnchor: 'middle' }}
            />
          </XAxis>

          <YAxis tick={<TypographyTick></TypographyTick>}>
            <Label
              value="Buffer Level"
              position="insideLeft"
              angle={-90}
              offset={-10}
              style={{ textAnchor: 'middle' }}
            />
          </YAxis>
          <Line
            type="linear"
            dataKey="level"
            stroke={theme.palette.primary.main}
          />
          <Tooltip
            position={{ y: 0 }}
            labelFormatter={(name) =>
              'Datetime: ' + dayjs(name).format('YYYY-MM-DD HH:mm:ss:SSS')
            }
            formatter={(value, name, props) => [value, 'Duration in ms']}
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
}

export default BufferLevelChart;

// type is not exported
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function XAxisTick(props: any) {
  const { x, y, payload } = props;

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={16}
        textAnchor="end"
        fill="#666"
        transform="rotate(-65)"
        fontSize={10}
      >
        {dayjs(payload.value).format('HH:mm:ss:SSS')}
      </text>
    </g>
  );
}

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
