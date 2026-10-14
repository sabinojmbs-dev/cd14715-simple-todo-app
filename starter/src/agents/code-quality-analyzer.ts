import type { AgentDefinition } from "@anthropic-ai/claude-agent-sdk";
import { CODE_QUALITY_ANALYZER_PROMPT } from "../prompts/index.js";

export const codeQualityAnalyzer: AgentDefinition = {
  description: "Analyzes code for security vulnerabilities, performance issues, and maintainability concerns.",
  prompt: CODE_QUALITY_ANALYZER_PROMPT,
  tools: [
    "Read",
    "Grep",
    "Glob",
    "Skill",
  ],
};