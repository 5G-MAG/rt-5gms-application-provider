import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';
import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
} from 'react-router-dom';

import { ThemeProvider } from '@mui/material';

import App from './app/app';
import DetailPage from './app/pages/detail-page/DetailPage';
import Overview from './app/pages/overview/Overview';
import { theme } from './theme';

import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App></App>,
    children: [
      {
        path: '',
        index: true,
        element: <Navigate to="metrics" replace />,
      },
      {
        path: 'metrics',
        element: <Overview></Overview>,
      },
      {
        path: 'metrics/:metricsId',
        element: <DetailPage></DetailPage>,
      },
      {
        path: 'consumption',
        element: <Overview></Overview>,
      },
      {
        path: 'consumption/:consumptionId',
        element: <DetailPage></DetailPage>,
      },
    ],
  },
]);

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <RouterProvider router={router} />
    </ThemeProvider>
  </StrictMode>
);
