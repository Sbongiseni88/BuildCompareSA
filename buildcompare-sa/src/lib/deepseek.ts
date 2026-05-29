import OpenAI from 'openai';

// Helper to get the DeepSeek API key from standard environment variable names
const getApiKey = () => {
    return process.env.deepseek_api || process.env.DEEPSEEK_API_KEY;
};

// Initialize the OpenAI client dynamically to ensure we capture the env var at execution time
export const getDeepseekClient = () => {
    const apiKey = getApiKey();
    return new OpenAI({
        baseURL: 'https://api.deepseek.com',
        apiKey: apiKey || 'missing-key',
    });
};

// Helper function to verify configuration at runtime
export const checkDeepseekConfigured = () => {
    const key = getApiKey();
    return typeof key === 'string' && key.trim().length > 0;
};
