import { createTheme } from '@mui/material';

export const theme = createTheme({
  typography: {
    fontFamily: 'Roboto',
  },
  palette: {
    primary: {
      main: '#0F4776',
      light: '#A5D0F3',
    },
    background: {
      paper: '#fff',
      default: '#faf9f6',
    },
    text: {
      primary: '#0b1215',
    },
  },
});
