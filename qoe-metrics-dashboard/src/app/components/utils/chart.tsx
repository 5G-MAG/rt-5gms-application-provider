import dayjs from "dayjs";

export function TypographyTick(props: {
    payload: { value: string };
    x: number;
    y: number;
  }) {
    const { payload, x, y } = props;
    return (
      <g transform={`translate(${x},${y})`}>
        <text fontSize={10} x={0} y={0} dy={4} textAnchor="end" fill="#666">
          {payload.value}
        </text>
      </g>
    );
  }
  
export function XAxisTick(props: {
  payload: { value: string };
  x: number;
  y: number;
})  {
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

