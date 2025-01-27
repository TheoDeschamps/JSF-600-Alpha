import { describe, it, expect, jest, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { createChannel } from '@socket-handlers/channels.js';
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
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should emit error if channel name is empty', async () => {
        const s = { emit: jest.fn(), join: jest.fn() };
        await createChannel({} as any, s as any, '');
        expect(s.emit).toHaveBeenCalledWith('error', 'Channel name cannot be empty');
    });

    it('should emit error if channel already exists', async () => {
        (Channel.findOne as unknown as jest.MockedFunction<FindOneFn>)
            .mockResolvedValueOnce({ name: 'existing' });
        const s = { emit: jest.fn(), join: jest.fn() };
        await createChannel({} as any, s as any, 'existing');
        expect(s.emit).toHaveBeenCalledWith('error', 'Channel already exists');
    });

    it('should create a new channel and emit channel_created', async () => {
        (Channel.findOne as unknown as jest.MockedFunction<FindOneFn>)
            .mockResolvedValueOnce(null);
        (Channel.prototype.save as unknown as jest.MockedFunction<SaveFn>)
            .mockResolvedValueOnce({});
        const s = { emit: jest.fn(), join: jest.fn() };
        const io = { emit: jest.fn() };
        await createChannel(io as any, s as any, 'test-channel');
        expect(s.join).toHaveBeenCalledWith('test-channel');
        expect(io.emit).toHaveBeenCalledWith('channel_created', 'test-channel');
    });

    it('should emit error if creation fails', async () => {
        (Channel.findOne as unknown as jest.MockedFunction<FindOneFn>)
            .mockRejectedValueOnce(new Error('DB error'));
        const s = { emit: jest.fn(), join: jest.fn() };
        await createChannel({} as any, s as any, 'fail-channel');
        expect(s.emit).toHaveBeenCalledWith('error', 'Failed to create channel');
    });
});
