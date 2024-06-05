import { Outlet } from 'react-router-dom';
import { EnvContext } from './env.context';

import NavBar from './components/nav-bar/NavBar';

import './app.scss';

export default function App() {

  return (
      <EnvContext.Provider value={{backendUrl: import.meta.env.VITE_BACKEND_URL || 'localhost:3003'}}>
    <div className={"qoe-metrics-dashboard"}>
      <NavBar></NavBar>
      <Outlet></Outlet>
    </div>
      </EnvContext.Provider>
  );
}
