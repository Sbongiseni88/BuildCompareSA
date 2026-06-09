---
trigger: always_on
---

# Team Standards & Rules

## Communication
- **Check /devs First**: Agents must check the `/devs` folder for updates from other agents before starting a subtask.
- **Artifact Updates**: When completing a task, update the relevant technical document in `/devs` if the implementation details changed.

## Code Consistency
- **Backend / API (TypeScript)**:
  - All orchestration logic lives in the Next.js 16 API route pipeline (`src/app/api/`). The standalone Python `backend/` is deprecated.
  - Use explicit types; validate external/AI payloads before trusting them.
- **Frontend (TypeScript/React)**:
  - All styling must use **Tailwind utility classes**.
  - Avoid custom CSS unless absolutely necessary (use `devs/frontend_dev.md` for design system reference).

## Conflict Resolution
- **File Locking**: If a file you need to edit is currently being modified by another task, pause and notify the user via an Artifact.
- **Resolution**: Wait for user instruction or for the blocking task to complete.

## AI / Data Provider Standard
All AI, extraction, and validation modules must canonically use **DeepSeek** with **Browserbase** web scraping. Browserbase fetches raw HTML structural strings; DeepSeek performs extraction and normalization. Do not implement Groq, Gemini, or legacy OpenAI SDK code paths unless explicitly requested.
