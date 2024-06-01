import { Outlet } from 'react-router-dom';

import NavBar from './components/nav-bar/NavBar';

export default function App() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <NavBar></NavBar>
      <Outlet></Outlet>
    </div>
  );
}
