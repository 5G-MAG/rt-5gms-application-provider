import { createContext } from 'react';

import { IEnv } from './models/types/app/env.interface';

export const EnvContext = createContext<
    IEnv
>(
    {
        backendUrl: 'http://localhost:3003'
    }
);
