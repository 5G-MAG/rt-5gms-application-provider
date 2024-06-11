import { render } from '@testing-library/react';

import MetricTypeIcon from './metric-type-icon';

describe('MetricTypeIcon', () => {
    it('should render successfully', () => {
        const { baseElement } = render(<MetricTypeIcon/>);
        expect(baseElement).toBeTruthy();
    });
});
