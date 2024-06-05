import { Link, useLocation } from 'react-router-dom';

import { AppBar, Box, Container, Toolbar, useTheme } from '@mui/material';
import { styled } from '@mui/material/styles';

import logo from '../../../assets/Logo_5G_MAG.png';

import './NavBar.scss';

const pages = [
  { label: 'Metrics Reports', route: '/metrics' },
  { label: 'Consumption Reports', route: '/consumption' },
];

const CustomNavLink = styled(Link, {
  name: 'MuiCustomNavLink',
  slot: 'root',
  shouldForwardProp: (prop) => prop !== 'isActive',
})<{ isActive: boolean }>(({ theme, isActive }) => ({
  padding: '1rem',
  textDecoration: 'none',
  color: theme.palette.background.default,
  textTransform: 'uppercase',
  fontFamily: 'Roboto',
  fontSize: 'smaller',
  ...(isActive && {
    background: theme.palette.background.default,
    color: theme.palette.text.primary,
    borderRadius: '2rem',
  }),
}));

function NavBar() {
  const theme = useTheme();
  const location = useLocation();

  return (
    <AppBar position="static" sx={{ height: '5rem' }}>
      <Container maxWidth="xl" sx={{ height: '5rem' }}>
        <Toolbar disableGutters sx={{ height: '5rem' }}>
          <Box
            sx={{
              flexGrow: 1,
              display: { xs: 'none', md: 'flex' },
              gap: '1rem',
            }}
          >
            {pages.map((page) => (
              <CustomNavLink
                key={page.route}
                to={page.route}
                isActive={location.pathname === page.route}
              >
                {page.label}
              </CustomNavLink>
            ))}
          </Box>
          <Box
            sx={{
              background: theme.palette.background.default,
              padding: '0.5rem',
              borderRadius: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img src={logo} className="logo" alt="The 5G MAG logo"></img>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}

export default NavBar;
