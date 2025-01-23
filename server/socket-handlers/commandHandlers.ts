import { DefaultEventsMap, Server, Socket} from 'socket.io';
import { nicknames } from './users.js';
import registerChannelHandlers from './channels.js'; // Import de l’export par défaut
import { handlePrivateMessage, listUsers } from './users.js';
import Nickname from '../models/nickname.js';

// Fonction principale pour traiter les commandes
export function handleCommand(io: Server, socket: Socket, command: string, args: string[]) {
    const commands: Record<string, Function> = {
        '/nick': (io: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>, socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>, nickname: string) => handleNick(io, socket, nickname),
        '/list': (io: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>, socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>, keyword = '') => registerChannelHandlers.listChannels(io, socket, keyword),
        '/create': (io: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>, socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>, channelName = '') => registerChannelHandlers.createChannel(io, socket, channelName),
        '/delete': (io: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>, socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>, channelName = '') => registerChannelHandlers.deleteChannel(io, socket, channelName),
        '/join': (io: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>, socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>, channelName = '') => registerChannelHandlers.joinChannel(io, socket, channelName),
        '/quit': (io: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>, socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>, channelName = '') => registerChannelHandlers.quitChannel(io, socket, channelName),
        '/users': (io: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>, socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>, channelName = '') => listUsers(io, socket, channelName),
        '/msg': (io: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>, socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>, toNickname = '', ...content: any) => handlePrivateMessage(io, socket, toNickname, ...content),
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
