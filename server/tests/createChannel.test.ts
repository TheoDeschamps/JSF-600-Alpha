import { describe, it, expect, jest, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { createChannel } from '@socket-handlers/channels.js';
import { nicknames } from '@socket-handlers/users.js';
import Channel from '@models/channel.js';

type ChannelDoc = { name: string };
type FindOneFn = (...args: any[]) => Promise<ChannelDoc | null>;
type SaveFn = () => Promise<unknown>;

describe('createChannel', () => {
    let originalError: (...data: any[]) => void;

    beforeAll(() => {
        originalError = console.error;
        console.error = () => {};
    });

    afterAll(() => {
        console.error = originalError;
    });

    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(Channel, 'findOne');
        jest.spyOn(Channel.prototype, 'save');
        // Réinitialiser la map nicknames pour éviter tout état persistant
        nicknames.clear();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should emit error if channel name is empty', async () => {
        const s = { id: 'socket-1', emit: jest.fn(), join: jest.fn() };
        await createChannel({} as any, s as any, '');
        expect(s.emit).toHaveBeenCalledWith('error', 'Channel name cannot be empty');
    });

    it('should emit error if channel already exists', async () => {
        (Channel.findOne as unknown as jest.MockedFunction<FindOneFn>)
            .mockResolvedValueOnce({ name: 'existing' });
        const s = { id: 'socket-2', emit: jest.fn(), join: jest.fn() };
        await createChannel({} as any, s as any, 'existing');
        expect(s.emit).toHaveBeenCalledWith('error', 'Channel already exists');
    });

    it('should create a new channel and emit channel_created', async () => {
        (Channel.findOne as unknown as jest.MockedFunction<FindOneFn>)
            .mockResolvedValueOnce(null);
        (Channel.prototype.save as unknown as jest.MockedFunction<SaveFn>)
            .mockResolvedValueOnce({});

        const s = { id: 'mock-socket-id', emit: jest.fn(), join: jest.fn() };
        nicknames.set('mock-socket-id', 'TestUser');

        const userJoinedEmitMock = jest.fn();
        const io = {
            to: jest.fn().mockReturnValue({ emit: userJoinedEmitMock }),
            emit: jest.fn()
        };

        await createChannel(io as any, s as any, 'test-channel');

        expect(s.join).toHaveBeenCalledWith('test-channel');
        expect(io.emit).toHaveBeenCalledWith('channel_created', 'test-channel');
        expect(io.to).toHaveBeenCalledWith('test-channel');
        expect(userJoinedEmitMock).toHaveBeenCalledWith('user_joined', 'TestUser joined test-channel');
    });

    it('should emit error if creation fails', async () => {
        (Channel.findOne as unknown as jest.MockedFunction<FindOneFn>)
            .mockRejectedValueOnce(new Error('DB error'));
        const s = { id: 'socket-3', emit: jest.fn(), join: jest.fn() };
        await createChannel({} as any, s as any, 'fail-channel');
        expect(s.emit).toHaveBeenCalledWith('error', 'Failed to create channel');
    });
});
