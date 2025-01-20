import { Server, Socket } from 'socket.io';

// Map global pour stocker les pseudonymes des utilisateurs
export const nicknames = new Map<string, string>();

export default function registerUserHandlers(io: Server, socket: Socket) {
    // Définir un pseudo pour un utilisateur
    socket.on('nick', (nickname: string) => {
        nicknames.set(socket.id, nickname); // Associe l'ID du socket au pseudo
        socket.emit('nick_success', `Pseudo set to ${nickname}`);
    });

    // Lister les utilisateurs dans un channel spécifique
    socket.on('users', (channelName: string) => {
        const users = Array.from(io.sockets.adapter.rooms.get(channelName) || [])
            .map((clientId) => nicknames.get(clientId) || `User ${clientId}`);
        socket.emit('users_list', users);
    });

    // Supprimer un utilisateur d'un channel
    socket.on('remove_user_from_channel', ({ channelName, nickname }: { channelName: string; nickname: string }) => {
        const clientIdToRemove = Array.from(nicknames.entries())
            .find(([id, nick]) => nick === nickname)?.[0]; // Trouve l'ID correspondant au pseudo

        if (clientIdToRemove) {
            const clientSocket = io.sockets.sockets.get(clientIdToRemove);
            clientSocket?.leave(channelName); // Retirer l'utilisateur du channel
            io.to(channelName).emit('user_removed', `${nickname} was removed from ${channelName}`);
        } else {
            socket.emit('error', 'User not found in the channel');
        }
    });

    // Déconnecter un utilisateur complètement
    socket.on('disconnect_user', (nickname: string) => {
        const clientIdToDisconnect = Array.from(nicknames.entries())
            .find(([id, nick]) => nick === nickname)?.[0]; // Trouve l'ID correspondant au pseudo

        if (clientIdToDisconnect) {
            const clientSocket = io.sockets.sockets.get(clientIdToDisconnect);
            clientSocket?.disconnect(true); // Déconnecter complètement l'utilisateur
            nicknames.delete(clientIdToDisconnect); // Supprime l'entrée du Map
            io.emit('user_disconnected', `${nickname} has been disconnected`);
        } else {
            socket.emit('error', 'User not found');
        }
    });

    // Gérer la déconnexion d'un utilisateur
    socket.on('disconnect', () => {
        nicknames.delete(socket.id); // Supprime l'entrée du Map pour l'utilisateur déconnecté
        console.log(`User disconnected: ${socket.id}`);
    });
}
