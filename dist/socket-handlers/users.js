import Nickname from '../models/nickname.js';
import Message from '../models/message.js';
// Map global pour stocker les pseudonymes des utilisateurs
export const nicknames = new Map();
export default function registerUserHandlers(io, socket) {
    // Lister les utilisateurs dans un channel spécifique
    socket.on('users', (channelName) => {
        listUsers(io, socket, channelName);
    });
    // Supprimer un utilisateur d'un channel
    socket.on('remove_user_from_channel', ({ channelName, nickname }) => {
        if (!channelName || !nickname) {
            socket.emit('error', 'Channel name and nickname are required');
            return;
        }
        const clientIdToRemove = Array.from(nicknames.entries())
            .find(([id, nick]) => nick === nickname)?.[0];
        if (clientIdToRemove) {
            const clientSocket = io.sockets.sockets.get(clientIdToRemove);
            clientSocket?.leave(channelName);
            io.to(channelName).emit('user_removed', `${nickname} was removed from ${channelName}`);
        }
        else {
            socket.emit('error', 'User not found in the channel');
        }
    });
    // Définir ou mettre à jour le pseudonyme d'un utilisateur
    socket.on('nick', async (nickname) => {
        if (!nickname || nickname.trim() === '') {
            socket.emit('error', 'Nickname cannot be empty');
            return;
        }
        if ([...nicknames.values()].includes(nickname)) {
            socket.emit('error', 'Nickname is already in use');
            return;
        }
        try {
            await Nickname.findOneAndUpdate({ socketId: socket.id }, { nickname }, { upsert: true, new: true });
            nicknames.set(socket.id, nickname);
            socket.emit('nick_success', `Your nickname has been set to: ${nickname}`);
        }
        catch (err) {
            socket.emit('error', 'Failed to save nickname');
        }
    });
    // Gérer la déconnexion d'un utilisateur
    socket.on('disconnect', () => {
        const nickname = nicknames.get(socket.id) || 'Anonymous';
        nicknames.delete(socket.id);
        console.log(`User disconnected: ${nickname} (ID: ${socket.id})`);
    });
}
// Fonction : Lister les utilisateurs d'un channel
export function listUsers(io, socket, channelName) {
    if (!channelName || channelName.trim() === '') {
        socket.emit('error', 'Channel name cannot be empty');
        return;
    }
    const users = Array.from(io.sockets.adapter.rooms.get(channelName) || [])
        .map((clientId) => nicknames.get(clientId) || `User ${clientId}`);
    socket.emit('users_list', users);
}
// Fonction : Envoyer un message privé
export async function handlePrivateMessage(io, socket, toNickname, ...content) {
    if (!toNickname || !content.length) {
        socket.emit('error', 'Invalid private message');
        return;
    }
    const sender = nicknames.get(socket.id);
    const recipientSocketId = Array.from(nicknames.entries())
        .find(([id, nick]) => nick === toNickname)?.[0];
    if (!recipientSocketId) {
        socket.emit('error', `Recipient not found: ${toNickname}`);
        return;
    }
    const privateChannelName = `private-${[sender, toNickname].sort().join('-')}`;
    try {
        socket.join(privateChannelName);
        io.to(recipientSocketId).socketsJoin(privateChannelName);
        const message = new Message({
            content: content.join(' '),
            nickname: sender,
            channel: privateChannelName,
        });
        await message.save();
        socket.emit('private_message', { content: content.join(' '), to: toNickname, from: sender });
        io.to(recipientSocketId).emit('private_message', { content: content.join(' '), from: sender });
    }
    catch (err) {
        socket.emit('error', 'Failed to send private message');
    }
}
