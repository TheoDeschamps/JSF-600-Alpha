import { Server, Socket } from 'socket.io';
import {nicknames} from './users.js'; // Import du Map pour gérer les nicknames

export default function registerChannelHandlers(io: Server, socket: Socket) {
    // Créer un channel
    socket.on('create_channel', (channelName) => {
        socket.join(channelName);
        io.emit('channel_created', channelName);
    });

    // Lister les channels
    socket.on('list_channels', (keyword) => {
        const channels = Array.from(io.sockets.adapter.rooms.keys())
            .filter((channel) => !io.sockets.sockets.has(channel)) // Éviter de lister les sockets comme channels
            .filter((channel) => channel.includes(keyword || ''));
        socket.emit('channels_list', channels);
    });

    // Rejoindre un channel
    socket.on('join_channel', (channelName) => {
        const nickname = nicknames.get(socket.id); // Récupérer le nickname depuis le Map
        socket.join(channelName);
        socket.to(channelName).emit('user_joined', `${nickname} joined ${channelName}`);
    });

    // Quitter un channel
    socket.on('quit_channel', (channelName) => {
        const nickname = nicknames.get(socket.id); // Récupérer le nickname depuis le Map
        socket.leave(channelName);
        socket.to(channelName).emit('user_left', `${nickname} left ${channelName}`);
    });

    // Supprimer un channel
    socket.on('delete_channel', (channelName) => {
        if (io.sockets.adapter.rooms.has(channelName)) {
            // Notifier tous les utilisateurs du channel
            io.to(channelName).emit('channel_deleted', `${channelName} has been deleted`);

            // Supprimer tous les utilisateurs du channel
            const clients = io.sockets.adapter.rooms.get(channelName);
            clients?.forEach((clientId) => {
                const clientSocket = io.sockets.sockets.get(clientId);
                clientSocket?.leave(channelName);
            });

            socket.emit('channel_removed', `${channelName} successfully deleted`);
        } else {
            socket.emit('error', 'Channel not found');
        }
    });
}
