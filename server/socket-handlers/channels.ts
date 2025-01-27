import { Server, Socket } from 'socket.io';
import Channel from '../models/channel.js';
import Message from '../models/message.js';
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

        socket.join(channelName);
        io.emit('channel_created', channelName);
    } catch (err) {
        console.error('Error creating channel:', err);
        socket.emit('error', 'Failed to create channel');
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

// Rejoindre un channel
export function joinChannel(io: Server, socket: Socket, channelName: string) {
    if (!channelName || channelName.trim() === '') {
        socket.emit('error', 'Channel name cannot be empty');
        return;
    }

    const nickname = nicknames.get(socket.id);
    socket.join(channelName);

    Message.find({ channel: channelName })
        .sort({ createdAt: 1 })
        .exec()
        .then((messages) => {
            socket.emit('channel_messages', messages);
        })
        .catch((err) => {
            console.error('Error retrieving messages:', err);
            socket.emit('error', 'Failed to retrieve messages');
        });

    io.to(channelName).emit('user_joined', `${nickname} joined ${channelName}`);
}

// Quitter un channel
function quitChannel(io: Server, socket: Socket, channelName: string) {
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
};

export default registerChannelHandlers;
