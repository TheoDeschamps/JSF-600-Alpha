import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { handleNick } from '@socket-handlers/commandHandlers.js';
import {
    createChannel,
    joinChannel,
    listUsers,
    quitChannel
} from '@socket-handlers/channels.js';
import { nicknames } from '@socket-handlers/users.js';
import User from '@models/user.js';
import Message from '@models/message.js'; // Ajout de l'import manquant
import Channel from '@models/channel.js';
import Nickname from '@models/nickname.js';

type AnyAsyncFn = (...args: any[]) => Promise<any>;

describe('User sequence: Nickname -> Create -> Join -> List -> Quit', () => {
    let mockIo: any;
    let mockSocket: any;

    beforeEach(() => {
        jest.clearAllMocks();

        jest.spyOn(Message, 'find').mockReturnValue({
            sort: jest.fn().mockReturnValue({
        // @ts-ignore
                exec: jest.fn().mockResolvedValue([])
            })
        } as any);

        jest.spyOn(User.prototype, 'save').mockResolvedValue(undefined);
        jest.spyOn(Channel.prototype, 'save').mockResolvedValue(undefined);
        jest.spyOn(User, 'findOne');
        jest.spyOn(User, 'find');
        jest.spyOn(Channel, 'findOne');
        jest.spyOn(Nickname, 'findOneAndUpdate').mockResolvedValue({} as any);

        mockSocket = {
            id: 'mock-socket-id',
            emit: jest.fn(),
            join: jest.fn(),
            leave: jest.fn(),
            rooms: new Set(['mock-socket-id']),
        };

        mockIo = {
            sockets: {
                adapter: {
                    rooms: new Map()
                }
            },
            emit: jest.fn(),
            to: jest.fn().mockReturnThis()
        };

        nicknames.clear();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    type FoundUserDoc = {
        nickname: string;
        channels?: string[];
        socketId: string;
    };

    it('should allow a user to set a nickname, create a channel, join it, list users, and quit', async () => {
        jest.setTimeout(20000);

        // 1) Nickname
        await handleNick(mockIo, mockSocket, 'TestUser');
        expect(mockSocket.emit).toHaveBeenCalledWith('nick_success', 'Your nickname has been set to: TestUser');
        expect(nicknames.get(mockSocket.id)).toBe('TestUser');

        // 2) Create channel
        (Channel.findOne as unknown as jest.MockedFunction<AnyAsyncFn>).mockResolvedValueOnce(null);
        await createChannel(mockIo, mockSocket, 'test-channel');

        expect(mockSocket.join).toHaveBeenCalledWith('test-channel');
        expect(mockIo.emit).toHaveBeenCalledWith('channel_created', 'test-channel');

        // 3) Join channel
        (User.findOne as unknown as jest.MockedFunction<AnyAsyncFn>).mockResolvedValueOnce({
            nickname: 'TestUser',
            socketId: 'mock-socket-id',
            channels: [],
            save: jest.fn()
        });

        await joinChannel(mockIo, mockSocket, 'test-channel');
        expect(mockIo.emit).toHaveBeenLastCalledWith('user_joined', 'TestUser joined test-channel');

        // 4) List users
        (User.find as jest.Mock)
            .mockReturnValueOnce({
        // @ts-ignore
                exec: (jest.fn() as unknown as jest.Mock<Promise<FoundUserDoc[]>>)
                    .mockResolvedValueOnce([
                        { nickname: 'TestUser', channels: ['test-channel'], socketId: 'mock-socket-id' }
                    ] as FoundUserDoc[])
            } as any)
            .mockReturnValueOnce({
                // @ts-ignore
                exec: (jest.fn() as unknown as jest.Mock<Promise<FoundUserDoc[]>>)
                    .mockResolvedValueOnce([
                        { nickname: 'TestUser', socketId: 'mock-socket-id' }
                    ] as FoundUserDoc[])
            } as any);

        mockIo.sockets.adapter.rooms.set('test-channel', new Set(['mock-socket-id']));

        await listUsers(mockIo, mockSocket, 'test-channel');
        expect(mockSocket.emit).toHaveBeenCalledWith('users_list', [
            { nickname: 'TestUser', isConnected: true }
        ]);

        // 5) Quit channel
        await quitChannel(mockIo, mockSocket, 'test-channel');
        expect(mockSocket.leave).toHaveBeenCalledWith('test-channel');
        expect(mockIo.emit).toHaveBeenCalledWith('user_left', 'TestUser left test-channel');
    }, 20000);
});