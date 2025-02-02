import { describe, it, expect, jest, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { joinChannel } from '@socket-handlers/channels.js';
import User from '@models/user.js';
import Message from '@models/message.js';
import { nicknames } from '@socket-handlers/users.js';
import type { Query } from 'mongoose';

type MessageDoc = { content: string };

class MockQuery {
    [Symbol.toStringTag] = 'MockQuery';
    constructor(private dataOrError: MessageDoc[] | Error) {}
    sort(_criteria: any): this {
        return this;
    }
    async exec(): Promise<MessageDoc[]> {
        if (this.dataOrError instanceof Error) {
            throw this.dataOrError;
        }
        return this.dataOrError;
    }
}

function createMockQuery(dataOrError: MessageDoc[] | Error): Query<MessageDoc[], MessageDoc> {
    return new MockQuery(dataOrError) as unknown as Query<MessageDoc[], MessageDoc>;
}

type AnyAsyncFn = (...args: any[]) => Promise<any>;

describe('joinChannel', () => {
    let originalLog: (...args: any[]) => void;
    let originalError: (...args: any[]) => void;

    beforeAll(() => {
        originalLog = console.log;
        originalError = console.error;
        console.log = () => {};
        console.error = () => {};
    });

    afterAll(() => {
        console.log = originalLog;
        console.error = originalError;
    });

    beforeEach(() => {
        jest.clearAllMocks();
        nicknames.clear();
        jest.spyOn(User, 'findOne');
        jest.spyOn(User.prototype, 'save');
        jest.spyOn(Message, 'find');
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should handle existing user', async () => {
        nicknames.set('socket-id', 'TestUser');
        const mockUser = {
            nickname: 'TestUser',
            socketId: 'socket-id',
            channels: [] as string[],
            save: jest.fn(),
        };
        (User.findOne as unknown as jest.MockedFunction<AnyAsyncFn>)
            .mockResolvedValueOnce(mockUser);
        (User.prototype.save as unknown as jest.MockedFunction<AnyAsyncFn>)
            .mockResolvedValueOnce(undefined);
        (Message.find as unknown as jest.MockedFunction<AnyAsyncFn>)
            .mockReturnValueOnce(createMockQuery([{ content: 'Hello' }, { content: 'World' }]));

        const socket = {
            id: 'socket-id',
            emit: jest.fn(),
            join: jest.fn(),
            rooms: new Set(['socket-id']),
        };
        const io = {
            to: jest.fn().mockReturnThis(),
            emit: jest.fn(),
        };

        await joinChannel(io as any, socket as any, 'someChannel');
        expect(mockUser.channels).toEqual(['someChannel']);
        expect(mockUser.save).toHaveBeenCalled();
        expect(socket.join).toHaveBeenCalledWith('someChannel');
        expect(socket.emit).toHaveBeenCalledWith('channel_messages', [
            { content: 'Hello' },
            { content: 'World' },
        ]);
        expect(io.emit).toHaveBeenCalledWith('user_joined', 'TestUser joined someChannel');
    });

    it('should create new user if findOne returns null', async () => {
        nicknames.set('socket-id', 'NewUser');
        (User.findOne as unknown as jest.MockedFunction<AnyAsyncFn>)
            .mockResolvedValueOnce(null);
        (User.prototype.save as unknown as jest.MockedFunction<AnyAsyncFn>)
            .mockResolvedValueOnce(undefined);
        (Message.find as unknown as jest.MockedFunction<AnyAsyncFn>)
            .mockReturnValueOnce(createMockQuery([]));

        const socket = {
            id: 'socket-id',
            emit: jest.fn(),
            join: jest.fn(),
            rooms: new Set(['socket-id']),
        };
        const io = {
            to: jest.fn().mockReturnThis(),
            emit: jest.fn(),
        };

        await joinChannel(io as any, socket as any, 'newChannel');
        expect(socket.join).toHaveBeenCalledWith('newChannel');
        expect(io.emit).toHaveBeenCalledWith('user_joined', 'NewUser joined newChannel');
    });

    it('should emit error if something fails in DB', async () => {
        nicknames.set('socket-id', 'CrashUser');
        (User.findOne as unknown as jest.MockedFunction<AnyAsyncFn>)
            .mockRejectedValueOnce(new Error('DB error'));

        const socket = {
            id: 'socket-id',
            emit: jest.fn(),
            join: jest.fn(),
            rooms: new Set(['socket-id']),
        };

        await joinChannel({ to: jest.fn(), emit: jest.fn() } as any, socket as any, 'failChannel');
        expect(socket.emit).toHaveBeenCalledWith('error', 'Failed to join channel');
    });
});
