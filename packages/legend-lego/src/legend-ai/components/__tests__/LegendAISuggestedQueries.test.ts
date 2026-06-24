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

describe(unitTest('isStringColumn'), () => {
  test('returns true for string type', () => {
    expect(isStringColumn({ name: 'region', type: 'String' })).toBe(true);
  });

  test('returns false for non-primitive varchar type', () => {
    expect(isStringColumn({ name: 'name', type: 'VARCHAR' })).toBe(false);
  });

  test('returns false for string column with "id" in name', () => {
    expect(isStringColumn({ name: 'tradeId', type: 'String' })).toBe(false);
  });

  test('returns false for non-string type', () => {
    expect(isStringColumn({ name: 'amount', type: 'Number' })).toBe(false);
  });

  test('returns false for undefined type', () => {
    expect(isStringColumn({ name: 'region' })).toBe(false);
  });
});

describe(unitTest('isNumericColumn'), () => {
  test('returns true for number type', () => {
    expect(isNumericColumn({ name: 'amt', type: 'Number' })).toBe(true);
  });

  test('returns true for integer type', () => {
    expect(isNumericColumn({ name: 'count', type: 'Integer' })).toBe(true);
  });

  test('returns true for float type', () => {
    expect(isNumericColumn({ name: 'price', type: 'Float' })).toBe(true);
  });

  test('returns false for non-primitive double type', () => {
    expect(isNumericColumn({ name: 'val', type: 'Double' })).toBe(false);
  });

  test('returns true for decimal type', () => {
    expect(isNumericColumn({ name: 'rate', type: 'Decimal' })).toBe(true);
  });

  test('returns false for string type', () => {
    expect(isNumericColumn({ name: 'name', type: 'String' })).toBe(false);
  });

  test('returns false for undefined type', () => {
    expect(isNumericColumn({ name: 'x' })).toBe(false);
  });
});

describe(unitTest('isDateColumn'), () => {
  test('returns true for date type', () => {
    expect(isDateColumn({ name: 'col', type: 'Date' })).toBe(true);
  });

  test('returns true for datetime type', () => {
    expect(isDateColumn({ name: 'col', type: 'DateTime' })).toBe(true);
  });

  test('returns true for column name containing date', () => {
    expect(isDateColumn({ name: 'tradeDate', type: 'String' })).toBe(true);
  });

  test('returns true for column name containing time', () => {
    expect(isDateColumn({ name: 'createTime', type: 'String' })).toBe(true);
  });

  test('returns false for unrelated column', () => {
    expect(isDateColumn({ name: 'amount', type: 'Number' })).toBe(false);
  });

  test('handles undefined type with date name', () => {
    expect(isDateColumn({ name: 'startDate' })).toBe(true);
  });
});
describe(unitTest('buildSuggestedQueries'), () => {
  const metadata: LegendAIProductMetadata = {
    name: 'Trade Analytics',
    coordinates: 'com.example:trades:1.0.0',
    serviceSummaries: [],
  };

  test('returns overview + fallbacks when no services', () => {
    const result = buildSuggestedQueries([], metadata);
    expect(result).toHaveLength(3);
    expect(result[0]).toContain('Trade Analytics');
    expect(result[1]).toBe('What access points are available?');
    expect(result[2]).toBe('Describe the data model and key entities');
  });

  test('generates distinct-values suggestion for string column', () => {
    const services: TDSServiceSchema[] = [
      {
        title: 'Svc',
        pattern: '/svc',
        columns: [
          { name: 'region', type: 'String' },
          { name: 'amount', type: 'Number' },
        ],
        parameters: [],
      },
    ];
    const result = buildSuggestedQueries(services, metadata);
    expect(
      result.some((s) => s.includes('distinct region values from Svc')),
    ).toBe(true);
  });

  test('generates total suggestion when only numeric columns', () => {
    const services: TDSServiceSchema[] = [
      {
        title: 'Svc',
        pattern: '/svc',
        columns: [{ name: 'amount', type: 'Number' }],
        parameters: [],
      },
    ];
    const result = buildSuggestedQueries(services, metadata);
    expect(result.some((s) => s.includes('total amount'))).toBe(true);
  });

  test('generates second-service suggestion when multiple services', () => {
    const services: TDSServiceSchema[] = [
      {
        title: 'SvcA',
        pattern: '/a',
        columns: [
          { name: 'region', type: 'String' },
          { name: 'amount', type: 'Number' },
        ],
        parameters: [],
      },
      {
        title: 'SvcB',
        pattern: '/b',
        columns: [
          { name: 'status', type: 'String' },
          { name: 'score', type: 'Number' },
        ],
        parameters: [],
      },
    ];
    const result = buildSuggestedQueries(services, metadata);
    expect(result.some((s) => s.includes('Show 10 records from SvcB'))).toBe(
      true,
    );
  });

  test('limits to MAX_SUGGESTED_QUERIES (8)', () => {
    const services: TDSServiceSchema[] = [
      {
        title: 'SvcA',
        pattern: '/a',
        columns: [
          { name: 'region', type: 'String' },
          { name: 'amount', type: 'Number' },
          { name: 'tradeDate', type: 'Date' },
        ],
        parameters: [],
      },
      {
        title: 'SvcB',
        pattern: '/b',
        columns: [
          { name: 'region', type: 'String' },
          { name: 'status', type: 'String' },
        ],
        parameters: [],
      },
    ];
    const result = buildSuggestedQueries(services, metadata);
    expect(result.length).toBeLessThanOrEqual(8);
  });

  test('always starts with overview suggestion', () => {
    const services: TDSServiceSchema[] = [
      {
        title: 'Svc',
        pattern: '/svc',
        columns: [],
        parameters: [],
      },
    ];
    const result = buildSuggestedQueries(services, metadata);
    expect(result[0]).toBe(
      'What data does Trade Analytics offer and how can I use it?',
    );
  });

  test('always includes show-records suggestion', () => {
    const services: TDSServiceSchema[] = [
      {
        title: 'TradeService',
        pattern: '/trades',
        columns: [{ name: 'tradeId', type: 'String' }],
        parameters: [],
      },
    ];
    const result = buildSuggestedQueries(services, metadata);
    expect(result).toContain('Show 10 records from TradeService');
  });

  test('skips id columns for string column detection', () => {
    const services: TDSServiceSchema[] = [
      {
        title: 'Svc',
        pattern: '/svc',
        columns: [
          { name: 'userId', type: 'String' },
          { name: 'amount', type: 'Number' },
        ],
        parameters: [],
      },
    ];
    const result = buildSuggestedQueries(services, metadata);
    expect(result.some((s) => s.includes('userId'))).toBe(false);
    expect(result.some((s) => s.includes('total amount'))).toBe(true);
  });

  test('includes insight and second-service suggestions with rich schema', () => {
    const services: TDSServiceSchema[] = [
      {
        title: 'Trades',
        pattern: '/trades',
        columns: [
          { name: 'region', type: 'String' },
          { name: 'amount', type: 'Number' },
          { name: 'sector', type: 'String' },
        ],
        parameters: [],
      },
      {
        title: 'Risks',
        pattern: '/risks',
        columns: [
          { name: 'region', type: 'String' },
          { name: 'sector', type: 'String' },
          { name: 'exposure', type: 'Number' },
        ],
        parameters: [],
      },
    ];
    const result = buildSuggestedQueries(services, metadata);
    expect(
      result.some((s) => s.includes('distinct region values from Trades')),
    ).toBe(true);
    expect(result.some((s) => s.includes('Show 10 records from Risks'))).toBe(
      true,
    );
  });
});
