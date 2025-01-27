import {describe, it, expect, jest, beforeAll, afterAll, beforeEach, afterEach} from '@jest/globals';
import {renameChannel} from '@socket-handlers/channels.js';
import Channel from '@models/channel.js';

type AnyAsyncFn = (...args: any[]) => Promise<any>;

describe('renameChannel', () => {
    beforeAll(() => {
        console.error = () => {};
    });
    afterAll(() => {});

    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(Channel, 'findOne');
        jest.spyOn(Channel.prototype, 'save');
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should emit error if channel names are empty', async () => {
        const socket = {emit: jest.fn()};
        await renameChannel({} as any, socket as any, '', '');
        expect(socket.emit).toHaveBeenCalledWith('error', 'Channel name cannot be empty');
    });

    it('should emit error if channel not found', async () => {
        (Channel.findOne as unknown as jest.MockedFunction<AnyAsyncFn>)
            .mockResolvedValueOnce(null);
        const socket = {emit: jest.fn()};
        const io = {emit: jest.fn()};
        await renameChannel(io as any, socket as any, 'oldName', 'newName');
        expect(socket.emit).toHaveBeenCalledWith('error', 'Channel not found');
    });

    it('should rename channel and emit channel_renamed', async () => {
        const mockChannel = {
            name: 'oldName',
            save: (jest.fn() as unknown as jest.MockedFunction<AnyAsyncFn>)
                .mockResolvedValueOnce({})
        };

        (Channel.findOne as unknown as jest.MockedFunction<AnyAsyncFn>)
            .mockResolvedValueOnce(mockChannel);

        const socket = {emit: jest.fn()};
        const io = {emit: jest.fn()};
        await renameChannel(io as any, socket as any, 'oldName', 'newName');
        expect(mockChannel.name).toBe('newName');
        expect(mockChannel.save).toHaveBeenCalled();
        expect(io.emit).toHaveBeenCalledWith('channel_renamed', {oldName: 'oldName', newName: 'newName'});
    });

    it('should emit error if rename fails', async () => {
        (Channel.findOne as unknown as jest.MockedFunction<AnyAsyncFn>)
            .mockRejectedValueOnce(new Error('DB error'));
        const socket = {emit: jest.fn()};
        const io = {emit: jest.fn()};
        await renameChannel(io as any, socket as any, 'failOld', 'failNew');
        expect(socket.emit).toHaveBeenCalledWith('error', 'Failed to rename channel');
    });
});
