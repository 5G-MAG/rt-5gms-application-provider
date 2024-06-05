import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';

import NavBar from './components/nav-bar/NavBar';

export default function App() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('metrics');
  }, [navigate]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <NavBar></NavBar>
      <Outlet></Outlet>
    </div>
  );
}
