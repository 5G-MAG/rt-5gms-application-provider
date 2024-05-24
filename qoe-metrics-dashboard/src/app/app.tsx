import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import NavBar from './components/nav-bar/NavBar';

export default function App() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('metrics');
  }, [navigate]);

  return (
    <div>
      <NavBar></NavBar>
      <Outlet></Outlet>
    </div>
  );
}
