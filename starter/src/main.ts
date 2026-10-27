import * as dotenv from 'dotenv';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import { CodeReviewOrchestrator } from './orchestrator.js';
import { ReportGenerator } from './utils/index.js';


// Load environment variables
dotenv.config();

/**
 * Main entry point for the Claude Multi-Agent Code Review System
 * Usage: npm run dev <owner> <repo> <pr-number>
 */
async function main() {
  const [owner, repo, prStr] = process.argv.slice(2);

  // Validate command-line arguments
  if (!owner || !repo || !prStr) {
    console.error(
      'Usage: npm run dev -- <owner> <repo> <pr-number>'
    );
    process.exit(1);
  }

  const prNumber = Number(prStr);
  if (!Number.isInteger(prNumber) || prNumber <= 0) {
    console.error(
      'Error: <pr-number> must be a positive integer.'
    );
    process.exit(1);
  }

  // Validate authentication (choose ONE method)
  const hasAnthropicApiKey = Boolean(process.env.ANTHROPIC_API_KEY);
  const hasAwsAccessKey = Boolean(process.env.AWS_ACCESS_KEY_ID);
  const hasAwsSecretKey = Boolean(process.env.AWS_SECRET_ACCESS_KEY);
  const hasAwsCredentials = hasAwsAccessKey && hasAwsSecretKey;

  if (hasAwsCredentials) {
    if (!process.env.AWS_REGION) {
      console.error('Error: AWS_REGION is required when using AWS Bedrock.');
      process.exit(1);
    }
    console.log('🔐 Using AWS Bedrock authentication');
  } else if (hasAnthropicApiKey) {
    console.log('🔐 Using Anthropic API authentication');
  } else {
    console.error(
      'Error: No valid authentication method configured.\n' +
      '\nConfigure one of the following:\n' +
      '1. Anthropic API:\n' +
      '   ANTHROPIC_API_KEY=<your-api-key>\n' +
      '\n2. AWS Bedrock:\n' +
      '   AWS_ACCESS_KEY_ID=<your-access-key>\n' +
      '   AWS_SECRET_ACCESS_KEY=<your-secret-key>\n' +
      '   AWS_REGION=<your-region>'
    );

    process.exit(1);
  }

  // Validate ANTHROPIC_MODEL environment variable
  if (!process.env.ANTHROPIC_MODEL) {
    console.error(
      'Error: ANTHROPIC_MODEL environment variable is required.\n' +
      '\nExamples:\n' +
      'AWS Bedrock:\n' +
      '  ANTHROPIC_MODEL=us.anthropic.claude-sonnet-4-5-20250929-v1:0\n' +
      '\nAnthropic API:\n' +
      '  ANTHROPIC_MODEL=claude-sonnet-4-5-20250929'
    );

    process.exit(1);
  }


  try {
    console.log(`Reviewing pull request ${owner}/${repo} #${prNumber}`);
    const orchestrator = new CodeReviewOrchestrator({
      model: process.env.ANTHROPIC_MODEL,
    });
    
    const result = await orchestrator.reviewPullRequest(
      owner,
      repo,
      prNumber
    );

    console.log('Review completed successfully.');

    const reportGenerator = new ReportGenerator();
    const markdownReport = reportGenerator.generateMarkdownReport(result);
    const htmlReport = reportGenerator.generateHTMLReport(result);
    const jsonReport = reportGenerator.generateJSONReport(result);
    const reportsDir = path.resolve('reports');

    await fs.mkdir(reportsDir, {
      recursive: true,
    });

    const baseFilename = `${owner}-${repo}-pr-${prNumber}`;

  const markdownPath = path.join(reportsDir, `${baseFilename}.md`);
  const htmlPath = path.join(reportsDir,`${baseFilename}.html`);
  const jsonPath = path.join(reportsDir,`${baseFilename}.json`);

  await Promise.all([
    fs.writeFile(
      markdownPath,
      markdownReport,
      'utf8'
    ),

    fs.writeFile(
      htmlPath,
      htmlReport,
      'utf8'
    ),

    fs.writeFile(
      jsonPath,
      jsonReport,
      'utf8'
    ),
  ]);
  
  console.log('Reports generated successfully:');
  console.log(`  Markdown: ${markdownPath}`);
  console.log(`  HTML:     ${htmlPath}`);
  console.log(`  JSON:     ${jsonPath}`);
  } catch (error) {
    const message = error instanceof Error ? error.message: String(error);
    console.error(`Review failed: ${message}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Review failed: ${message}`);
  process.exitCode = 1;
});