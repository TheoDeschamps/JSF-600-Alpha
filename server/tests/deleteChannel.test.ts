import { describe, it, expect, jest, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { deleteChannel } from '@socket-handlers/channels.js';
import Message from '@models/message.js';
import Channel from '@models/channel.js';

type DeleteManyFn = (filter: any) => Promise<unknown>;
type DeleteOneFn = (filter: any) => Promise<unknown>;

describe('deleteChannel', () => {
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
        jest.spyOn(Message, 'deleteMany');
        jest.spyOn(Channel, 'deleteOne');
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should emit error if channel name is empty', async () => {
        const mockSocket = { emit: jest.fn() };
        await deleteChannel({} as any, mockSocket as any, '');
        expect(mockSocket.emit).toHaveBeenCalledWith('error', 'Channel name cannot be empty');
    });

    it('should emit error if channel not found', async () => {
        const mockSocket = { emit: jest.fn() };
        const mockIo = {
            sockets: {
                adapter: {
                    rooms: new Map<string, Set<string>>() // no channel stored
                }
            }
        };
        await deleteChannel(mockIo as any, mockSocket as any, 'channel-not-found');
        expect(mockSocket.emit).toHaveBeenCalledWith('error', 'Channel not found');
    });

    it('should remove all clients from the channel and emit channel_deleted', async () => {
        (Message.deleteMany as unknown as jest.MockedFunction<DeleteManyFn>)
            .mockResolvedValueOnce({});
        (Channel.deleteOne as unknown as jest.MockedFunction<DeleteOneFn>)
            .mockResolvedValueOnce({});

        const clientSocket1 = { leave: jest.fn() };
        const clientSocket2 = { leave: jest.fn() };

        const mockIo = {
            sockets: {
                adapter: {
                    rooms: new Map<string, Set<string>>([
                        ['test-channel', new Set(['client1', 'client2'])]
                    ])
                },
                sockets: new Map<string, any>([
                    ['client1', clientSocket1],
                    ['client2', clientSocket2]
                ])
            },
            emit: jest.fn()
        };
        const mockSocket = { emit: jest.fn() };

        await deleteChannel(mockIo as any, mockSocket as any, 'test-channel');

        expect(clientSocket1.leave).toHaveBeenCalledWith('test-channel');
        expect(clientSocket2.leave).toHaveBeenCalledWith('test-channel');
        expect(Message.deleteMany).toHaveBeenCalledWith({ channel: 'test-channel' });
        expect(Channel.deleteOne).toHaveBeenCalledWith({ name: 'test-channel' });
        expect(mockIo.emit).toHaveBeenCalledWith('channel_deleted', 'test-channel has been deleted');
    });

    it('should emit error if deleting fails', async () => {
        (Message.deleteMany as unknown as jest.MockedFunction<DeleteManyFn>)
            .mockRejectedValueOnce(new Error('DB error'));
        const mockIo = {
            sockets: {
                adapter: {
                    rooms: new Map<string, Set<string>>([
                        ['fail-channel', new Set(['client1'])]
                    ])
                },
                sockets: new Map<string, any>([['client1', { leave: jest.fn() }]])
            },
            emit: jest.fn()
        };
        const mockSocket = { emit: jest.fn() };

        await deleteChannel(mockIo as any, mockSocket as any, 'fail-channel');
        expect(mockSocket.emit).toHaveBeenCalledWith('error', 'Failed to delete channel');
    });
});
