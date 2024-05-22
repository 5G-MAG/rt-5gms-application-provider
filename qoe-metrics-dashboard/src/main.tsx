import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';

import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import Overview from './app/pages/overview/Overview';
import DetailPage from './app/pages/detailPage/DetailPage';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Overview></Overview>,
  },
  {
    path: '/:metricsId',
    element: <DetailPage></DetailPage>,
  },
]);

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
