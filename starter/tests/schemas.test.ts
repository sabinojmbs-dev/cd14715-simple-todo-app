import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

import {
  CodeQualityResultSchema,
  TestCoverageResultSchema,
  RefactoringSuggestionSchema,
  ReviewReportSchema,
  CodeQualityResultJSONSchema,
  TestCoverageResultJSONSchema,
  RefactoringSuggestionJSONSchema,
  ReviewReportJSONSchema,
} from '../src/types/index.js';

type JsonSchema = Record<string, unknown>;

const convertToJsonSchema = (
  schema: unknown
): JsonSchema =>
  (
    zodToJsonSchema as (
      schema: unknown,
      options?: unknown
    ) => unknown
  )(
    schema,
    { $refStrategy: 'none' }
  ) as JsonSchema;

/**
 * Reusable valid test fixtures
 */

const validCodeQualityResult = {
  file: 'src/example.ts',
  issues: [
    {
      line: 10,
      severity: 'high' as const,
      category: 'security' as const,
      description: 'User input is processed without validation.',
      suggestion: 'Validate and sanitize user input before processing.',
    },
  ],
  overallScore: 85,
  summary: 'The code is generally maintainable with one security concern.',
};

const validTestCoverageResult = {
  file: 'src/example.ts',
  hasTests: true,
  testFiles: ['tests/example.test.ts'],
  untestedPaths: [
    {
      type: 'branch' as const,
      location: 'src/example.ts:20',
      priority: 'high' as const,
      reasoning: 'The invalid-input branch is not covered.',
      suggestedTest: 'Add a test that passes invalid input.',
    },
  ],
  coverageEstimate: 80,
  summary: 'Most primary paths are tested, but an error path is missing.',
};

const validRefactoringSuggestion = {
  file: 'src/example.ts',
  suggestions: [
    {
      type: 'extract-function' as const,
      location: 'src/example.ts:30',
      impact: 'medium' as const,
      description: 'The function performs multiple responsibilities.',
      before: 'function process() { validate(); save(); notify(); }',
      after:
        'function process() { validate(); saveRecord(); notifyUser(); }',
      benefits: 'Improves readability, testability, and maintainability.',
    },
  ],
  summary: 'The code contains one useful refactoring opportunity.',
};

const validReviewReport = {
  pullRequest: {
    owner: 'octocat',
    repo: 'Hello-World',
    number: 1,
  },
  fileReviews: [
    {
      file: 'src/example.ts',
      codeQuality: validCodeQualityResult,
      testCoverage: validTestCoverageResult,
      refactorings: validRefactoringSuggestion,
    },
  ],
  summary: {
    totalFiles: 1,
    overallScore: 85,
    criticalIssues: 0,
    highPriorityTests: 1,
    refactoringOpportunities: 1,
  },
  recommendations: [
    {
      priority: 'high' as const,
      category: 'security',
      description: 'Validate input before processing it.',
      files: ['src/example.ts'],
    },
  ],
  metadata: {
    analyzedAt: '2026-10-14T12:00:00.000Z',
    duration: 1500,
    agentVersions: {
      'code-quality-analyzer': '1.0',
      'test-coverage-analyzer': '1.0',
      'refactoring-suggester': '1.0',
    },
  },
};

