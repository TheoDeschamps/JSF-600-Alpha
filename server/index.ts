import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import Message from './models/message.js';

import registerChannelHandlers from './socket-handlers/channels.js';
import registerUserHandlers from './socket-handlers/users.js';
import registerMessageHandlers from './socket-handlers/messages.js';

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: { origin: '*' },
});

// Connexion MongoDB
await mongoose.connect('mongodb://127.0.0.1:27017/chatDB');

// Configurer Express pour servir les fichiers statiques
app.use(express.static('public'));

// Rediriger la racine `/` vers `index.html`
app.get('/', (req, res) => {
    res.sendFile('index.html', { root: './public' });
});

// Charger les gestionnaires Socket.IO
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    registerUserHandlers(io, socket);
    registerMessageHandlers(io, socket);

    // Enregistrer les gestionnaires de channels
    socket.on('create_channel', (channelName) => registerChannelHandlers.createChannel(io, socket, channelName));
    socket.on('list_channels', (keyword) => registerChannelHandlers.listChannels(io, socket, keyword));
    socket.on('join_channel', (channelName) => registerChannelHandlers.joinChannel(io, socket, channelName));
    socket.on('quit_channel', (channelName) => registerChannelHandlers.quitChannel(io, socket, channelName));
    socket.on('delete_channel', (channelName) => registerChannelHandlers.deleteChannel(io, socket, channelName));

    // Déconnexion
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
    });
});

// Lancer le serveur
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
