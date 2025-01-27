import { describe, it, expect, jest, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { listChannels } from '@socket-handlers/channels.js';
import Channel from '@models/channel.js';

type ChannelDoc = { name: string };

type ExecFunction = () => Promise<ChannelDoc[]>;
type FindFunction = (...args: any[]) => { exec: ExecFunction };

describe('listChannels', () => {
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
        jest.spyOn(Channel, 'find');
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should emit channels_list with matched channels', async () => {
        const mockExec = jest.fn<ExecFunction>()
            .mockResolvedValueOnce([{ name: 'abc' }, { name: 'xyz' }]);

        (Channel.find as unknown as jest.MockedFunction<FindFunction>)
            .mockReturnValueOnce({ exec: mockExec });

        const s = { emit: jest.fn() };
        await listChannels({} as any, s as any, 'test');
        expect(s.emit).toHaveBeenCalledWith('channels_list', ['abc', 'xyz']);
    });

    it('should emit error if DB fails', async () => {
        const mockExec = jest.fn<ExecFunction>()
            .mockRejectedValueOnce(new Error('DB error'));

        (Channel.find as unknown as jest.MockedFunction<FindFunction>)
            .mockReturnValueOnce({ exec: mockExec });

        const s = { emit: jest.fn() };
        await listChannels({} as any, s as any, 'fail');
        expect(s.emit).toHaveBeenCalledWith('error', 'Failed to list channels');
    });
});
