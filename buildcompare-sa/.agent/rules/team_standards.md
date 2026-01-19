---
trigger: always_on
---

# Team Standards & Rules

## Communication
- **Check /devs First**: Agents must check the `/devs` folder for updates from other agents before starting a subtask.
- **Artifact Updates**: When completing a task, update the relevant technical document in `/devs` if the implementation details changed.

## Code Consistency
- **Backend (Python)**:
  - All backend code must use **Python Type Hinting**.
  - Follow usage of Pydantic models for data validation.
- **Frontend (TypeScript/React)**:
  - All styling must use **Tailwind utility classes**.
  - Avoid custom CSS unless absolutely necessary (use `devs/frontend_dev.md` for design system reference).

## Conflict Resolution
- **File Locking**: If a file you need to edit is currently being modified by another task, pause and notify the user via an Artifact.
- **Resolution**: Wait for user instruction or for the blocking task to complete.

AI Provider: All AI-driven features must utilize the Groq SDK. Do not implement OpenAI or Anthropic libraries unless explicitly requested. Always check GROQ_API_KEY status before initializing the chatbot service.