import { describe, it, expect, jest, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { handleNick } from '@socket-handlers/commandHandlers.js';
import { nicknames } from '@socket-handlers/users.js';
import Nickname from '@models/nickname.js';

type AnyPromiseFn = (...args: any[]) => Promise<any>;

describe('handleNick', () => {
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
        nicknames.clear();
        jest.spyOn(Nickname, 'findOneAndUpdate');
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should emit an error if nickname is empty', async () => {
        const s = { id: 'mock-socket-id', emit: jest.fn() };
        await handleNick({} as any, s as any, '');
        expect(s.emit).toHaveBeenCalledWith('error', 'Nickname cannot be empty');
    });

    it('should emit an error if nickname is only whitespace', async () => {
        const s = { id: 'mock-socket-id', emit: jest.fn() };
        await handleNick({} as any, s as any, '   ');
        expect(s.emit).toHaveBeenCalledWith('error', 'Nickname cannot be empty');
    });

    it('should update the nickname and emit success', async () => {
        const mockFn = Nickname.findOneAndUpdate as unknown as jest.MockedFunction<AnyPromiseFn>;
        mockFn.mockResolvedValueOnce({});
        const s = { id: 'mock-socket-id', emit: jest.fn() };
        await handleNick({} as any, s as any, 'test-nick');
        expect(s.emit).toHaveBeenCalledWith('nick_success', 'Your nickname has been set to: test-nick');
        expect(nicknames.get('mock-socket-id')).toBe('test-nick');
    });

    it('should update the nicknames map with the new nickname', async () => {
        const mockFn = Nickname.findOneAndUpdate as unknown as jest.MockedFunction<AnyPromiseFn>;
        mockFn.mockResolvedValueOnce({});
        const s = { id: 'mock-socket-id', emit: jest.fn() };
        await handleNick({} as any, s as any, 'new-nick');
        expect(nicknames.get('mock-socket-id')).toBe('new-nick');
    });

    it('should emit an error if saving nickname fails', async () => {
        const mockFn = Nickname.findOneAndUpdate as unknown as jest.MockedFunction<AnyPromiseFn>;
        mockFn.mockRejectedValueOnce(new Error('DB error'));
        const s = { id: 'mock-socket-id', emit: jest.fn() };
        await handleNick({} as any, s as any, 'test-nick');
        expect(s.emit).toHaveBeenCalledWith('error', 'Failed to save nickname');
    });

    it('should not add an entry to nicknames map if saving fails', async () => {
        const mockFn = Nickname.findOneAndUpdate as unknown as jest.MockedFunction<AnyPromiseFn>;
        mockFn.mockRejectedValueOnce(new Error('DB error'));
        const s = { id: 'mock-socket-id', emit: jest.fn() };
        await handleNick({} as any, s as any, 'failed-nick');
        expect(nicknames.get('mock-socket-id')).toBeUndefined();
    });
});
