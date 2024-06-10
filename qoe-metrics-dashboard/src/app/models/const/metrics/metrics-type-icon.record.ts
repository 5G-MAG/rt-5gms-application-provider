import { green, lightBlue, orange, purple } from '@mui/material/colors';
import { EMetricsType } from '../../enums/metrics/metrics-type.enum';

interface IMetricsTypeIcon {
    /**
     * The icon name
     */
    iconName: string;

    /**
     * The background color of the icon
     */
    backgroundColor: string;

    /**
     * The tooltip title
     */
    title: string;
}

export const metricsTypeIcon: Record<EMetricsType, IMetricsTypeIcon> = {
    [EMetricsType.BUFFER_LEVEL]: { iconName: 'downloading', backgroundColor: green[500], title: 'Buffer Level' },
    [EMetricsType.HTTP_LIST]: { iconName: 'http', backgroundColor: purple[500], title: 'Http List' },
    [EMetricsType.MPD_INFORMATION]: { iconName: 'spatial_audio', backgroundColor: orange[500], title: 'MPD(Music Player Daemon) Information' },
    [EMetricsType.REP_SWITCH_LIST]: { iconName: 'router', backgroundColor: lightBlue[500], title: 'Report Switch List' },
}
