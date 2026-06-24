/**
 * Copyright (c) 2026-present, Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { test, describe, expect } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import {
  classifyQuestionIntentFast,
  classifyQuestionIntent,
  LegendAIQuestionIntent,
  buildColumnDefsFromNames,
  TDSColumnSchema,
  TDSParameterSchema,
  TDSServiceSchema,
  LegendAIConfig,
  LegendAIGridData,
  LegendAIThinkingStep,
  LegendAIThinkingStepStatus,
} from '../LegendAITypes.js';

describe(unitTest('classifyQuestionIntentFast — metadata questions'), () => {
  test('product description question → metadata', () => {
    const result = classifyQuestionIntentFast(
      'What does this data product do?',
      true,
    );
    expect(result.intent).toBe(LegendAIQuestionIntent.METADATA);
    expect(result.ambiguous).toBe(false);
    expect(result.metaScore).toBeGreaterThan(0);
  });

  test('summarize request → metadata', () => {
    const result = classifyQuestionIntentFast(
      'Summarize what this product provides',
      true,
    );
    expect(result.intent).toBe(LegendAIQuestionIntent.METADATA);
    expect(result.ambiguous).toBe(false);
  });

  test('ownership question → metadata', () => {
    const result = classifyQuestionIntentFast(
      'Who owns this data product?',
      true,
    );
    expect(result.intent).toBe(LegendAIQuestionIntent.METADATA);
    expect(result.metaScore).toBeGreaterThan(0);
  });

  test('list services question → metadata', () => {
    const result = classifyQuestionIntentFast(
      'What services are available?',
      true,
    );
    expect(result.intent).toBe(LegendAIQuestionIntent.METADATA);
    expect(result.ambiguous).toBe(false);
  });

  test('tell me about the dataspace → metadata', () => {
    const result = classifyQuestionIntentFast(
      'Tell me about this dataspace',
      true,
    );
    expect(result.intent).toBe(LegendAIQuestionIntent.METADATA);
    expect(result.ambiguous).toBe(false);
  });

  test('classifications/tags question → metadata', () => {
    const result = classifyQuestionIntentFast(
      'What are the classifications of this product?',
      true,
    );
    expect(result.intent).toBe(LegendAIQuestionIntent.METADATA);
  });

  test('how many services → metadata', () => {
    const result = classifyQuestionIntentFast(
      'How many services does this data product have?',
      true,
    );
    expect(result.intent).toBe(LegendAIQuestionIntent.METADATA);
  });

  test('capability discovery question → metadata (not ambiguous)', () => {
    const result = classifyQuestionIntentFast(
      'What data does LSEG Programmatic News offer and how can I use it?',
      true,
    );
    expect(result.intent).toBe(LegendAIQuestionIntent.METADATA);
    expect(result.metaScore).toBeGreaterThan(0);
    expect(result.dataScore).toBe(0);
    expect(result.ambiguous).toBe(false);
  });

  test('how are services related → metadata', () => {
    const result = classifyQuestionIntentFast(
      'How are these 2 services related and is there any way we can join them?',
      true,
    );
    expect(result.intent).toBe(LegendAIQuestionIntent.METADATA);
    expect(result.ambiguous).toBe(false);
  });

  test('relationship between services → metadata', () => {
    const result = classifyQuestionIntentFast(
      'What is the relationship between ServiceA and ServiceB?',
      true,
    );
    expect(result.intent).toBe(LegendAIQuestionIntent.METADATA);
  });

  test('can we combine/link these → metadata', () => {
    const result = classifyQuestionIntentFast(
      'Can we combine these two access points?',
      true,
    );
    expect(result.intent).toBe(LegendAIQuestionIntent.METADATA);
  });
});
describe(unitTest('classifyQuestionIntentFast — data query questions'), () => {
  test('SQL keyword → data_query', () => {
    const result = classifyQuestionIntentFast(
      'SELECT the top 10 rows from trades',
      true,
    );
    expect(result.intent).toBe(LegendAIQuestionIntent.DATA_QUERY);
    expect(result.ambiguous).toBe(false);
    expect(result.dataScore).toBeGreaterThan(0);
  });

  test('top N request → data_query', () => {
    const result = classifyQuestionIntentFast(
      'Show me the top 5 trades by amount',
      true,
    );
    expect(result.intent).toBe(LegendAIQuestionIntent.DATA_QUERY);
  });

  test('filter/where → data_query', () => {
    const result = classifyQuestionIntentFast(
      'Filter trades where amount > 1000',
      true,
    );
    expect(result.intent).toBe(LegendAIQuestionIntent.DATA_QUERY);
    expect(result.dataScore).toBeGreaterThan(0);
  });

  test('aggregation request → data_query', () => {
    const result = classifyQuestionIntentFast(
      'Show total revenue grouped by region',
      true,
    );
    expect(result.intent).toBe(LegendAIQuestionIntent.DATA_QUERY);
  });

  test('date-based query → data_query', () => {
    const result = classifyQuestionIntentFast(
      'Get trades since 2024-01-01',
      true,
    );
    expect(result.intent).toBe(LegendAIQuestionIntent.DATA_QUERY);
  });

  test('financial terms → data_query', () => {
    const result = classifyQuestionIntentFast(
      'Show me the revenue breakdown by country',
      true,
    );
    expect(result.intent).toBe(LegendAIQuestionIntent.DATA_QUERY);
  });

  test('ISIN/ticker reference → data_query', () => {
    const result = classifyQuestionIntentFast(
      'Find trades for ISIN US1234567890',
      true,
    );
    expect(result.intent).toBe(LegendAIQuestionIntent.DATA_QUERY);
  });

  test('SQL JOIN keyword → data_query', () => {
    const result = classifyQuestionIntentFast(
      'Join on the tables between trades and instruments',
      true,
    );
    expect(result.intent).toBe(LegendAIQuestionIntent.DATA_QUERY);
  });
});
describe(unitTest('classifyQuestionIntentFast — tiebreakers'), () => {
  test('product reference overrides data signals → metadata', () => {
    const result = classifyQuestionIntentFast(
      'Show me what this data product provides',
      true,
    );
    expect(result.intent).toBe(LegendAIQuestionIntent.METADATA);
  });

  test('structural keyword overrides data signals → metadata', () => {
    // "what are the available services" triggers METADATA pattern:
    //   /\b(list|what\s+are)\s+(the\s+)?(available\s+)?(services?|endpoints?|..)/
    // "get" triggers a DATA pattern:
    //   /(show|give|get|fetch|retrieve|..)\s+(me\s+)?/
    // The STRUCTURAL_KEYWORD_PATTERN then tiebreaks → metadata.
    const result = classifyQuestionIntentFast(
      'What are the services I can get data from?',
      true,
    );
    expect(result.metaScore).toBeGreaterThan(0);
    expect(result.dataScore).toBeGreaterThan(0);
    expect(result.intent).toBe(LegendAIQuestionIntent.METADATA);
  });

  test('strong data dominance (≥ 2× meta) → data_query', () => {
    const result = classifyQuestionIntentFast(
      'Show total sum of revenue grouped by region from service for last year',
      true,
    );
    expect(result.intent).toBe(LegendAIQuestionIntent.DATA_QUERY);
    expect(result.dataScore).toBeGreaterThanOrEqual(result.metaScore * 2);
  });

  test('ambiguous when scores are close', () => {
    // "tell me about" triggers meta; "revenue" triggers data — close scores
    const result = classifyQuestionIntentFast(
      'tell me about the revenue breakdown',
      true,
    );
    expect(result.metaScore).toBeGreaterThan(0);
    expect(result.dataScore).toBeGreaterThan(0);
  });

  test('ambiguous with metaScore > dataScore → metadata', () => {
    // "tell me about" + "what can I" trigger multiple meta signals;
    // "revenue" triggers one data signal — meta dominates
    const result = classifyQuestionIntentFast(
      'tell me about what can I do with revenue',
      true,
    );
    expect(result.metaScore).toBeGreaterThan(result.dataScore);
    expect(result.intent).toBe(LegendAIQuestionIntent.METADATA);
    expect(result.ambiguous).toBe(true);
  });
});
describe(
  unitTest('classifyQuestionIntentFast — explicit metadata overrides'),
  () => {
    test('"just answer from metadata" → metadata (not ambiguous)', () => {
      const result = classifyQuestionIntentFast(
        'How are these services related, just answer from metadata do not query',
        true,
      );
      expect(result.intent).toBe(LegendAIQuestionIntent.METADATA);
      expect(result.ambiguous).toBe(false);
    });

    test('"don\'t query" → metadata (not ambiguous)', () => {
      const result = classifyQuestionIntentFast(
        "Show me the relationship between services, don't query the data",
        true,
      );
      expect(result.intent).toBe(LegendAIQuestionIntent.METADATA);
      expect(result.ambiguous).toBe(false);
    });

    test('"do not execute" → metadata (not ambiguous)', () => {
      const result = classifyQuestionIntentFast(
        'List the columns, do not execute any sql',
        true,
      );
      expect(result.intent).toBe(LegendAIQuestionIntent.METADATA);
      expect(result.ambiguous).toBe(false);
    });

    test('"without querying" → metadata (not ambiguous)', () => {
      const result = classifyQuestionIntentFast(
        'Compare these two services without querying',
        true,
      );
      expect(result.intent).toBe(LegendAIQuestionIntent.METADATA);
      expect(result.ambiguous).toBe(false);
    });

    test('"just explain" → metadata (not ambiguous)', () => {
      const result = classifyQuestionIntentFast(
        'Just explain how the holdings data is structured',
        true,
      );
      expect(result.intent).toBe(LegendAIQuestionIntent.METADATA);
      expect(result.ambiguous).toBe(false);
    });
  },
);

describe(unitTest('classifyQuestionIntentFast — fallback'), () => {
  test('unrecognized question with services → data_query (ambiguous)', () => {
    const result = classifyQuestionIntentFast('hello world', true);
    expect(result.intent).toBe(LegendAIQuestionIntent.DATA_QUERY);
    expect(result.ambiguous).toBe(true);
    expect(result.metaScore).toBe(0);
    expect(result.dataScore).toBe(0);
  });

  test('unrecognized question without services → metadata (ambiguous)', () => {
    const result = classifyQuestionIntentFast('hello world', false);
    expect(result.intent).toBe(LegendAIQuestionIntent.METADATA);
    expect(result.ambiguous).toBe(true);
  });

  test('empty string without services → metadata (ambiguous)', () => {
    const result = classifyQuestionIntentFast('', false);
    expect(result.intent).toBe(LegendAIQuestionIntent.METADATA);
    expect(result.ambiguous).toBe(true);
  });
});
describe(unitTest('classifyQuestionIntent — legacy wrapper'), () => {
  test('returns just the intent string', () => {
    expect(classifyQuestionIntent('What does this product do?', true)).toBe(
      LegendAIQuestionIntent.METADATA,
    );
    expect(classifyQuestionIntent('Show top 10 trades', true)).toBe(
      LegendAIQuestionIntent.DATA_QUERY,
    );
    expect(classifyQuestionIntent('hello world', true)).toBe(
      LegendAIQuestionIntent.DATA_QUERY,
    );
    expect(classifyQuestionIntent('hello world', false)).toBe(
      LegendAIQuestionIntent.METADATA,
    );
  });
});

describe(unitTest('buildColumnDefsFromNames'), () => {
  test('builds column definitions from string array', () => {
    const defs = buildColumnDefsFromNames(['region', 'amount']);
    expect(defs).toHaveLength(2);
    expect(defs[0]?.colId).toBe('region');
    expect(defs[0]?.headerName).toBe('region');
    expect(defs[0]?.field).toBe('region');
    expect(defs[1]?.colId).toBe('amount');
  });

  test('returns empty array for empty input', () => {
    expect(buildColumnDefsFromNames([])).toHaveLength(0);
  });
});

describe(unitTest('LegendAITypes — class instantiation'), () => {
  test('TDSColumnSchema has expected defaults', () => {
    const col = new TDSColumnSchema();
    expect(col.type).toBeUndefined();
    expect(col.documentation).toBeUndefined();
    expect(col.sampleValues).toBeUndefined();
    expect(col.nullable).toBeUndefined();
    expect(col.relationalType).toBeUndefined();
  });

  test('TDSParameterSchema has expected defaults', () => {
    const param = new TDSParameterSchema();
    expect(param.type).toBeUndefined();
    expect(param.required).toBeUndefined();
  });

  test('TDSServiceSchema has expected defaults', () => {
    const svc = new TDSServiceSchema();
    expect(svc.sourceType).toBeUndefined();
    expect(svc.dataProductPath).toBeUndefined();
    expect(svc.parameterExtractionFailed).toBeUndefined();
    expect(svc.parameterSchemas).toBeUndefined();
    expect(svc.description).toBeUndefined();
  });

  test('LegendAIConfig has expected defaults', () => {
    const config = new LegendAIConfig();
    expect(config.llmModelOptions).toBeUndefined();
    expect(config.maxJudgeAttempts).toBeUndefined();
    expect(config.orchestratorAuthToken).toBeUndefined();
    expect(config.lakehouseEnvironment).toBeUndefined();
  });

  test('LegendAIGridData has expected shape', () => {
    const grid = new LegendAIGridData();
    expect(grid.columnDefs).toBeUndefined();
    expect(grid.rowData).toBeUndefined();
  });

  test('LegendAIThinkingStep has expected shape', () => {
    const step = new LegendAIThinkingStep();
    step.id = '1';
    step.label = 'test';
    step.status = LegendAIThinkingStepStatus.ACTIVE;
    expect(step.id).toBe('1');
  });
});
