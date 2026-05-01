import OpenAI from 'openai';

// Initialize the OpenAI client dynamically to ensure we capture the env var at execution time
export const getDeepseekClient = () => {
    const apiKey = process.env.deepseek_api;
    return new OpenAI({
        baseURL: 'https://api.deepseek.com',
        apiKey: apiKey || 'missing-key',
    });
};

// Helper function to verify configuration at runtime
export const checkDeepseekConfigured = () => {
    const key = process.env.deepseek_api;
    return typeof key === 'string' && key.trim().length > 0;
};
