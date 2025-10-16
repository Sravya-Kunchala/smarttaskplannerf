import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // Assuming you have a CSS file for basic styling/Tailwind setup
import App from './SmartTaskPlanner'; // Importing the main component

// Use ReactDOM.createRoot for React 18+
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
