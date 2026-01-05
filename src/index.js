import React from 'react';
import ReactDOM from 'react-dom/client';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NewOrder from './pages/NewOrder';
import 'bootstrap/dist/css/bootstrap.min.css';
import App from './App';
import "./style/index.css"
import { register } from './other/serviceWorker';
register();





const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
    {/* <Login /> */}
    {/* <Dashboard /> */}
    {/* <NewOrder /> */}
  </React.StrictMode>
);