describe('CodeQualityResultSchema', () => {
  it('accepts valid code quality data', () => {
    expect(() =>
      CodeQualityResultSchema.parse(validCodeQualityResult)
    ).not.toThrow();
  });

  it('accepts all valid severity values', () => {
    const severities = [
      'critical',
      'high',
      'medium',
      'low',
      'info',
    ] as const;

    for (const severity of severities) {
      const data = {
        ...validCodeQualityResult,
        issues: [
          {
            ...validCodeQualityResult.issues[0],
            severity,
          },
        ],
      };

      expect(() =>
        CodeQualityResultSchema.parse(data)
      ).not.toThrow();
    }
  });

  it('accepts all valid category values', () => {
    const categories = [
      'security',
      'performance',
      'maintainability',
      'style',
      'bug-risk',
      'best-practice',
    ] as const;

    for (const category of categories) {
      const data = {
        ...validCodeQualityResult,
        issues: [
          {
            ...validCodeQualityResult.issues[0],
            category,
          },
        ],
      };

      expect(() =>
        CodeQualityResultSchema.parse(data)
      ).not.toThrow();
    }
  });

  it('accepts an empty issues array', () => {
    const data = {
      ...validCodeQualityResult,
      issues: [],
    };

    expect(() =>
      CodeQualityResultSchema.parse(data)
    ).not.toThrow();
  });

  it('accepts the minimum overall score of 0', () => {
    const data = {
      ...validCodeQualityResult,
      overallScore: 0,
    };

    expect(() =>
      CodeQualityResultSchema.parse(data)
    ).not.toThrow();
  });

  it('accepts the maximum overall score of 100', () => {
    const data = {
      ...validCodeQualityResult,
      overallScore: 100,
    };

    expect(() =>
      CodeQualityResultSchema.parse(data)
    ).not.toThrow();
  });

  it('rejects an overall score below 0', () => {
    const data = {
      ...validCodeQualityResult,
      overallScore: -1,
    };

    expect(() =>
      CodeQualityResultSchema.parse(data)
    ).toThrow(ZodError);
  });

  it('rejects an overall score above 100', () => {
    const data = {
      ...validCodeQualityResult,
      overallScore: 101,
    };

    expect(() =>
      CodeQualityResultSchema.parse(data)
    ).toThrow(ZodError);
  });

  it('rejects an invalid severity value', () => {
    const data = {
      ...validCodeQualityResult,
      issues: [
        {
          ...validCodeQualityResult.issues[0],
          severity: 'urgent',
        },
      ],
    };

    expect(() =>
      CodeQualityResultSchema.parse(data)
    ).toThrow(ZodError);
  });

  it('rejects an invalid category value', () => {
    const data = {
      ...validCodeQualityResult,
      issues: [
        {
          ...validCodeQualityResult.issues[0],
          category: 'documentation',
        },
      ],
    };

    expect(() =>
      CodeQualityResultSchema.parse(data)
    ).toThrow(ZodError);
  });

  it('rejects a line number with the wrong type', () => {
    const data = {
      ...validCodeQualityResult,
      issues: [
        {
          ...validCodeQualityResult.issues[0],
          line: '10',
        },
      ],
    };

    expect(() =>
      CodeQualityResultSchema.parse(data)
    ).toThrow(ZodError);
  });

  it('rejects missing required fields', () => {
    const invalidData = {
      file: 'src/example.ts',
    };

    expect(() =>
      CodeQualityResultSchema.parse(invalidData)
    ).toThrow(ZodError);
  });
});

