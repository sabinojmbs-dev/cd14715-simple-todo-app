import type { AgentDefinition } from "@anthropic-ai/claude-agent-sdk";
import { REFACTORING_SUGGESTER_PROMPT } from "../prompts/index.js";

export const refactoringSuggester: AgentDefinition = {
  description:
    'Identifies refactoring opportunities that improve readability, maintainability, and design.',
  model: 'inherit',
  prompt: REFACTORING_SUGGESTER_PROMPT,
  tools: ['Read', 'Grep', 'Glob', 'Skill'],
};