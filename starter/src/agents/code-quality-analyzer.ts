import type { AgentDefinition } from "@anthropic-ai/claude-agent-sdk";
import { CODE_QUALITY_ANALYZER_PROMPT } from "../prompts/index.js";

export const codeQualityAnalyzer: AgentDefinition = {
  description:
    'Analyzes code quality, security, maintainability, and coding standard compliance.',
  model: 'inherit',
  prompt: CODE_QUALITY_ANALYZER_PROMPT,
  tools: ['Read', 'Grep', 'Glob', 'Skill'],
};