import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import { availableParallelism } from 'node:os';
import cluster from 'node:cluster';
import { createAdapter, setupPrimary } from '@socket.io/cluster-adapter';
// Connexion à MongoDB
const connectDB = async () => {
    try {
        const mongoURL = process.env.DOCKER_ENV
            ? 'mongodb://mongo:27017/chatDB'
            : 'mongodb://127.0.0.1:27017/chatDB';
        await mongoose.connect(mongoURL, {
            // @ts-ignore
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('MongoDB connected');
    }
    catch (err) {
        console.error('MongoDB connection failed:', err);
        process.exit(1);
    }
};
await connectDB();
// Modèle MongoDB pour les messages
const messageSchema = new mongoose.Schema({
    message: { type: String, required: true },
}, { timestamps: true });
const Message = mongoose.model('Message', messageSchema);
if (cluster.isPrimary) {
    const numCPUs = availableParallelism();
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork({ PORT: 8000 + i });
    }
    setupPrimary();
}
else {
    const app = express();
    const server = createServer(app);
    const io = new Server(server, {
        cors: {
            origin: "http://localhost:3000",
        },
        adapter: createAdapter(),
    });
    app.get('/api/messages', async (req, res) => {
        try {
            const messages = await Message.find();
            res.json(messages);
        }
        catch (error) {
            console.error('Error fetching messages:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
    io.on('connection', async (socket) => {
        console.log('A user connected');
        try {
            const messages = await Message.find();
            socket.emit('messages', messages);
        }
        catch (error) {
            console.error('Error fetching messages:', error);
        }
        socket.on('chat message', async (msg) => {
            console.log('Received message:', msg); // Log du message reçu
            try {
                if (!msg || typeof msg.message !== 'string') {
                    throw new Error('Invalid message format');
                }
                const message = new Message({ message: msg.message });
                await message.save();
                io.emit('chat message', message);
            }
            catch (error) {
                console.error('Error saving message:', error);
            }
        });
        socket.on('disconnect', () => {
            console.log('A user disconnected');
        });
    });
    const port = process.env.PORT || 8000;
    server.listen(port, () => {
        console.log(`Server running at http://localhost:${port}`);
    });
}
