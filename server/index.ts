import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import Message from './models/message.js';
import Nickname from './models/nickname.js';

import registerChannelHandlers from './socket-handlers/channels.js';
import registerUserHandlers from './socket-handlers/users.js';
import registerMessageHandlers from './socket-handlers/messages.js';

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});


// Connexion MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongo:27017/chatDB';
await mongoose.connect(MONGO_URI, {
});


// Configurer Express pour servir les fichiers statiques
app.use(express.static('public'));

// Rediriger la racine `/` vers `index.html`
/*app.get('/', (req, res) => {
    res.sendFile('index.html', { root: './public' });
});*/

// Charger les gestionnaires Socket.IO
io.on('connection', async (socket) => {
    // Vérifier si le socket est déjà associé à un utilisateur connecté
    const existingUser = await Nickname.findOne({ 
        socketId: socket.id,
        isConnected: true 
    });
    
    if (existingUser) {
        // Si oui, on met à jour son statut
        await Nickname.findOneAndUpdate(
            { socketId: socket.id },
            { 
                isConnected: false,
                lastDisconnect: new Date()
            }
        );
    }

    registerUserHandlers(io, socket);
    registerMessageHandlers(io, socket);

    // Enregistrer les gestionnaires de channels
    socket.on('create_channel', (channelName) => registerChannelHandlers.createChannel(io, socket, channelName));
    socket.on('list_channels', (keyword) => registerChannelHandlers.listChannels(io, socket, keyword));
    socket.on('join_channel', (channelName) => registerChannelHandlers.joinChannel(io, socket, channelName));
    socket.on('quit_channel', (channelName) => registerChannelHandlers.quitChannel(io, socket, channelName));
    socket.on('delete_channel', (channelName) => registerChannelHandlers.deleteChannel(io, socket, channelName));

    socket.on('disconnect', () => {
        // La déconnexion est déjà gérée dans registerUserHandlers
    });
});

// Lancer le serveur
const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
