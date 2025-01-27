import { describe, it, expect, jest, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { joinChannel } from '@socket-handlers/channels.js';
import { nicknames } from '@socket-handlers/users.js';
import Message from '@models/message.js';
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

function createMockQuery(
    dataOrError: MessageDoc[] | Error
): Query<MessageDoc[], MessageDoc> {
    return new MockQuery(dataOrError) as unknown as Query<MessageDoc[], MessageDoc>;
}

describe('joinChannel', () => {
    let originalError: (...args: any[]) => void;

    beforeAll(() => {
        originalError = console.error;
        console.error = () => {};
    });

    afterAll(() => {
        console.error = originalError;
    });

    beforeEach(() => {
        jest.clearAllMocks();
        nicknames.clear();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should emit error if channel name is empty', () => {
        const socket = { id: 'socket-id', emit: jest.fn(), join: jest.fn() };
        joinChannel({} as any, socket as any, '');
        expect(socket.emit).toHaveBeenCalledWith('error', 'Channel name cannot be empty');
    });

    it('should join channel, retrieve messages, emit them, and notify others', async () => {
        nicknames.set('socket-id', 'TestUser');
        jest.spyOn(Message, 'find').mockReturnValueOnce(
            createMockQuery([
                { content: 'Hello' },
                { content: 'World' },
            ])
        );

        const socket = {
            id: 'socket-id',
            emit: jest.fn(),
            join: jest.fn(),
        };
        const mockIo = {
            to: jest.fn().mockReturnThis(),
            emit: jest.fn(),
        };

        await joinChannel(mockIo as any, socket as any, 'my-channel');

        expect(socket.join).toHaveBeenCalledWith('my-channel');
        expect(socket.emit).toHaveBeenCalledWith('channel_messages', [
            { content: 'Hello' },
            { content: 'World' },
        ]);
        expect(mockIo.to).toHaveBeenCalledWith('my-channel');
        expect(mockIo.emit).toHaveBeenCalledWith(
            'user_joined',
            'TestUser joined my-channel'
        );
    });

    it('should emit error if retrieving messages fails', async () => {
        nicknames.set('socket-id', 'FailUser');
        jest.spyOn(Message, 'find').mockReturnValueOnce(
            createMockQuery(new Error('DB error'))
        );

        const socket = {
            id: 'socket-id',
            emit: jest.fn(),
            join: jest.fn(),
        };
        const mockIo = {
            to: jest.fn().mockReturnThis(),
            emit: jest.fn(),
        };

        await joinChannel(mockIo as any, socket as any, 'error-channel');

        expect(socket.join).toHaveBeenCalledWith('error-channel');
        joinChannel(mockIo as any, socket as any, 'error-channel');
        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(socket.emit).toHaveBeenCalledWith('error', 'Failed to retrieve messages');

    });
});
