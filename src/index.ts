import express from 'express';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import { availableParallelism } from 'node:os';
import cluster from 'node:cluster';
import { createAdapter, setupPrimary } from '@socket.io/cluster-adapter';

// Connexion à MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect('mongodb://mongo:27017/chatDB', {
        // @ts-ignore
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('MongoDB connected');
    } catch (err) {
        console.error('MongoDB connection failed:', err);
        process.exit(1);
    }
};

await connectDB();

// Définition du modèle MongoDB pour les messages
const messageSchema = new mongoose.Schema({
    client_offset: { type: String, unique: true },
    content: String,
    createdAt: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', messageSchema);

if (cluster.isPrimary) {
    const numCPUs = availableParallelism();
    // Créer un worker par cœur disponible
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork({
            PORT: 3000 + i
        });
    }

    // Configurer l'adapter sur le thread principal
    setupPrimary();
} else {
    const app = express();
    const server = createServer(app);
    const io = new Server(server, {
        connectionStateRecovery: {},
        // Configurer l'adapter sur chaque worker
        adapter: createAdapter()
    });

    const __dirname = dirname(fileURLToPath(import.meta.url));

    app.get('/', (req, res) => {
        res.sendFile(join(__dirname, '../public/index.html'));
    });

    io.on('connection', async (socket) => {
        console.log('a user connected');
        socket.on('chat message', async (msg, clientOffset, callback) => {
            console.log('message: ' + msg);
            try {
                const message = new Message({ content: msg, client_offset: clientOffset });
                await message.save();
                io.emit('chat message', msg);
                callback();
            } catch (e) {
                // @ts-ignore
                if (e.code === 11000) { // Duplicate key error (client_offset unique violation)
                    callback();
                }
            }
        });

        if (!socket.recovered) {
            try {
                const messages = await Message.find({
                    _id: { $gt: socket.handshake.auth.serverOffset ? new mongoose.Types.ObjectId(socket.handshake.auth.serverOffset) : new mongoose.Types.ObjectId(0) }
                }).exec();
                messages.forEach((row) => {
                    socket.emit('chat message', row.content, row._id);
                });
            } catch (e) {
                console.error('Error retrieving missed messages:', e);
            }
        }

        socket.on('disconnect', () => {
            console.log('user disconnected');
        });
    });

    const port = process.env.PORT;

    server.listen(port, () => {
        console.log(`Server running at http://localhost:${port}`);
    });
}

