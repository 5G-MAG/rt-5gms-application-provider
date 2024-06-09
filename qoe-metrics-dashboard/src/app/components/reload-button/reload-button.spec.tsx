import { render } from '@testing-library/react';

import ReloadButton from './reload-button';

describe('ReloadButton', () => {
    it('should render successfully', () => {
        const { baseElement } = render(<ReloadButton />);
        expect(baseElement).toBeTruthy();
    });
});
