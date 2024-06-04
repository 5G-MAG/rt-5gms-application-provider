import { useState } from 'react';
import dayjs from 'dayjs';
import {
  CartesianGrid,
  Label,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { MPDInformation, RepSwitchList } from 'src/app/types/qoe-report.type';

import { Box, Typography, useTheme } from '@mui/material';

import { graphColors } from '../../../theme';

function RepSwitchesChart({
  repSwitchList,
  mpdInfo,
}: {
  repSwitchList: RepSwitchList | undefined;
  mpdInfo: MPDInformation[] | undefined;
}) {
  const [mimeTypeVisibility, setMimeTypeVisibility] = useState<
    Record<string, boolean>
  >({});

  if (!repSwitchList || !mpdInfo) {
    return <Box>No data</Box>;
  }

  const mimeTypes = [...new Set(mpdInfo.map((i) => i.Mpdinfo.mimeType))];

  const dataByMimeType: {
    [key: string]: { bandwidth: number; timestamp: number }[];
  } = {};

  repSwitchList.RepSwitchEvent.forEach((entry) => {
    const infoElement = mpdInfo.find(
      (info) => info.representationId === entry.to
    );
    if (!infoElement) return {};
    const bandwidth = infoElement.Mpdinfo.bandwidth;
    const elem = {
      bandwidth: Number(bandwidth),
      timestamp: new Date(entry.t).getTime(),
    };
    if (dataByMimeType[infoElement.Mpdinfo.mimeType]) {
      dataByMimeType[infoElement.Mpdinfo.mimeType].push(elem);
    } else {
      dataByMimeType[infoElement.Mpdinfo.mimeType] = [elem];
    }
  });

  const data: { [key: string]: number }[] = [];

  repSwitchList.RepSwitchEvent.forEach((event) => {
    const timestamp = new Date(event.t).getTime();
    let res = {
      timestamp,
    };
    if (data.find((e) => e.timestamp === timestamp)) {
      return;
    }
    Object.entries(dataByMimeType).forEach((entry) => {
      const [mimeType, entries] = entry;
      const filteredElems = entries.filter((e) => e.timestamp <= timestamp);
      filteredElems.sort((a, b) => b.timestamp - a.timestamp);
      const latestBandwidth = filteredElems[0].bandwidth;
      res = { ...res, [mimeType]: latestBandwidth };
    });
    data.push(res);
  });

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
      <ResponsiveContainer minHeight={500} minWidth={200}>
        <LineChart
          data={data}
          width={500}
          height={1000}
          margin={{ top: 0, bottom: 20, left: 20, right: 20 }}
        >
          <CartesianGrid />
          <XAxis
            dataKey="timestamp"
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
              value="Timestamp"
              position="bottom"
              style={{ textAnchor: 'middle' }}
            />
          </XAxis>

          <YAxis tick={<TypographyTick></TypographyTick>}>
            <Label
              value="Bandwidth in bit/s"
              position="insideLeft"
              angle={-90}
              offset={-10}
              style={{ textAnchor: 'middle' }}
            />
          </YAxis>
          {[...mimeTypes].map((mimeType, i) => (
            <Line
              key={mimeType.toString()}
              type="stepAfter"
              dataKey={mimeType}
              stroke={graphColors[i]}
              strokeWidth={3}
              hide={mimeTypeVisibility[mimeType]}
            />
          ))}
          <Tooltip
            position={{ y: 0 }}
            labelFormatter={(name) =>
              'Timestamp: ' + dayjs(name).format('YYYY-MM-DD HH:mm:ss:SSS')
            }
            formatter={(value, name, props) => [value, 'Bandwidth in bit/s']}
          />
          <Legend
            verticalAlign="top"
            onClick={(e: { value: string }) => {
              setMimeTypeVisibility({
                ...mimeTypeVisibility,
                [e.value]: !mimeTypeVisibility[e.value],
              });
            }}
            height={40}
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
}

export default RepSwitchesChart;

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
