import type { AgentDefinition } from "@anthropic-ai/claude-agent-sdk";
import { REFACTORING_SUGGESTER_PROMPT } from "../prompts/index.js";

export const refactoringSuggester: AgentDefinition = {
  description: "Identifies opportunities to improve code structure, maintainability, and modernize coding patterns.",
  prompt: REFACTORING_SUGGESTER_PROMPT,
  tools: [
    "Read",
    "Grep",
    "Glob",
  ],
};