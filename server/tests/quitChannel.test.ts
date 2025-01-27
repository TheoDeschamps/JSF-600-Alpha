import {describe, it, expect, jest, beforeEach} from '@jest/globals';
import {quitChannel} from '@socket-handlers/channels.js';
import {nicknames} from '@socket-handlers/users.js';

describe('quitChannel', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        nicknames.clear();
    });

    it('should let a user leave the channel and notify others', () => {
        nicknames.set('mock-socket-id', 'TestUser');
        const mockSocket = {id: 'mock-socket-id', leave: jest.fn()};
        const mockIo = {
            to: jest.fn().mockReturnThis(),
            emit: jest.fn()
        };

        quitChannel(mockIo as any, mockSocket as any, 'test-channel');

        expect(mockSocket.leave).toHaveBeenCalledWith('test-channel');
        expect(mockIo.to).toHaveBeenCalledWith('test-channel');
        expect(mockIo.emit).toHaveBeenCalledWith('user_left', 'TestUser left test-channel');
    });
});
