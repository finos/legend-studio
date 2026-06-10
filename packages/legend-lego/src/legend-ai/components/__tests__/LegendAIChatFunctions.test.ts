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
  isStringColumn,
  isNumericColumn,
  isDateColumn,
  buildSuggestedQueries,
} from '../LegendAIChatHelpers.js';
import type {
  TDSServiceSchema,
  LegendAIProductMetadata,
} from '../../LegendAITypes.js';

// ─── isStringColumn ──────────────────────────────────────────────────────────

describe(unitTest('isStringColumn'), () => {
  test('returns true for String type without id in name', () => {
    expect(isStringColumn({ name: 'ticker', type: 'String' })).toBe(true);
  });

  test('returns false for String type with id in name', () => {
    expect(isStringColumn({ name: 'tradeId', type: 'String' })).toBe(false);
  });

  test('returns false for Integer type', () => {
    expect(isStringColumn({ name: 'amount', type: 'Integer' })).toBe(false);
  });

  test('returns false when type is undefined', () => {
    expect(isStringColumn({ name: 'name' })).toBe(false);
  });
});

// ─── isNumericColumn ─────────────────────────────────────────────────────────

describe(unitTest('isNumericColumn'), () => {
  test('returns true for Number type', () => {
    expect(isNumericColumn({ name: 'amount', type: 'Number' })).toBe(true);
  });

  test('returns true for Integer type', () => {
    expect(isNumericColumn({ name: 'count', type: 'Integer' })).toBe(true);
  });

  test('returns true for Float type', () => {
    expect(isNumericColumn({ name: 'price', type: 'Float' })).toBe(true);
  });

  test('returns true for Decimal type', () => {
    expect(isNumericColumn({ name: 'rate', type: 'Decimal' })).toBe(true);
  });

  test('returns false for String type', () => {
    expect(isNumericColumn({ name: 'name', type: 'String' })).toBe(false);
  });

  test('returns false when type is undefined', () => {
    expect(isNumericColumn({ name: 'x' })).toBe(false);
  });
});

// ─── isDateColumn ────────────────────────────────────────────────────────────

describe(unitTest('isDateColumn'), () => {
  test('returns true for Date type', () => {
    expect(isDateColumn({ name: 'created', type: 'Date' })).toBe(true);
  });

  test('returns true for StrictDate type', () => {
    expect(isDateColumn({ name: 'effectiveDate', type: 'StrictDate' })).toBe(
      true,
    );
  });

  test('returns true for DateTime type', () => {
    expect(isDateColumn({ name: 'ts', type: 'DateTime' })).toBe(true);
  });

  test('returns true for column name containing date', () => {
    expect(isDateColumn({ name: 'tradeDate', type: 'String' })).toBe(true);
  });

  test('returns true for column name containing time', () => {
    expect(isDateColumn({ name: 'timestamp', type: 'String' })).toBe(true);
  });

  test('returns false for non-date column', () => {
    expect(isDateColumn({ name: 'amount', type: 'Number' })).toBe(false);
  });

  test('returns false when type is undefined and name has no date hint', () => {
    expect(isDateColumn({ name: 'ticker' })).toBe(false);
  });
});

// ─── buildSuggestedQueries ───────────────────────────────────────────────────

const TEST__metadata: LegendAIProductMetadata = {
  name: 'TestProduct',
  coordinates: 'com.test:prod:1.0',
  serviceSummaries: [],
};

describe(unitTest('buildSuggestedQueries'), () => {
  test('returns metadata-only suggestions when no services', () => {
    const result = buildSuggestedQueries([], TEST__metadata);
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0]).toContain('TestProduct');
    expect(result).toContain('What access points are available?');
    expect(result).toContain('Describe the data model and key entities');
  });

  test('returns record and distinct suggestions when service has columns', () => {
    const services: TDSServiceSchema[] = [
      {
        title: 'TradeService',
        pattern: '/trades',
        columns: [
          { name: 'tradeId', type: 'String' },
          { name: 'amount', type: 'Number' },
          { name: 'tradeDate', type: 'StrictDate' },
          { name: 'ticker', type: 'String' },
        ],
        parameters: [],
      },
    ];
    const result = buildSuggestedQueries(services, TEST__metadata);
    expect(result).toContain('Show 10 records from TradeService');
    expect(result.some((s) => s.includes('distinct ticker values'))).toBe(true);
  });

  test('returns insight suggestions with string and numeric columns', () => {
    const services: TDSServiceSchema[] = [
      {
        title: 'SalesService',
        pattern: '/sales',
        columns: [
          { name: 'region', type: 'String' },
          { name: 'revenue', type: 'Number' },
        ],
        parameters: [],
      },
    ];
    const result = buildSuggestedQueries(services, TEST__metadata);
    expect(result.some((s) => s.includes('distinct region values'))).toBe(true);
  });

  test('returns second-service suggestions for 2+ services', () => {
    const services: TDSServiceSchema[] = [
      {
        title: 'ServiceA',
        pattern: '/a',
        columns: [
          { name: 'key', type: 'String' },
          { name: 'val', type: 'Number' },
        ],
        parameters: [],
      },
      {
        title: 'ServiceB',
        pattern: '/b',
        columns: [
          { name: 'key', type: 'String' },
          { name: 'score', type: 'Float' },
        ],
        parameters: [],
      },
    ];
    const result = buildSuggestedQueries(services, TEST__metadata);
    expect(result.some((s) => s.includes('ServiceB'))).toBe(true);
  });

  test('caps at MAX_SUGGESTED_QUERIES', () => {
    const services: TDSServiceSchema[] = [
      {
        title: 'BigService',
        pattern: '/big',
        columns: [
          { name: 'name', type: 'String' },
          { name: 'value', type: 'Number' },
          { name: 'createdDate', type: 'StrictDate' },
        ],
        parameters: [],
      },
      {
        title: 'AnotherService',
        pattern: '/another',
        columns: [
          { name: 'name', type: 'String' },
          { name: 'score', type: 'Float' },
        ],
        parameters: [],
      },
    ];
    const result = buildSuggestedQueries(services, TEST__metadata);
    expect(result.length).toBeLessThanOrEqual(8);
  });

  test('includes distinct-values suggestion when string column present', () => {
    const services: TDSServiceSchema[] = [
      {
        title: 'TextService',
        pattern: '/text',
        columns: [
          { name: 'category', type: 'String' },
          { name: 'label', type: 'String' },
        ],
        parameters: [],
      },
    ];
    const result = buildSuggestedQueries(services, TEST__metadata);
    expect(
      result.some((s) => s.includes('distinct') && s.includes('category')),
    ).toBe(true);
  });

  test('includes total suggestion when numeric only, no string column', () => {
    const services: TDSServiceSchema[] = [
      {
        title: 'NumericService',
        pattern: '/num',
        columns: [
          { name: 'tradeId', type: 'String' },
          { name: 'amount', type: 'Number' },
        ],
        parameters: [],
      },
    ];
    const result = buildSuggestedQueries(services, TEST__metadata);
    // tradeId is string type but has 'id' in name so isStringColumn returns false
    expect(
      result.some((s) => s.includes('total') && s.includes('amount')),
    ).toBe(true);
  });

  test('returns overview when service has no columns', () => {
    const services: TDSServiceSchema[] = [
      {
        title: 'EmptyService',
        pattern: '/empty',
        columns: [],
        parameters: [],
      },
    ];
    const result = buildSuggestedQueries(services, TEST__metadata);
    expect(result[0]).toContain('TestProduct');
  });
});
