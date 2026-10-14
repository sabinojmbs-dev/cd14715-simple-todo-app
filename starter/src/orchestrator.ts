import { query } from "@anthropic-ai/claude-agent-sdk";
import { zodToJsonSchema } from "zod-to-json-schema";

import {
  codeQualityAnalyzer,
  testCoverageAnalyzer,
  refactoringSuggester,
} from "./agents/index.js";

import { mcpServersConfig } from "./config/mcp.config.js";
import { orchestratorPrompt } from "./prompts/index.js";
import {
  ReviewReportSchema,
  type ReviewReport,
} from "./types/index.js";

/**
 * Orchestrator configuration options
 */
export interface OrchestratorOptions {
  model?: string;
  maxTurns?: number;
}

/**
 * Main Code Review Orchestrator
 * Coordinates subagents to analyze pull requests and generate comprehensive reports
 */
export class CodeReviewOrchestrator {
  private readonly model: string;
  private readonly maxTurns: number;

  constructor(options: OrchestratorOptions = {}) {
  this.model =
    options.model ??
    process.env.ANTHROPIC_MODEL ??
    "sonnet";

  this.maxTurns = options.maxTurns ?? 20;
}

  /**
   * Review a pull request using parallel subagent analysis
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param prNumber - Pull request number
   * @returns Complete review report
   */
  async reviewPullRequest(
    owner: string,
    repo: string,
    prNumber: number
  ): Promise<ReviewReport> {
    if (!owner.trim()) {
      throw new Error("Repository owner is required");
    }

    if (!repo.trim()) {
      throw new Error("Repository name is required");
    }

    if (!Number.isInteger(prNumber) || prNumber <= 0) {
      throw new Error("Pull request number must be a positive integer");
    }

    const reviewReportJsonSchema = zodToJsonSchema(
      ReviewReportSchema,
      {
        $refStrategy: "none",
      }
    );

    const prompt = `
    ${orchestratorPrompt}
    
    Review the following pull request:

    Repository owner: ${owner}
    Repository name: ${repo}
    Pull request number: ${prNumber}

    Use GitHub MCP tools to fetch the pull request and changed files.

    Use the code-quality-analyzer agent to analyze the changed code.
    Use the test-coverage-analyzer agent to evaluate test completeness.
    Use the refactoring-suggester agent to identify refactoring opportunities.
    
    Invoke all three agents. Run independent analyses in parallel when possible.
    
    Aggregate the findings into one result that conforms exactly to ReviewReportSchema.`;

    let structuredOutput: unknown;

    for await (const message of query({
      prompt,
      options: {
        agents: {
          "code-quality-analyzer": codeQualityAnalyzer,
          "test-coverage-analyzer": testCoverageAnalyzer,
          "refactoring-suggester": refactoringSuggester,
        },

        mcpServers: mcpServersConfig,

        allowedTools: [
          "Task",
          "mcp__github__get_pull_request",
          "mcp__github__get_pull_request_files",
        ],

        model: this.model,
        maxTurns: this.maxTurns,

        permissionMode: "bypassPermissions",

        outputFormat: {
          type: "json_schema",
          schema: reviewReportJsonSchema,
        },
      },
    })) {
      if (
        message.type === "result" &&
        message.subtype === "success" &&
        message.structured_output !== undefined
      ) {
        structuredOutput = message.structured_output;
      }
    }

    if (structuredOutput === undefined) {
      throw new Error(
        "The review completed without returning a structured report"
      );
    }

    const validationResult =
      ReviewReportSchema.safeParse(structuredOutput);

    if (!validationResult.success) {
      const validationDetails =
        validationResult.error.issues
          .map(
            (issue) =>
              `${issue.path.join(".") || "root"}: ${issue.message}`
          )
          .join("; ");

      throw new Error(
        `The generated review report failed schema validation: ${validationDetails}`
      );
    }

    return validationResult.data;
  }
}