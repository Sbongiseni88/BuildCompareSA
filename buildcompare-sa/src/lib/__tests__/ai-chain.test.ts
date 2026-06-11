/**
 * Provider-chain contract tests (team_standards.md):
 *   DeepSeek (canonical) → Groq (fallback) → throw.
 */

let mockDeepseekConfigured = true;
let mockGroqConfigured = true;
const mockDeepseekCreate = jest.fn();
const mockGroqCreate = jest.fn();

jest.mock('../deepseek', () => ({
    checkDeepseekConfigured: () => mockDeepseekConfigured,
    getDeepseekClient: () => ({ chat: { completions: { create: mockDeepseekCreate } } }),
}));

jest.mock('../groq', () => ({
    get isGroqConfigured() { return mockGroqConfigured; },
    // Lazy indirection: the factory runs during import hoisting, before the
    // `let` mocks above are initialised — only dereference them at call time.
    groqClient: {
        chat: {
            completions: {
                create: (...args: unknown[]) => mockGroqCreate(...args),
            },
        },
    },
}));

import { runAIChain, isAnyAIProviderConfigured } from '../ai-chain';

const completion = (text: string | null) => ({ choices: [{ message: { content: text } }] });
const MESSAGES = [{ role: 'system' as const, content: 'test prompt' }];

beforeEach(() => {
    mockDeepseekConfigured = true;
    mockGroqConfigured = true;
    mockDeepseekCreate.mockReset();
    mockGroqCreate.mockReset();
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
    jest.restoreAllMocks();
});

describe('runAIChain', () => {
    it('returns DeepSeek content and never touches Groq when DeepSeek succeeds', async () => {
        mockDeepseekCreate.mockResolvedValue(completion('{"ok":true}'));

        await expect(runAIChain(MESSAGES)).resolves.toBe('{"ok":true}');
        expect(mockDeepseekCreate).toHaveBeenCalledTimes(1);
        expect(mockGroqCreate).not.toHaveBeenCalled();
    });

    it('falls back to Groq when DeepSeek throws', async () => {
        mockDeepseekCreate.mockRejectedValue(new Error('deepseek down'));
        mockGroqCreate.mockResolvedValue(completion('{"via":"groq"}'));

        await expect(runAIChain(MESSAGES)).resolves.toBe('{"via":"groq"}');
        expect(mockDeepseekCreate).toHaveBeenCalledTimes(1);
        expect(mockGroqCreate).toHaveBeenCalledTimes(1);
        expect(mockGroqCreate.mock.calls[0][0].model).toBe('llama-3.3-70b-versatile');
    });

    it('falls back to Groq when DeepSeek is unconfigured (never blocks on the canonical key alone)', async () => {
        mockDeepseekConfigured = false;
        mockGroqCreate.mockResolvedValue(completion('{"via":"groq"}'));

        await expect(runAIChain(MESSAGES)).resolves.toBe('{"via":"groq"}');
        expect(mockDeepseekCreate).not.toHaveBeenCalled();
    });

    it('falls back to Groq when DeepSeek returns empty content', async () => {
        mockDeepseekCreate.mockResolvedValue(completion(null));
        mockGroqCreate.mockResolvedValue(completion('{"via":"groq"}'));

        await expect(runAIChain(MESSAGES)).resolves.toBe('{"via":"groq"}');
    });

    it('tries the second Groq model when the first fails', async () => {
        mockDeepseekConfigured = false;
        mockGroqCreate
            .mockRejectedValueOnce(new Error('70b unavailable'))
            .mockResolvedValueOnce(completion('{"via":"8b"}'));

        await expect(runAIChain(MESSAGES)).resolves.toBe('{"via":"8b"}');
        expect(mockGroqCreate).toHaveBeenCalledTimes(2);
        expect(mockGroqCreate.mock.calls[1][0].model).toBe('llama-3.1-8b-instant');
    });

    it('throws the last provider error when the whole chain is exhausted', async () => {
        mockDeepseekCreate.mockRejectedValue(new Error('deepseek down'));
        mockGroqCreate.mockRejectedValue(new Error('groq down'));

        await expect(runAIChain(MESSAGES)).rejects.toThrow('groq down');
    });

    it('throws a configuration error when no provider is configured', async () => {
        mockDeepseekConfigured = false;
        mockGroqConfigured = false;

        await expect(runAIChain(MESSAGES)).rejects.toThrow('No AI provider configured');
        expect(mockDeepseekCreate).not.toHaveBeenCalled();
        expect(mockGroqCreate).not.toHaveBeenCalled();
    });
});

describe('isAnyAIProviderConfigured', () => {
    it('is true when either provider has a key', () => {
        mockDeepseekConfigured = true;
        mockGroqConfigured = false;
        expect(isAnyAIProviderConfigured()).toBe(true);

        mockDeepseekConfigured = false;
        mockGroqConfigured = true;
        expect(isAnyAIProviderConfigured()).toBe(true);
    });

    it('is false only when the whole chain is unconfigured', () => {
        mockDeepseekConfigured = false;
        mockGroqConfigured = false;
        expect(isAnyAIProviderConfigured()).toBe(false);
    });
});
