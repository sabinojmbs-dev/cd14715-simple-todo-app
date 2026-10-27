import type { AgentDefinition } from "@anthropic-ai/claude-agent-sdk";
import { TEST_COVERAGE_ANALYZER_PROMPT } from "../prompts/index.js";

export const testCoverageAnalyzer: AgentDefinition = {
  description:
    "Evaluates test completeness and identifies missing test cases and coverage gaps.",
  model: "inherit",
  prompt: TEST_COVERAGE_ANALYZER_PROMPT,
  tools: ["Read", "Grep", "Glob", "Skill"],
};