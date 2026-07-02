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
import {
  type TDSServiceSchema,
  type LegendAIProductMetadata,
  TDSServiceSourceType,
} from '../../LegendAITypes.js';

describe(unitTest('isStringColumn'), () => {
  test('returns true for string type', () => {
    expect(isStringColumn({ name: 'region', type: 'String' })).toBe(true);
  });

  test('returns true for precise-primitive Varchar type', () => {
    expect(isStringColumn({ name: 'name', type: 'Varchar' })).toBe(true);
  });

  test('returns false for unknown uppercase varchar variant', () => {
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

  test('returns true for precise-primitive double type', () => {
    expect(isNumericColumn({ name: 'val', type: 'Double' })).toBe(true);
  });

  test('returns true for precise-primitive Int type', () => {
    expect(isNumericColumn({ name: 'count', type: 'Int' })).toBe(true);
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

  test('generates aggregation suggestion for string+numeric columns', () => {
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
    // Should generate a top-N ranking or distribution suggestion
    expect(
      result.some((s) => s.includes('region') && s.includes('amount')),
    ).toBe(true);
  });

  test('generates show-records suggestion when only numeric columns', () => {
    const services: TDSServiceSchema[] = [
      {
        title: 'Svc',
        pattern: '/svc',
        columns: [{ name: 'amount', type: 'Number' }],
        parameters: [],
      },
    ];
    const result = buildSuggestedQueries(services, metadata);
    expect(result).toContain('Show 10 records from Svc');
  });

  test('generates cross-service suggestion when multiple services', () => {
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
    expect(result.some((s) => s.includes('SvcB'))).toBe(true);
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
    // Should still reference the service even without a string column
    expect(result.some((s) => s.includes('Svc'))).toBe(true);
  });

  test('includes insight and cross-service suggestions with rich schema', () => {
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
    // Should include a suggestion using region and amount from Trades
    expect(
      result.some((s) => s.includes('region') && s.includes('Trades')),
    ).toBe(true);
    // Should include a cross-service suggestion for Risks
    expect(result.some((s) => s.includes('Risks'))).toBe(true);
  });

  test('generates category-based suggestions for access point services', () => {
    const apServices: TDSServiceSchema[] = [
      {
        title: 'MetaDir Enterprise',
        pattern: '/METADIR',
        columns: [
          { name: 'GSKERBEROSID', type: 'Varchar' },
          { name: 'GIVENNAME', type: 'Varchar' },
          { name: 'GSDIVISIONNAME', type: 'Varchar' },
          { name: 'GSDEPARTMENTNAME', type: 'Varchar' },
          { name: 'GSREGION', type: 'Varchar' },
          { name: 'TITLE', type: 'Varchar' },
        ],
        parameters: [],
        sourceType: TDSServiceSourceType.ACCESS_POINT,
      },
    ];
    const result = buildSuggestedQueries(apServices, metadata);
    // Should include aggregation/grouping queries using category columns
    expect(
      result.some(
        (s) =>
          s.includes('GSDIVISIONNAME') ||
          s.includes('GSREGION') ||
          s.includes('GSDEPARTMENTNAME'),
      ),
    ).toBe(true);
    // Should have at least overview + 2 data queries
    expect(result.length).toBeGreaterThanOrEqual(3);
  });

  test('generates cross-AP suggestion for multi-AP data products', () => {
    const apServices: TDSServiceSchema[] = [
      {
        title: 'MetaDir',
        pattern: '/METADIR',
        columns: [
          { name: 'GSKERBEROSID', type: 'Varchar' },
          { name: 'GSDIVISIONNAME', type: 'Varchar' },
        ],
        parameters: [],
        sourceType: TDSServiceSourceType.ACCESS_POINT,
      },
      {
        title: 'CorpDir',
        pattern: '/CORPDIR',
        columns: [
          { name: 'GSKERBEROSID', type: 'Varchar' },
          { name: 'GSDIVISIONNAME', type: 'Varchar' },
          { name: 'GSLEGALTITLE', type: 'Varchar' },
          { name: 'GSHRDIVISIONNAME', type: 'Varchar' },
        ],
        parameters: [],
        sourceType: TDSServiceSourceType.ACCESS_POINT,
      },
    ];
    const result = buildSuggestedQueries(apServices, metadata);
    // Should include at least one suggestion referencing CorpDir
    expect(result.some((s) => s.includes('CorpDir'))).toBe(true);
  });

  test('generates cross-AP JOIN suggestion using unique columns', () => {
    const apServices: TDSServiceSchema[] = [
      {
        title: 'MetaDir',
        pattern: '/METADIR',
        columns: [
          { name: 'GSKERBEROSID', type: 'Varchar' },
          { name: 'GSDIVISIONNAME', type: 'Varchar' },
          { name: 'GSDEPARTMENTNAME', type: 'Varchar' },
        ],
        parameters: [],
        sourceType: TDSServiceSourceType.ACCESS_POINT,
      },
      {
        title: 'CorpDir',
        pattern: '/CORPDIR',
        columns: [
          { name: 'GSKERBEROSID', type: 'Varchar' },
          { name: 'GSDIVISIONNAME', type: 'Varchar' },
          { name: 'GSLEGALTITLE', type: 'Varchar' },
          { name: 'GSBUILDINGNAME', type: 'Varchar' },
        ],
        parameters: [],
        sourceType: TDSServiceSourceType.ACCESS_POINT,
      },
    ];
    const result = buildSuggestedQueries(apServices, metadata);
    // Should suggest a cross-AP query using a column unique to CorpDir
    expect(
      result.some(
        (s) =>
          s.includes('CorpDir') &&
          (s.includes('GSLEGALTITLE') || s.includes('GSBUILDINGNAME')),
      ),
    ).toBe(true);
  });

  test('generates comparison query when APs share category columns', () => {
    const apServices: TDSServiceSchema[] = [
      {
        title: 'MetaDir',
        pattern: '/METADIR',
        columns: [
          { name: 'GSKERBEROSID', type: 'Varchar' },
          { name: 'GSDIVISIONNAME', type: 'Varchar' },
        ],
        parameters: [],
        sourceType: TDSServiceSourceType.ACCESS_POINT,
      },
      {
        title: 'CorpDir',
        pattern: '/CORPDIR',
        columns: [
          { name: 'GSKERBEROSID', type: 'Varchar' },
          { name: 'GSDIVISIONNAME', type: 'Varchar' },
        ],
        parameters: [],
        sourceType: TDSServiceSourceType.ACCESS_POINT,
      },
    ];
    const result = buildSuggestedQueries(apServices, metadata);
    // Should suggest comparing counts between APs
    expect(
      result.some(
        (s) =>
          s.includes('Compare') ||
          s.includes('between') ||
          s.includes('CorpDir'),
      ),
    ).toBe(true);
  });

  test('caps AP suggestions at MAX_SUGGESTED_QUERIES', () => {
    const apServices: TDSServiceSchema[] = [
      {
        title: 'AP1',
        pattern: '/ap1',
        columns: [
          { name: 'GSKERBEROSID', type: 'Varchar' },
          { name: 'GSDIVISIONNAME', type: 'Varchar' },
          { name: 'GSDEPARTMENTNAME', type: 'Varchar' },
          { name: 'GSREGION', type: 'Varchar' },
          { name: 'TITLE', type: 'Varchar' },
          { name: 'GSWORKERTYPE', type: 'Varchar' },
          { name: 'GSBUSINESSUNIT', type: 'Varchar' },
        ],
        parameters: [],
        sourceType: TDSServiceSourceType.ACCESS_POINT,
      },
      {
        title: 'AP2',
        pattern: '/ap2',
        columns: [
          { name: 'GSKERBEROSID', type: 'Varchar' },
          { name: 'GSFLOORNUMBER', type: 'Varchar' },
          { name: 'GSBUILDINGNAME', type: 'Varchar' },
        ],
        parameters: [],
        sourceType: TDSServiceSourceType.ACCESS_POINT,
      },
    ];
    const result = buildSuggestedQueries(apServices, metadata);
    expect(result.length).toBeLessThanOrEqual(8);
  });

  test('generates date-based suggestions for calendar APs', () => {
    const apServices: TDSServiceSchema[] = [
      {
        title: 'NYSE Calendar',
        pattern: '/NYSE',
        columns: [
          { name: 'DATE', type: 'StrictDate' },
          { name: 'CALENDAR_NAME', type: 'Varchar' },
          { name: 'IS_HOLIDAY', type: 'Varchar' },
          { name: 'NAME_OF_DAY', type: 'Varchar' },
          { name: 'REGION', type: 'Varchar' },
        ],
        parameters: [],
        sourceType: TDSServiceSourceType.ACCESS_POINT,
      },
    ];
    const result = buildSuggestedQueries(apServices, metadata);
    // Should generate suggestions using category columns
    expect(result.some((s) => s.includes('NYSE Calendar'))).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(3);
  });

  test('generates numeric-based suggestions for financial APs', () => {
    const apServices: TDSServiceSchema[] = [
      {
        title: 'Trade Summary',
        pattern: '/trades',
        columns: [
          { name: 'TRADE_ID', type: 'Varchar' },
          { name: 'AMOUNT', type: 'Double' },
          { name: 'PRICE', type: 'Double' },
          { name: 'COUNTERPARTY', type: 'Varchar' },
          { name: 'TRADE_DATE', type: 'StrictDate' },
        ],
        parameters: [],
        sourceType: TDSServiceSourceType.ACCESS_POINT,
      },
    ];
    const result = buildSuggestedQueries(apServices, metadata);
    // Should generate top-N or aggregation using numeric columns
    expect(
      result.some(
        (s) =>
          s.includes('AMOUNT') ||
          s.includes('PRICE') ||
          s.includes('COUNTERPARTY'),
      ),
    ).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(3);
  });

  test('generates fallback for AP with only ID columns', () => {
    const apServices: TDSServiceSchema[] = [
      {
        title: 'Mapping Table',
        pattern: '/mapping',
        columns: [
          { name: 'SOURCE_ID', type: 'Varchar' },
          { name: 'TARGET_ID', type: 'Varchar' },
          { name: 'VERSION', type: 'Int' },
        ],
        parameters: [],
        sourceType: TDSServiceSourceType.ACCESS_POINT,
      },
    ];
    const result = buildSuggestedQueries(apServices, metadata);
    // Should still produce at least the overview + one data suggestion
    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result[0]).toContain('Trade Analytics');
  });
});
