import { Outlet } from 'react-router-dom';

import NavBar from './components/nav-bar/NavBar';
import { EnvContext } from './env.context';

import './app.scss';

export default function App() {
    return (
        <EnvContext.Provider
            value={{
                backendUrl:
                    import.meta.env.VITE_BACKEND_URL || 'http://localhost:3003',
            }}
        >
            <div className={'qoe-metrics-dashboard'}>
                <NavBar></NavBar>
                <Outlet></Outlet>
            </div>
        </EnvContext.Provider>
    );
}
