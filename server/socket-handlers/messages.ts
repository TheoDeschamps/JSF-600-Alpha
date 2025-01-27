import { Server, Socket } from 'socket.io';
import { handleCommand } from './commandHandlers.js';
import { nicknames } from './users.js';
import Message from '../models/message.js';
import Channel from '../models/channel.js'; // Import pour les channels

export default function registerMessageHandlers(io: Server, socket: Socket) {
    // Gestion de l'envoi des messages
    socket.on('message', async ({ content, channel = 'general' }) => {
        if (content.startsWith('/')) {
            // Gestion des commandes via commandHandlers
            const [command, ...args] = content.split(' ');
            handleCommand(io, socket, command, args);
        } else {
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
            } catch (error) {
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
        } catch (error) {
            console.error('Error retrieving messages:', error);
            socket.emit('error', 'Failed to retrieve messages');
        }
    });

    // Gestion de l'envoi des messages privés
    socket.on('private_message', async ({ toNickname, content }) => {
        const sender = nicknames.get(socket.id); // Get sender's nickname

        if (!sender) {
            socket.emit('error', 'You must set a nickname with /nick first');
            return;
        }

        // Generate unique private channel name (alphabetical order to avoid duplicates)
        const privateChannelName = `private-${[sender, toNickname].sort().join('-')}`;

        try {
            // Check if the recipient exists
            const recipientSocketId = Array.from(nicknames.entries())
                .find(([id, nick]) => nick === toNickname)?.[0];

            if (!recipientSocketId) {
                socket.emit('error', `User "${toNickname}" is not online`);
                return;
            }

            // Create the private channel if it doesn't exist
            let channel = await Channel.findOne({ name: privateChannelName });
            if (!channel) {
                channel = new Channel({ name: privateChannelName });
                await channel.save();
            }

            // Add both users to the channel
            socket.join(privateChannelName);
            io.to(recipientSocketId).socketsJoin(privateChannelName);

            // Save the private message to MongoDB
            const message = new Message({
                content,
                channel: privateChannelName,
                nickname: sender,
                recipient: toNickname,
            });
            await message.save();

            // Broadcast the message to the private channel
            io.to(privateChannelName).emit('new_message', {
                content,
                nickname: sender,
                channel: privateChannelName,
                createdAt: message.createdAt,
            });
        } catch (err) {
            console.error('Error sending private message:', err);
            socket.emit('error', 'Failed to send private message');
        }
    });
}
