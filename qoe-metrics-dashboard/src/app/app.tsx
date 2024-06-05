import { Outlet } from 'react-router-dom';

import NavBar from './components/nav-bar/NavBar';

import './app.scss';

export default function App() {
  return (
    <div className={"qoe-metrics-dashboard"}>
      <NavBar></NavBar>
      <Outlet></Outlet>
    </div>
  );
}
