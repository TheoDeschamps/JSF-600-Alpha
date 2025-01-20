import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

import { io } from "socket.io-client";

const socket = io("http://localhost:8000"); // Connect to the server

socket.on("connect", () => {
    console.log("Connected to server"); // Log a message when connected
});

export { socket }; // Export the socket object to be used in other files

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);