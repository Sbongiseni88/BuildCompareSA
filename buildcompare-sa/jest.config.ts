import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({
    // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
    dir: './',
})

// Add any custom config to be passed to Jest
const config: Config = {
    coverageProvider: 'v8',
    testEnvironment: 'jsdom',
    setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
    // Skip Python virtualenvs and stray archives so we never crawl them
    // for tests or trigger haste-map collisions on bundled binaries.
    modulePathIgnorePatterns: [
        '<rootDir>/venv/',
        '<rootDir>/scraper/venv/',
        '<rootDir>/.next/',
    ],
    testPathIgnorePatterns: [
        '/node_modules/',
        '/venv/',
        '/scraper/venv/',
        '/.next/',
    ],
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
export default createJestConfig(config)


//testing a push again