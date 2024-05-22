import React from 'react';
import { Outlet } from 'react-router-dom';
import NavBar from './components/nav-bar/NavBar';

export default function App() {
  return (
    <div>
      <NavBar></NavBar>
      <Outlet></Outlet>
    </div>
  );
}
