import { Server, Socket } from 'socket.io';
import Channel from '../models/channel.js';
import Message from '../models/message.js';
import User from '../models/user.js';
import { nicknames } from './users.js';

// Créer un channel
export async function createChannel(io: Server, socket: Socket, channelName: string) {
    if (!channelName || channelName.trim() === '') {
        socket.emit('error', 'Channel name cannot be empty');
        return;
    }

    try {
        const existingChannel = await Channel.findOne({ name: channelName });
        if (existingChannel) {
            socket.emit('error', 'Channel already exists');
            return;
        }

        const channel = new Channel({ name: channelName });
        await channel.save();

        // Rejoindre automatiquement le channel après sa création
        socket.join(channelName);
        const nickname = nicknames.get(socket.id);
        io.to(channelName).emit('user_joined', `${nickname} joined ${channelName}`);
        io.emit('channel_created', channelName);

    } catch (err) {
        console.error('Error creating channel:', err);
        socket.emit('error', 'Failed to create channel');
    }
}

// renamer un channel
export async function renameChannel(io: Server, socket: Socket, channelName: string, newChannelName: string) {
    if (!channelName || channelName.trim() === '' || !newChannelName || newChannelName.trim() === '') {
        socket.emit('error', 'Channel name cannot be empty');
        return;
    }

    try {
        const existingChannel = await Channel.findOne({ name: channelName });
        if (!existingChannel) {
            socket.emit('error', 'Channel not found');
            return;
        }

        existingChannel.name = newChannelName;
        await existingChannel.save();

        io.emit('channel_renamed', { oldName: channelName, newName: newChannelName });
    } catch (err) {
        console.error('Error renaming channel:', err);
        socket.emit('error', 'Failed to rename channel');
    }
}

// Lister les channels
export async function listChannels(io: Server, socket: Socket, keyword: string = '') {
    try {
        const channels = await Channel.find({ name: { $regex: keyword, $options: 'i' } }).exec();
        socket.emit('channels_list', channels.map((channel) => channel.name));
    } catch (err) {
        console.error('Error listing channels:', err);
        socket.emit('error', 'Failed to list channels');
    }
}

// Lister les utilisateurs
export async function listUsers(io: Server, socket: Socket, channelName: string) {
    if (!channelName || channelName.trim() === "") {
        socket.emit("error", "Channel name cannot be empty");
        return;
    }

    try {
        // 1. Get all users who have joined this channel (from DB)
        const usersInChannel = await User.find({ channels: channelName }).exec(); // Use "channels" array field

        // 2. Get online users in this channel (from Socket.IO room)
        const onlineSocketIds = Array.from(io.sockets.adapter.rooms.get(channelName) || []);
        const onlineUsers = await User.find({ socketId: { $in: onlineSocketIds } }).exec();

        // 3. Combine data: list nicknames with online status
        const userList = usersInChannel.map((user) => ({
            nickname: user.nickname,
            isConnected: onlineUsers.some((onlineUser) => onlineUser.nickname === user.nickname),
        }));

        // 4. Send simplified data to client
        socket.emit("users_list", userList);
    } catch (err) {
        console.error("Error listing users:", err);
        socket.emit("error", "Failed to list users");
    }
}

// Rejoindre un channel
export async function joinChannel(io: Server, socket: Socket, channelName: string) {
    if (!channelName || channelName.trim() === '') {
        socket.emit('error', 'Channel name cannot be empty');
        return;
    }

    const nickname = nicknames.get(socket.id);
    if (!nickname) {
        socket.emit('error', 'Nickname is required to join a channel');
        return;
    }

    try {
        // Ajouter l'utilisateur dans le channel au niveau de la base de données
        const existingUser = await User.findOne({ socketId: socket.id });

        if (existingUser) {
            // Mettre à jour la liste des channels de l'utilisateur
            if (!existingUser.channels.includes(channelName)) {
                existingUser.channels.push(channelName);
                await existingUser.save();
            }
        } else {
            // Créer un nouvel utilisateur si nécessaire
            const newUser = new User({
                nickname,
                socketId: socket.id,
                channels: [channelName],
            });
            await newUser.save();
        }

        // Ajouter l'utilisateur au channel via Socket.IO
        socket.join(channelName);
        console.log(`${nickname} joined ${channelName}. Socket rooms:`, Array.from(socket.rooms)); // Debug

        // Envoyer l'historique des messages au nouvel utilisateur
        const messages = await Message.find({ channel: channelName }).sort({ createdAt: 1 }).exec();
        socket.emit('channel_messages', messages);

        // Notifier les autres utilisateurs du channel
        io.to(channelName).emit('user_joined', `${nickname} joined ${channelName}`);
    } catch (err) {
        console.error('Error handling user join:', err);
        socket.emit('error', 'Failed to join channel');
    }
}

// Quitter un channel
export function quitChannel(io: Server, socket: Socket, channelName: string) {
    const nickname = nicknames.get(socket.id);
    socket.leave(channelName);
    io.to(channelName).emit('user_left', `${nickname} left ${channelName}`);
}

// Supprimer un channel
export async function deleteChannel(io: Server, socket: Socket, channelName: string) {
    if (!channelName || channelName.trim() === '') {
        socket.emit('error', 'Channel name cannot be empty');
        return;
    }

    try {
        const clients = io.sockets.adapter.rooms.get(channelName);
        if (!clients) {
            socket.emit('error', 'Channel not found');
            return;
        }

        clients.forEach((clientId) => {
            const clientSocket = io.sockets.sockets.get(clientId);
            clientSocket?.leave(channelName);
        });

        await Message.deleteMany({ channel: channelName });
        await Channel.deleteOne({ name: channelName });

        io.emit('channel_deleted', `${channelName} has been deleted`);
    } catch (err) {
        console.error('Error deleting channel:', err);
        socket.emit('error', 'Failed to delete channel');
    }
}

// Regrouper les fonctions dans un objet et exporter par défaut
const registerChannelHandlers = {
    createChannel,
    listChannels,
    joinChannel,
    quitChannel,
    deleteChannel,
    listUsers,
    renameChannel,
};

export default registerChannelHandlers;
