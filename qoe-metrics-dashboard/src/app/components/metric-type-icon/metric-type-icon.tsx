import React from 'react';

import { Tooltip } from '@mui/material';

import { metricsTypeInformation } from '../../models/const/metrics/metrics-type-icon.record';
import { EMetricsType } from '../../models/enums/metrics/metrics-type.enum';

/**
 * Props for the MetricTypeIcon component
 */
interface MetricTypeIconProps {
    metricType: EMetricsType;
}

/**
 * Allows to represent a metric based on its metric type by an icon
 *
 * @param props
 * @constructor
 */
export function MetricTypeIcon(props: MetricTypeIconProps) {
    return (
        <Tooltip title={metricsTypeInformation[props.metricType].title}>
            {metricsTypeInformation[props.metricType].icon({
                style: {
                    background:
                        metricsTypeInformation[props.metricType]
                            .backgroundColor,
                    color: 'white',
                    fontSize: '1.5rem',
                    padding: '0.5rem',
                    marginInline: '0.5rem',
                    borderRadius: '0.5rem',
                },
            })}
        </Tooltip>
    );
}

export default MetricTypeIcon;
