import { DefaultEventsMap, Server, Socket} from 'socket.io';
import { nicknames } from './users.js';
import registerChannelHandlers from './channels.js';
import { handlePrivateMessage, listUsers } from './users.js';
import Nickname from '../models/nickname.js';

// Fonction principale pour traiter les commandes
export function handleCommand(io: Server, socket: Socket, command: string, args: string[]) {
    const commands: Record<string, Function> = {
        '/nick': async (io: Server, socket: Socket, nickname: string) => {
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
                console.error('Error saving nickname:', err);
                socket.emit('error', 'Failed to save nickname');
            }
        },
        '/list': (io: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>, socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>, keyword = '') => registerChannelHandlers.listChannels(io, socket, keyword),
        '/create': (io: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>, socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>, channelName = '') => registerChannelHandlers.createChannel(io, socket, channelName),
        '/delete': (io: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>, socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>, channelName = '') => registerChannelHandlers.deleteChannel(io, socket, channelName),
        '/join': (io: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>, socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>, channelName = '') => registerChannelHandlers.joinChannel(io, socket, channelName),
        '/quit': (io: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>, socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>, channelName = '') => registerChannelHandlers.quitChannel(io, socket, channelName),
        // commandHandlers.ts
        '/users': (io: Server, socket: Socket, ...args : string[]) => {
            const channelName = args[0] || "general"; // Default to "general" if no arg
            registerChannelHandlers.listUsers(io, socket, channelName);
        },
        '/msg': (io: Server, socket: Socket, ...args: string[]) => {
            if (args.length < 2) {
                socket.emit('error', 'Usage: /msg <nickname> <message>');
                return;
            }
            const toNickname = args[0];
            const content = args.slice(1).join(' '); // Combine remaining args into the message
            handlePrivateMessage(io, socket, toNickname, content);
        },        // commande pour renommer un channel --> fonctionne
        '/rename': (io: Server, socket: Socket, channelName: string, newChannelName: string) => registerChannelHandlers.renameChannel(io, socket, channelName, newChannelName),
    };

    const commandHandler = commands[command];
    if (commandHandler) {
        try {
            commandHandler(io, socket, ...args);
        } catch (err) {
            console.error(`Error executing command ${command}:`, err);
            socket.emit('error', `Failed to execute command: ${command}`);
        }
    } else {
        socket.emit('error', `Unknown command: ${command}`);
    }
}

// Gestion de `/nick`
export async function handleNick(io: Server, socket: Socket, nickname: string) {
    if (!nickname || nickname.trim() === '') {
        socket.emit('error', 'Nickname cannot be empty');
        return;
    }
    try {
        await Nickname.findOneAndUpdate(
            { socketId: socket.id },
            { nickname },
            { upsert: true, new: true }
        );
        nicknames.set(socket.id, nickname);
        socket.emit('nick_success', `Your nickname has been set to: ${nickname}`);
    } catch (err) {
        console.error('Error saving nickname:', err);
        socket.emit('error', 'Failed to save nickname');
    }
}
