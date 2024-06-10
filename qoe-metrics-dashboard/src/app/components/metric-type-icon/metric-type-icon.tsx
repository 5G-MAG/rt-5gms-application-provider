import { Icon, Tooltip } from '@mui/material';
import { styled } from '@mui/material/styles';
import React from 'react';
import { metricsTypeInformation } from '../../models/const/metrics/metrics-type-icon.record';
import { EMetricsType } from '../../models/enums/metrics/metrics-type.enum';

/**
 * Props for the MetricTypeIcon component
 */
interface MetricTypeIconProps {
    metricType: EMetricsType;
}

const StyleIcon = styled(Icon)(({ theme }) => ({
    color: theme.palette.primary.main,
    fontSize: '1.5rem',
    padding: '0.5rem',
    marginInline: '0.5rem',
    background: theme.palette.background.default,
    borderRadius: '0.5rem'
}));

/**
 * Allows to represent a metric based on its metric type by an icon
 *
 * @param props
 * @constructor
 */
export function MetricTypeIcon(props: MetricTypeIconProps) {
    return (
        <Tooltip title={metricsTypeInformation[props.metricType].title}>
            <StyleIcon style={{ background: metricsTypeInformation[props.metricType].backgroundColor, color: 'white' }}>
                {metricsTypeInformation[props.metricType].iconName}
            </StyleIcon>
        </Tooltip>
    );
}

export default MetricTypeIcon;
