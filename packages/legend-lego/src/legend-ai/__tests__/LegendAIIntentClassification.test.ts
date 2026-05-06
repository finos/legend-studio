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
