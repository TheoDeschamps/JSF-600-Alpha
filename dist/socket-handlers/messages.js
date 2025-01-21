import { handleCommand } from './commandHandlers.js';
import { nicknames } from './users.js';
import Message from '../models/message.js';
import Channel from '../models/channel.js'; // Import pour les channels
export default function registerMessageHandlers(io, socket) {
    // Gestion de l'envoi des messages
    socket.on('message', async ({ content, channel = 'general' }) => {
        if (content.startsWith('/')) {
            // Gestion des commandes via commandHandlers
            const [command, ...args] = content.split(' ');
            handleCommand(io, socket, command, args);
        }
        else {
            // Validation du contenu du message
            if (!content || content.trim() === '') {
                socket.emit('error', 'Message cannot be empty');
                return;
            }
            // Récupération du pseudonyme
            const nickname = nicknames.get(socket.id) || 'Anonymous';
            try {
                // Sauvegarder le message dans MongoDB
                const message = new Message({ content, channel, nickname });
                await message.save();
                // Diffuser le message à tous les utilisateurs du channel
                io.to(channel).emit('new_message', {
                    content,
                    nickname,
                    channel,
                    createdAt: message.createdAt,
                });
            }
            catch (error) {
                console.error('Error saving message:', error);
                socket.emit('error', 'Failed to save message');
            }
        }
    });
    // Gestion de la récupération de l’historique des messages
    socket.on('messages', async (channelName) => {
        if (!channelName || channelName.trim() === '') {
            socket.emit('error', 'Channel name cannot be empty');
            return;
        }
        try {
            const messages = await Message.find({ channel: channelName })
                .sort({ createdAt: 1 }) // Trier les messages par date croissante
                .exec();
            socket.emit('channel_messages', messages); // Envoyer l’historique au client
        }
        catch (error) {
            console.error('Error retrieving messages:', error);
            socket.emit('error', 'Failed to retrieve messages');
        }
    });
    // Gestion de l'envoi des messages privés
    socket.on('private_message', async ({ toNickname, content }) => {
        const sender = nicknames.get(socket.id);
        const recipientRecord = await Channel.findOne({ name: `private-${[sender, toNickname].sort().join('-')}` });
        const recipientSocketId = Array.from(nicknames.entries())
            .find(([id, nick]) => nick === toNickname)?.[0];
        if (!recipientRecord && !recipientSocketId) {
            socket.emit('error', `Recipient not found: ${toNickname}`);
            return;
        }
        const privateChannelName = `private-${[sender, toNickname].sort().join('-')}`; // Nom unique pour le channel privé
        try {
            // Vérifier ou créer le channel privé
            if (!recipientRecord) {
                const privateChannel = new Channel({ name: privateChannelName });
                await privateChannel.save();
            }
            // Sauvegarder le message dans MongoDB avec le channel privé
            const message = new Message({
                content,
                nickname: sender,
                channel: privateChannelName,
            });
            await message.save();
            // Ajouter les utilisateurs au channel privé
            socket.join(privateChannelName);
            if (recipientSocketId) {
                io.to(recipientSocketId).socketsJoin(privateChannelName);
            }
            // Envoyer le message aux deux utilisateurs
            socket.emit('private_message', { content, to: toNickname, from: sender });
            if (recipientSocketId) {
                io.to(recipientSocketId).emit('private_message', { content, from: sender });
            }
        }
        catch (err) {
            console.error('Error saving private message:', err);
            socket.emit('error', 'Failed to send private message');
        }
    });
}
