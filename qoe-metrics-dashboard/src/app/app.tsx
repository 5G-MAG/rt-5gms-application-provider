import React from 'react';
import { Outlet } from 'react-router-dom';

export default function App() {
  return (
    <div>
      <div id="navigation-bar">NavBar tbd</div>
      <Outlet></Outlet>
    </div>
  );
}
