import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { listUsers } from '@socket-handlers/channels.js';
import User from '@models/user.js';

type UserDoc = { nickname: string; channels: string[]; socketId: string };

class MockQuery {
    private result: UserDoc[] | Error;

    constructor(result: UserDoc[] | Error) {
        this.result = result;
    }

    exec(): Promise<UserDoc[]> {
        if (this.result instanceof Error) {
            return Promise.reject(this.result);
        }
        return Promise.resolve(this.result);
    }
}

function createMockQuery(result: UserDoc[] | Error): MockQuery {
    return new MockQuery(result) as unknown as any;
}

describe('listUsers', () => {
    let mockIo: any;
    let mockSocket: any;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(User, 'find');
        mockSocket = {
            emit: jest.fn(),
        };
        mockIo = {
            sockets: {
                adapter: {
                    rooms: new Map(),
                },
            },
        };
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should emit an error if channel name is empty', async () => {
        await listUsers(mockIo, mockSocket, '');
        expect(mockSocket.emit).toHaveBeenCalledWith('error', 'Channel name cannot be empty');
    });

    it('should emit a list of users with their connection status', async () => {
        const mockUsersInChannel: UserDoc[] = [
            { nickname: 'User1', channels: ['test-channel'], socketId: 'socket1' },
            { nickname: 'User2', channels: ['test-channel'], socketId: 'socket2' },
        ];

        const mockOnlineUsers: UserDoc[] = [
            { nickname: 'User1', channels: ['test-channel'], socketId: 'socket1' },
        ];
        (User.find as jest.Mock).mockImplementationOnce(() => createMockQuery(mockUsersInChannel));
        (User.find as jest.Mock).mockImplementationOnce(() => createMockQuery(mockOnlineUsers));

        mockIo.sockets.adapter.rooms.set('test-channel', new Set(['socket1']));

        await listUsers(mockIo, mockSocket, 'test-channel');

        expect(User.find).toHaveBeenCalledWith({ channels: 'test-channel' });
        expect(User.find).toHaveBeenCalledWith({ socketId: { $in: ['socket1'] } });

        expect(mockSocket.emit).toHaveBeenCalledWith('users_list', [
            { nickname: 'User1', isConnected: true },
            { nickname: 'User2', isConnected: false },
        ]);
    });

    it('should emit an error if database query fails', async () => {
        
        (User.find as jest.Mock).mockImplementationOnce(() =>
            createMockQuery(new Error('DB error'))
        );
        await listUsers(mockIo, mockSocket, 'test-channel');
        expect(mockSocket.emit).toHaveBeenCalledWith('error', 'Failed to list users');
    });
});
