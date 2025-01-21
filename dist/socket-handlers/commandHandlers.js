import { nicknames } from './users.js';
import registerChannelHandlers from './channels.js'; // Import de l’export par défaut
import { handlePrivateMessage, listUsers } from './users.js';
import Nickname from '../models/nickname.js';
// Fonction principale pour traiter les commandes
export function handleCommand(io, socket, command, args) {
    const commands = {
        '/nick': (io, socket, nickname) => handleNick(io, socket, nickname),
        '/list': (io, socket, keyword = '') => registerChannelHandlers.listChannels(io, socket, keyword),
        '/create': (io, socket, channelName = '') => registerChannelHandlers.createChannel(io, socket, channelName),
        '/delete': (io, socket, channelName = '') => registerChannelHandlers.deleteChannel(io, socket, channelName),
        '/join': (io, socket, channelName = '') => registerChannelHandlers.joinChannel(io, socket, channelName),
        '/quit': (io, socket, channelName = '') => registerChannelHandlers.quitChannel(io, socket, channelName),
        '/users': (io, socket, channelName = '') => listUsers(io, socket, channelName),
        '/msg': (io, socket, toNickname = '', ...content) => handlePrivateMessage(io, socket, toNickname, ...content),
    };
    const commandHandler = commands[command];
    if (commandHandler) {
        try {
            commandHandler(io, socket, ...args);
        }
        catch (err) {
            console.error(`Error executing command ${command}:`, err);
            socket.emit('error', `Failed to execute command: ${command}`);
        }
    }
    else {
        socket.emit('error', `Unknown command: ${command}`);
    }
}
// Gestion de `/nick`
async function handleNick(io, socket, nickname) {
    if (!nickname || nickname.trim() === '') {
        socket.emit('error', 'Nickname cannot be empty');
        return;
    }
    try {
        await Nickname.findOneAndUpdate({ socketId: socket.id }, { nickname }, { upsert: true, new: true });
        nicknames.set(socket.id, nickname);
        socket.emit('nick_success', `Your nickname has been set to: ${nickname}`);
    }
    catch (err) {
        console.error('Error saving nickname:', err);
        socket.emit('error', 'Failed to save nickname');
    }
}