describe('TestCoverageResultSchema', () => {
  it('accepts valid test coverage data', () => {
    expect(() =>
      TestCoverageResultSchema.parse(validTestCoverageResult)
    ).not.toThrow();
  });

  it('accepts all valid untested path types', () => {
    const types = [
      'function',
      'class',
      'branch',
      'edge-case',
    ] as const;

    for (const type of types) {
      const data = {
        ...validTestCoverageResult,
        untestedPaths: [
          {
            ...validTestCoverageResult.untestedPaths[0],
            type,
          },
        ],
      };

      expect(() =>
        TestCoverageResultSchema.parse(data)
      ).not.toThrow();
    }
  });

  it('accepts empty testFiles and untestedPaths arrays', () => {
    const data = {
      ...validTestCoverageResult,
      hasTests: false,
      testFiles: [],
      untestedPaths: [],
      coverageEstimate: 0,
    };

    expect(() =>
      TestCoverageResultSchema.parse(data)
    ).not.toThrow();
  });

  it('accepts the minimum coverage estimate of 0', () => {
    const data = {
      ...validTestCoverageResult,
      coverageEstimate: 0,
    };

    expect(() =>
      TestCoverageResultSchema.parse(data)
    ).not.toThrow();
  });

  it('accepts the maximum coverage estimate of 100', () => {
    const data = {
      ...validTestCoverageResult,
      coverageEstimate: 100,
    };

    expect(() =>
      TestCoverageResultSchema.parse(data)
    ).not.toThrow();
  });

  it('rejects a coverage estimate below 0', () => {
    const data = {
      ...validTestCoverageResult,
      coverageEstimate: -1,
    };

    expect(() =>
      TestCoverageResultSchema.parse(data)
    ).toThrow(ZodError);
  });

  it('rejects a coverage estimate above 100', () => {
    const data = {
      ...validTestCoverageResult,
      coverageEstimate: 101,
    };

    expect(() =>
      TestCoverageResultSchema.parse(data)
    ).toThrow(ZodError);
  });

  it('rejects an invalid untested path type', () => {
    const data = {
      ...validTestCoverageResult,
      untestedPaths: [
        {
          ...validTestCoverageResult.untestedPaths[0],
          type: 'method',
        },
      ],
    };

    expect(() =>
      TestCoverageResultSchema.parse(data)
    ).toThrow(ZodError);
  });

  it('rejects an invalid priority', () => {
    const data = {
      ...validTestCoverageResult,
      untestedPaths: [
        {
          ...validTestCoverageResult.untestedPaths[0],
          priority: 'urgent',
        },
      ],
    };

    expect(() =>
      TestCoverageResultSchema.parse(data)
    ).toThrow(ZodError);
  });

  it('rejects hasTests with the wrong type', () => {
    const data = {
      ...validTestCoverageResult,
      hasTests: 'yes',
    };

    expect(() =>
      TestCoverageResultSchema.parse(data)
    ).toThrow(ZodError);
  });

  it('rejects missing required fields', () => {
    const invalidData = {
      file: 'src/example.ts',
      hasTests: true,
    };

    expect(() =>
      TestCoverageResultSchema.parse(invalidData)
    ).toThrow(ZodError);
  });
});

describe('RefactoringSuggestionSchema', () => {
  it('accepts valid refactoring data', () => {
    expect(() =>
      RefactoringSuggestionSchema.parse(
        validRefactoringSuggestion
      )
    ).not.toThrow();
  });

  it('accepts all valid refactoring types', () => {
    const types = [
      'extract-function',
      'rename',
      'modernize',
      'simplify',
      'pattern-improvement',
    ] as const;

    for (const type of types) {
      const data = {
        ...validRefactoringSuggestion,
        suggestions: [
          {
            ...validRefactoringSuggestion.suggestions[0],
            type,
          },
        ],
      };

      expect(() =>
        RefactoringSuggestionSchema.parse(data)
      ).not.toThrow();
    }
  });

  it('accepts all valid impact values', () => {
    const impacts = ['low', 'medium', 'high'] as const;

    for (const impact of impacts) {
      const data = {
        ...validRefactoringSuggestion,
        suggestions: [
          {
            ...validRefactoringSuggestion.suggestions[0],
            impact,
          },
        ],
      };

      expect(() =>
        RefactoringSuggestionSchema.parse(data)
      ).not.toThrow();
    }
  });

  it('accepts an empty suggestions array', () => {
    const data = {
      ...validRefactoringSuggestion,
      suggestions: [],
    };

    expect(() =>
      RefactoringSuggestionSchema.parse(data)
    ).not.toThrow();
  });

  it('rejects an invalid refactoring type', () => {
    const data = {
      ...validRefactoringSuggestion,
      suggestions: [
        {
          ...validRefactoringSuggestion.suggestions[0],
          type: 'rewrite-everything',
        },
      ],
    };

    expect(() =>
      RefactoringSuggestionSchema.parse(data)
    ).toThrow(ZodError);
  });

  it('rejects an invalid impact value', () => {
    const data = {
      ...validRefactoringSuggestion,
      suggestions: [
        {
          ...validRefactoringSuggestion.suggestions[0],
          impact: 'critical',
        },
      ],
    };

    expect(() =>
      RefactoringSuggestionSchema.parse(data)
    ).toThrow(ZodError);
  });

  it('rejects missing suggestion fields', () => {
    const data = {
      ...validRefactoringSuggestion,
      suggestions: [
        {
          type: 'rename',
        },
      ],
    };

    expect(() =>
      RefactoringSuggestionSchema.parse(data)
    ).toThrow(ZodError);
  });

  it('rejects missing top-level required fields', () => {
    const invalidData = {
      file: 'src/example.ts',
    };

    expect(() =>
      RefactoringSuggestionSchema.parse(invalidData)
    ).toThrow(ZodError);
  });
});

