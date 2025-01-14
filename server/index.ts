import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import Message from './models/message.js'; // Import correct du modèle


const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: { origin: '*' }, // Permettre les connexions depuis n'importe quelle origine
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
import './models/message.js';
import registerChannelHandlers from './socket-handlers/channels.js';
import registerUserHandlers from './socket-handlers/users.js';
import registerMessageHandlers from './socket-handlers/messages.js';

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Enregistrer les gestionnaires
    registerUserHandlers(io, socket);
    registerChannelHandlers(io, socket);
    registerMessageHandlers(io, socket);

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
