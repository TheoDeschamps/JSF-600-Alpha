import { Server, Socket } from 'socket.io';
import Nickname from '../models/nickname.js';
import User from '../models/user.js';
import Message from '../models/message.js';

// Map global pour stocker les pseudonymes des utilisateurs
export const nicknames = new Map<string, string>();

export default function registerUserHandlers(io: Server, socket: Socket) {
    // Lister les utilisateurs dans un channel spécifique
    socket.on('users', (channelName: string) => {
        listUsers(io, socket, channelName);
    });

    // Supprimer un utilisateur d'un channel
    socket.on('remove_user_from_channel', ({ channelName, nickname }: { channelName: string; nickname: string }) => {
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
        } else {
            socket.emit('error', 'User not found in the channel');
        }
    });

    // Vérifier si un pseudo existe déjà
    socket.on('check_nickname', async (nickname: string) => {
        console.log('Tentative de connexion avec le pseudo:', nickname);
        try {
            // Vérifier si le pseudo existe dans la base de données
            const existingUser = await Nickname.findOne({ nickname });
            console.log('Utilisateur trouvé dans la DB:', existingUser);
            
            if (!existingUser) {
                socket.emit('error', 'Ce pseudo n\'existe pas. Veuillez le créer d\'abord.');
                return;
            }
            
            // Vérifier si l'utilisateur est déjà connecté
            const connectedUser = await Nickname.findOne({ 
                nickname,
                isConnected: true
            });
            
            if (connectedUser && connectedUser.socketId !== socket.id) {
                socket.emit('error', 'Ce pseudo est déjà connecté');
                return;
            }

            // Mettre à jour l'utilisateur avec le nouveau socketId
            const updatedUser = await Nickname.findOneAndUpdate(
                { nickname },
                { 
                    socketId: socket.id,
                    isConnected: true,
                    lastDisconnect: null
                },
                { new: true }
            );
            console.log('Utilisateur mis à jour:', updatedUser);
            
            nicknames.set(socket.id, nickname);

            // Rejoindre tous les channels précédemment rejoints
            if (updatedUser.channels && updatedUser.channels.length > 0) {
                for (const channel of updatedUser.channels) {
                    socket.join(channel);
                    io.to(channel).emit('user_joined', `${nickname} joined ${channel}`);
                }
            } else {
                socket.join('general');
                io.to('general').emit('user_joined', `${nickname} joined general`);
            }

            // Envoyer toutes les informations nécessaires au client
            const userInfo = {
                nickname,
                message: `Connecté en tant que ${nickname}`,
                channels: updatedUser.channels || ['general'],
                currentChannel: updatedUser.channels?.[0] || 'general'
            };
            console.log('Informations envoyées au client:', userInfo);
            socket.emit('check_nickname_success', userInfo);

            // Envoyer l'historique des messages pour chaque channel
            for (const channel of updatedUser.channels || ['general']) {
                const messages = await Message.find({ channel })
                    .sort({ createdAt: 1 })
                    .limit(100)
                    .exec();
                console.log(`Messages trouvés pour ${channel}:`, messages.length);
                socket.emit('channel_messages', messages);
            }

        } catch (err) {
            console.error('Error checking nickname:', err);
            socket.emit('error', 'Failed to check nickname');
        }
    });

    // Définir ou mettre à jour le pseudonyme d'un utilisateur
    socket.on('nick', async (nickname: string) => {
        if (!nickname || nickname.trim() === '') {
            socket.emit('error', 'Nickname cannot be empty');
            return;
        }

        if ([...nicknames.values()].includes(nickname)) {
            socket.emit('error', 'Nickname is already in use');
            return;
        }

        try {
            // Vérifier si le pseudo existe déjà dans la base de données
            const existingUser = await Nickname.findOne({ nickname });
            if (existingUser) {
                socket.emit('error', 'Ce pseudo existe déjà. Utilisez la connexion.');
                return;
            }

            await Nickname.findOneAndUpdate(
                { socketId: socket.id },
                { nickname },
                { upsert: true, new: true }
            );
            
            nicknames.set(socket.id, nickname);
            socket.emit('nick_success', `Your nickname has been set to: ${nickname}`);
            socket.join('general');
            io.to('general').emit('user_joined', `${nickname} joined general`);
        } catch (err) {
            socket.emit('error', 'Failed to save nickname');
        }
    });

    // Gérer la déconnexion d'un utilisateur
    socket.on('disconnect', async () => {
        const nickname = nicknames.get(socket.id);
        if (!nickname) return; // Si pas de nickname, on ne fait rien

        try {
            // Sauvegarder l'état de l'utilisateur avant la déconnexion
            await Nickname.findOneAndUpdate(
                { nickname },
                { 
                    $set: { 
                        isConnected: false,
                        lastDisconnect: new Date()
                    }
                }
            );
            nicknames.delete(socket.id);
            console.log(`User disconnected: ${nickname} (ID: ${socket.id})`);
        } catch (err) {
            console.error('Error updating user disconnect status:', err);
        }
    });
}

// Fonction : Lister les utilisateurs d'un channel
export async function listUsers(io: Server, socket: Socket, channelName: string) {
    if (!channelName || channelName.trim() === '') {
        socket.emit('error', 'Channel name cannot be empty');
        return;
    }

    const users = Array.from(io.sockets.adapter.rooms.get(channelName) || [])
        .map((clientId) => nicknames.get(clientId) || `User ${clientId}`);

    socket.emit('users_list', users);
}

// Fonction : Envoyer un message privé
export async function handlePrivateMessage(io: Server, socket: Socket, toNickname: string, ...content: string[]) {
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
    } catch (err) {
        socket.emit('error', 'Failed to send private message');
    }
}