describe('ReviewReportSchema', () => {
  it('accepts a valid complete review report', () => {
    expect(() =>
      ReviewReportSchema.parse(validReviewReport)
    ).not.toThrow();
  });

  it('accepts empty fileReviews and recommendations arrays', () => {
    const data = {
      ...validReviewReport,
      fileReviews: [],
      recommendations: [],
      summary: {
        totalFiles: 0,
        overallScore: 0,
        criticalIssues: 0,
        highPriorityTests: 0,
        refactoringOpportunities: 0,
      },
    };

    expect(() =>
      ReviewReportSchema.parse(data)
    ).not.toThrow();
  });

  it('accepts an empty agentVersions record', () => {
    const data = {
      ...validReviewReport,
      metadata: {
        ...validReviewReport.metadata,
        agentVersions: {},
      },
    };

    expect(() =>
      ReviewReportSchema.parse(data)
    ).not.toThrow();
  });

  it('accepts all valid recommendation priorities', () => {
    const priorities = [
      'critical',
      'high',
      'medium',
      'low',
    ] as const;

    for (const priority of priorities) {
      const data = {
        ...validReviewReport,
        recommendations: [
          {
            ...validReviewReport.recommendations[0],
            priority,
          },
        ],
      };

      expect(() =>
        ReviewReportSchema.parse(data)
      ).not.toThrow();
    }
  });

  it('rejects a missing pullRequest field', () => {
    const invalidData = {
      fileReviews: validReviewReport.fileReviews,
      summary: validReviewReport.summary,
      recommendations: validReviewReport.recommendations,
      metadata: validReviewReport.metadata,
    };

    expect(() =>
      ReviewReportSchema.parse(invalidData)
    ).toThrow(ZodError);
  });

  it('rejects a pull request number with the wrong type', () => {
    const data = {
      ...validReviewReport,
      pullRequest: {
        ...validReviewReport.pullRequest,
        number: '1',
      },
    };

    expect(() =>
      ReviewReportSchema.parse(data)
    ).toThrow(ZodError);
  });

  it('rejects an invalid recommendation priority', () => {
    const data = {
      ...validReviewReport,
      recommendations: [
        {
          ...validReviewReport.recommendations[0],
          priority: 'urgent',
        },
      ],
    };

    expect(() =>
      ReviewReportSchema.parse(data)
    ).toThrow(ZodError);
  });

  it('rejects invalid nested code quality data', () => {
    const firstFileReview = validReviewReport.fileReviews[0];

    expect(firstFileReview).toBeDefined();

    if (!firstFileReview) {
      throw new Error('Test fixture is missing a file review');
    }

    const data = {
      ...validReviewReport,
      fileReviews: [
        {
          ...firstFileReview,
          codeQuality: {
            ...validCodeQualityResult,
            overallScore: 101,
          },
        },
      ],
    };

    expect(() =>
      ReviewReportSchema.parse(data)
    ).toThrow(ZodError);
  });

  it('rejects invalid nested test coverage data', () => {
    const firstFileReview = validReviewReport.fileReviews[0];

    expect(firstFileReview).toBeDefined();

    if (!firstFileReview) {
      throw new Error('Test fixture is missing a file review');
    }

    const data = {
      ...validReviewReport,
      fileReviews: [
        {
          ...firstFileReview,
          testCoverage: {
            ...validTestCoverageResult,
            coverageEstimate: -1,
          },
        },
      ],
    };

    expect(() =>
      ReviewReportSchema.parse(data)
    ).toThrow(ZodError);
  });

  it('rejects missing metadata fields', () => {
    const data = {
      ...validReviewReport,
      metadata: {
        analyzedAt: '2026-10-14T12:00:00.000Z',
      },
    };

    expect(() =>
      ReviewReportSchema.parse(data)
    ).toThrow(ZodError);
  });

  it('rejects agentVersions values with the wrong type', () => {
    const data = {
      ...validReviewReport,
      metadata: {
        ...validReviewReport.metadata,
        agentVersions: {
          'code-quality-analyzer': 1,
        },
      },
    };

    expect(() =>
      ReviewReportSchema.parse(data)
    ).toThrow(ZodError);
  });
});

