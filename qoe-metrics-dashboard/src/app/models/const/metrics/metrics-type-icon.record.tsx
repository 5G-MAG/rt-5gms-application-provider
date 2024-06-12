import { ReactJSXElement } from '@emotion/react/types/jsx-namespace';
import DescriptionIcon from '@mui/icons-material/Description';
import DownloadingIcon from '@mui/icons-material/Downloading';
import HttpIcon from '@mui/icons-material/Http';
import RouterIcon from '@mui/icons-material/Router';
import { green, lightBlue, orange, purple } from '@mui/material/colors';

import { EMetricsType } from '../../enums/metrics/metrics-type.enum';

interface IMetricsTypeIcon {
    /**
     * The icon
     */
    icon: (params: any) => ReactJSXElement;

    /**
     * The background color of the icon
     */
    backgroundColor: string;

    /**
     * The tooltip title
     */
    title: string;
}

/**
 * Map the metrics type to its respective informations f.e. icon name
 */
export const metricsTypeInformation: Record<EMetricsType, IMetricsTypeIcon> = {
    [EMetricsType.BUFFER_LEVEL]: {
        icon: (params) => <DownloadingIcon {...params}></DownloadingIcon>,
        backgroundColor: green[500],
        title: 'Buffer Level',
    },
    [EMetricsType.HTTP_LIST]: {
        icon: (params) => <HttpIcon {...params}></HttpIcon>,
        backgroundColor: purple[500],
        title: 'Http List',
    },
    [EMetricsType.MPD_INFORMATION]: {
        icon: (params) => <DescriptionIcon {...params}></DescriptionIcon>,
        backgroundColor: orange[500],
        title: 'MPD(Media Presentation Description) Information',
    },
    [EMetricsType.REP_SWITCH_LIST]: {
        icon: (params) => <RouterIcon {...params}></RouterIcon>,
        backgroundColor: lightBlue[500],
        title: 'Report Switch List',
    },
};
