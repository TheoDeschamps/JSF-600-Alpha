import { MongoError } from "mongodb";
import { nicknames } from './users.js';
import Message from "../models/message.js";
export default function registerMessageHandlers(io, socket) {
    // Envoyer un message dans un channel
    socket.on('message', async ({ channel, content, client_offset }) => {
        try {
            const nickname = nicknames.get(socket.id); // Récupérer le nickname depuis le Map
            const message = new Message({
                content,
                channel,
                nickname,
                client_offset,
            });
            await message.save();
            io.to(channel).emit('new_message', {
                content,
                nickname,
                createdAt: message.createdAt,
            });
        }
        catch (e) {
            if (e instanceof MongoError && e.code === 11000) {
                console.log('Duplicate message ignored');
            }
        }
    });
    // Récupérer l'historique des messages
    socket.on('messages', async (channelName) => {
        try {
            const messages = await Message.find({ channel: channelName })
                .sort({ createdAt: 1 })
                .exec();
            socket.emit('channel_messages', messages);
        }
        catch (err) {
            console.error('Error retrieving messages:', err);
        }
    });
    // Envoyer un message privé
    socket.on('private_message', ({ toNickname, content }) => {
        const recipient = Array.from(io.sockets.sockets).find(([clientId]) => nicknames.get(clientId) === toNickname);
        if (recipient) {
            recipient[1].emit('private_message', {
                content,
                from: nicknames.get(socket.id), // Récupérer le nickname de l'expéditeur depuis le Map
            });
        }
    });
    // Gestion de la déconnexion (optionnel)
    socket.on('disconnect', () => {
        nicknames.delete(socket.id); // Supprimer le nickname associé à ce socket.id
        console.log(`User disconnected: ${socket.id}`);
    });
}