describe('JSON Schema exports', () => {
  it('exports CodeQualityResultJSONSchema', () => {
    expect(CodeQualityResultJSONSchema).toBeDefined();
    expect(typeof CodeQualityResultJSONSchema).toBe('object');
    expect(CodeQualityResultJSONSchema).toHaveProperty('type', 'object');
    expect(CodeQualityResultJSONSchema).toHaveProperty('properties');
    expect(CodeQualityResultJSONSchema).toHaveProperty('required');

    const required =
      CodeQualityResultJSONSchema.required as string[];

    expect(required).toEqual(
      expect.arrayContaining([
        'file',
        'issues',
        'overallScore',
        'summary',
      ])
    );
  });

  it('exports TestCoverageResultJSONSchema', () => {
    expect(TestCoverageResultJSONSchema).toBeDefined();
    expect(typeof TestCoverageResultJSONSchema).toBe('object');
    expect(TestCoverageResultJSONSchema).toHaveProperty('type', 'object');
    expect(TestCoverageResultJSONSchema).toHaveProperty('properties');

    const required =
      TestCoverageResultJSONSchema.required as string[];

    expect(required).toEqual(
      expect.arrayContaining([
        'file',
        'hasTests',
        'testFiles',
        'untestedPaths',
        'coverageEstimate',
        'summary',
      ])
    );
  });

  it('exports RefactoringSuggestionJSONSchema', () => {
    expect(RefactoringSuggestionJSONSchema).toBeDefined();
    expect(typeof RefactoringSuggestionJSONSchema).toBe('object');
    expect(RefactoringSuggestionJSONSchema).toHaveProperty(
      'type',
      'object'
    );
    expect(RefactoringSuggestionJSONSchema).toHaveProperty(
      'properties'
    );

    const required =
      RefactoringSuggestionJSONSchema.required as string[];

    expect(required).toEqual(
      expect.arrayContaining([
        'file',
        'suggestions',
        'summary',
      ])
    );
  });

  it('exports ReviewReportJSONSchema', () => {
    expect(ReviewReportJSONSchema).toBeDefined();
    expect(typeof ReviewReportJSONSchema).toBe('object');
    expect(ReviewReportJSONSchema).toHaveProperty('type', 'object');
    expect(ReviewReportJSONSchema).toHaveProperty('properties');

    const required =
      ReviewReportJSONSchema.required as string[];

    expect(required).toEqual(
      expect.arrayContaining([
        'pullRequest',
        'fileReviews',
        'summary',
        'recommendations',
        'metadata',
      ])
    );
  });

  it('converts ReviewReportSchema using zodToJsonSchema', () => {
  const generatedSchema =
    convertToJsonSchema(ReviewReportSchema);

  expect(generatedSchema).toBeDefined();
  expect(generatedSchema).toHaveProperty('type', 'object');
  expect(generatedSchema).toHaveProperty('properties');
  expect(generatedSchema).toHaveProperty('required');

  const required =
    generatedSchema.required as string[];

  expect(required).toEqual(
    expect.arrayContaining([
      'pullRequest',
      'fileReviews',
      'summary',
      'recommendations',
      'metadata',
    ]));
    });
});