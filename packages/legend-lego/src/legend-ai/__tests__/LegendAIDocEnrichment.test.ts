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

import { describe, test, expect } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import { Multiplicity } from '@finos/legend-graph';
import {
  buildPropertyDocIndex,
  enrichColumnsFromElementDocs,
  inferServiceRelationshipsFromAssociations,
  extractLambdaPreFilters,
  formatPreFiltersForContext,
} from '../LegendAIDocEnrichment.js';
import {
  ClassDocumentationEntry,
  PropertyDocumentationEntry,
  NormalizedDocumentationEntry,
  AssociationDocumentationEntry,
  ModelDocumentationEntry,
} from '../../model-documentation/index.js';
import type { TDSColumnSchema, TDSServiceSchema } from '../LegendAITypes.js';

function makePropertyDoc(
  name: string,
  docs: string[],
  multiplicity?: Multiplicity,
): PropertyDocumentationEntry {
  const prop = new PropertyDocumentationEntry();
  prop.name = name;
  prop.docs = docs;
  if (multiplicity) {
    prop.multiplicity = multiplicity;
  }
  return prop;
}

function makeClassWithProps(
  className: string,
  properties: PropertyDocumentationEntry[],
): NormalizedDocumentationEntry[] {
  const cls = new ClassDocumentationEntry();
  cls.name = className;
  cls.path = `my::model::${className}`;
  cls.docs = [];
  cls.properties = properties;

  const entries: NormalizedDocumentationEntry[] = [
    new NormalizedDocumentationEntry(className, '', cls, cls),
  ];
  for (const prop of properties) {
    entries.push(new NormalizedDocumentationEntry(prop.name, '', cls, prop));
  }
  return entries;
}

function makeAssociationDocs(
  assocName: string,
  propA: PropertyDocumentationEntry,
  propB: PropertyDocumentationEntry,
): NormalizedDocumentationEntry[] {
  const assoc = new AssociationDocumentationEntry();
  assoc.name = assocName;
  assoc.path = `my::model::${assocName}`;
  assoc.docs = [];
  assoc.properties = [propA, propB];

  return [new NormalizedDocumentationEntry(assocName, '', assoc, assoc)];
}

describe(unitTest('buildPropertyDocIndex'), () => {
  test('builds index from class property docs', () => {
    const prop = makePropertyDoc('TradeId', ['Unique trade identifier']);
    const entries = makeClassWithProps('Trade', [prop]);
    const index = buildPropertyDocIndex(entries);

    expect(index.size).toBe(1);
    expect(index.get('tradeid')).toBe(prop);
  });

  test('matches case-insensitively', () => {
    const prop = makePropertyDoc('CounterParty', ['The counterparty']);
    const entries = makeClassWithProps('Trade', [prop]);
    const index = buildPropertyDocIndex(entries);

    expect(index.get('counterparty')).toBe(prop);
  });

  test('returns empty map for no class entries', () => {
    const plain = new ModelDocumentationEntry();
    plain.name = 'SomeModel';
    plain.path = 'my::SomeModel';
    plain.docs = ['Some doc'];
    const entry = new NormalizedDocumentationEntry(
      'SomeModel',
      '',
      plain,
      plain,
    );
    const index = buildPropertyDocIndex([entry]);

    expect(index.size).toBe(0);
  });

  test('skips class-level entries (entry === elementEntry)', () => {
    const cls = new ClassDocumentationEntry();
    cls.name = 'Trade';
    cls.path = 'my::Trade';
    cls.docs = ['Trade class'];
    cls.properties = [];
    const entry = new NormalizedDocumentationEntry('Trade', '', cls, cls);
    const index = buildPropertyDocIndex([entry]);

    expect(index.size).toBe(0);
  });
});

describe(unitTest('enrichColumnsFromElementDocs'), () => {
  test('enriches column documentation from property docs', () => {
    const prop = makePropertyDoc('TradeId', ['Unique trade identifier']);
    const entries = makeClassWithProps('Trade', [prop]);
    const index = buildPropertyDocIndex(entries);

    const columns: TDSColumnSchema[] = [{ name: 'TradeId' }];
    enrichColumnsFromElementDocs(columns, index);

    expect(columns[0]?.documentation).toBe('Unique trade identifier');
  });

  test('enriches nullability from multiplicity lowerBound', () => {
    const prop = makePropertyDoc(
      'optionalField',
      ['Optional field'],
      new Multiplicity(0, 1),
    );
    const entries = makeClassWithProps('Trade', [prop]);
    const index = buildPropertyDocIndex(entries);

    const columns: TDSColumnSchema[] = [{ name: 'optionalField' }];
    enrichColumnsFromElementDocs(columns, index);

    expect(columns[0]?.nullable).toBe(true);
  });

  test('does not overwrite existing documentation', () => {
    const prop = makePropertyDoc('TradeId', ['New doc from model']);
    const entries = makeClassWithProps('Trade', [prop]);
    const index = buildPropertyDocIndex(entries);

    const columns: TDSColumnSchema[] = [
      { name: 'TradeId', documentation: 'Existing doc' },
    ];
    enrichColumnsFromElementDocs(columns, index);

    expect(columns[0]?.documentation).toBe('Existing doc');
  });

  test('does not overwrite existing nullable', () => {
    const prop = makePropertyDoc('field', [], new Multiplicity(0, 1));
    const entries = makeClassWithProps('Trade', [prop]);
    const index = buildPropertyDocIndex(entries);

    const columns: TDSColumnSchema[] = [{ name: 'field', nullable: false }];
    enrichColumnsFromElementDocs(columns, index);

    expect(columns[0]?.nullable).toBe(false);
  });

  test('joins multiple docs with semicolons', () => {
    const prop = makePropertyDoc('TradeId', ['Line one', 'Line two']);
    const entries = makeClassWithProps('Trade', [prop]);
    const index = buildPropertyDocIndex(entries);

    const columns: TDSColumnSchema[] = [{ name: 'TradeId' }];
    enrichColumnsFromElementDocs(columns, index);

    expect(columns[0]?.documentation).toBe('Line one; Line two');
  });
});

describe(unitTest('inferServiceRelationshipsFromAssociations'), () => {
  test('returns empty for fewer than 2 services', () => {
    const svc: TDSServiceSchema = {
      title: 'Trades',
      pattern: '/getTrade',
      columns: [{ name: 'id' }],
      parameters: [],
    };
    const result = inferServiceRelationshipsFromAssociations([svc], []);
    expect(result).toEqual([]);
  });

  test('finds direct relationship between two services', () => {
    const propA = makePropertyDoc('trade', [], new Multiplicity(0, undefined));
    const propB = makePropertyDoc('instrument', [], new Multiplicity(1, 1));
    const assocDocs = makeAssociationDocs('TradeInstrument', propA, propB);

    const svcA: TDSServiceSchema = {
      title: 'Trades',
      pattern: '/getTrade',
      columns: [{ name: 'id' }, { name: 'instrumentId' }],
      parameters: [],
    };
    const svcB: TDSServiceSchema = {
      title: 'Instruments',
      pattern: '/getInstrument',
      columns: [{ name: 'instrumentId' }, { name: 'name' }],
      parameters: [],
    };

    const result = inferServiceRelationshipsFromAssociations(
      [svcA, svcB],
      assocDocs,
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.leftService).toBe('Trades');
    expect(result[0]?.rightService).toBe('Instruments');
    expect(result[0]?.joinColumns).toContain('instrumentId');
  });

  test('returns empty when no associations match service patterns', () => {
    const propA = makePropertyDoc('foo', [], new Multiplicity(0, undefined));
    const propB = makePropertyDoc('bar', [], new Multiplicity(1, 1));
    const assocDocs = makeAssociationDocs('FooBar', propA, propB);

    const svcA: TDSServiceSchema = {
      title: 'Trades',
      pattern: '/getTrade',
      columns: [{ name: 'id' }],
      parameters: [],
    };
    const svcB: TDSServiceSchema = {
      title: 'Instruments',
      pattern: '/getInstrument',
      columns: [{ name: 'id' }],
      parameters: [],
    };

    const result = inferServiceRelationshipsFromAssociations(
      [svcA, svcB],
      assocDocs,
    );
    expect(result).toHaveLength(0);
  });
});

describe(unitTest('extractLambdaPreFilters'), () => {
  test('returns empty array for undefined body', () => {
    expect(extractLambdaPreFilters(undefined)).toEqual([]);
  });

  test('returns empty array for non-array body', () => {
    expect(extractLambdaPreFilters({ foo: 'bar' })).toEqual([]);
  });

  test('extracts simple equality filter', () => {
    const body = [
      {
        _type: 'func',
        function: 'filter',
        parameters: [
          { _type: 'func', function: 'getAll', parameters: [] },
          {
            _type: 'lambda',
            body: [
              {
                _type: 'func',
                function: 'equal',
                parameters: [
                  {
                    _type: 'property',
                    property: 'fsymId',
                    parameters: [{ _type: 'var', name: 'x' }],
                  },
                  { _type: 'string', value: 'D7HG0X-S' },
                ],
              },
            ],
            parameters: [],
          },
        ],
      },
    ];
    const result = extractLambdaPreFilters(body);
    expect(result).toEqual([
      { property: 'fsymId', operator: 'equal', value: 'D7HG0X-S' },
    ]);
  });

  test('extracts nested property path equality', () => {
    const body = [
      {
        _type: 'func',
        function: 'filter',
        parameters: [
          { _type: 'func', function: 'getAll', parameters: [] },
          {
            _type: 'lambda',
            body: [
              {
                _type: 'func',
                function: 'equal',
                parameters: [
                  {
                    _type: 'property',
                    property: 'fsymId',
                    parameters: [
                      {
                        _type: 'property',
                        property: 'SymSecEntityPublic',
                        parameters: [
                          {
                            _type: 'property',
                            property: 'FeSecCoveragePublic',
                            parameters: [{ _type: 'var', name: 'x' }],
                          },
                        ],
                      },
                    ],
                  },
                  { _type: 'string', value: 'ABC-123' },
                ],
              },
            ],
            parameters: [],
          },
        ],
      },
    ];
    const result = extractLambdaPreFilters(body);
    expect(result).toEqual([
      {
        property: 'FeSecCoveragePublic.SymSecEntityPublic.fsymId',
        operator: 'equal',
        value: 'ABC-123',
      },
    ]);
  });

  test('extracts isEmpty filter', () => {
    const body = [
      {
        _type: 'func',
        function: 'filter',
        parameters: [
          { _type: 'func', function: 'getAll', parameters: [] },
          {
            _type: 'lambda',
            body: [
              {
                _type: 'func',
                function: 'isEmpty',
                parameters: [
                  {
                    _type: 'property',
                    property: 'consEndDate',
                    parameters: [{ _type: 'var', name: 'x' }],
                  },
                ],
              },
            ],
            parameters: [],
          },
        ],
      },
    ];
    const result = extractLambdaPreFilters(body);
    expect(result).toEqual([{ property: 'consEndDate', operator: 'isEmpty' }]);
  });

  test('extracts combined AND filters (isEmpty + equal + equal)', () => {
    const body = [
      {
        _type: 'func',
        function: 'filter',
        parameters: [
          { _type: 'func', function: 'getAll', parameters: [] },
          {
            _type: 'lambda',
            body: [
              {
                _type: 'func',
                function: 'and',
                parameters: [
                  {
                    _type: 'func',
                    function: 'isEmpty',
                    parameters: [
                      {
                        _type: 'property',
                        property: 'consEndDate',
                        parameters: [{ _type: 'var', name: 'x' }],
                      },
                    ],
                  },
                  {
                    _type: 'func',
                    function: 'and',
                    parameters: [
                      {
                        _type: 'func',
                        function: 'equal',
                        parameters: [
                          {
                            _type: 'property',
                            property: 'factsetEntityId',
                            parameters: [{ _type: 'var', name: 'x' }],
                          },
                          { _type: 'string', value: '05J1CM-E' },
                        ],
                      },
                      {
                        _type: 'func',
                        function: 'equal',
                        parameters: [
                          {
                            _type: 'property',
                            property: 'fsymId',
                            parameters: [{ _type: 'var', name: 'x' }],
                          },
                          { _type: 'string', value: 'CKYY1K-R' },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
            parameters: [],
          },
        ],
      },
    ];
    const result = extractLambdaPreFilters(body);
    expect(result).toEqual([
      { property: 'consEndDate', operator: 'isEmpty' },
      { property: 'factsetEntityId', operator: 'equal', value: '05J1CM-E' },
      { property: 'fsymId', operator: 'equal', value: 'CKYY1K-R' },
    ]);
  });

  test('extracts isNotNull post-projection TDS row filters', () => {
    const body = [
      {
        _type: 'func',
        function: 'filter',
        parameters: [
          {
            _type: 'func',
            function: 'project',
            parameters: [{ _type: 'func', function: 'getAll', parameters: [] }],
          },
          {
            _type: 'lambda',
            body: [
              {
                _type: 'func',
                function: 'and',
                parameters: [
                  {
                    _type: 'property',
                    property: 'isNotNull',
                    parameters: [
                      { _type: 'var', name: 'row' },
                      { _type: 'string', value: 'Fe Mean' },
                    ],
                  },
                  {
                    _type: 'property',
                    property: 'isNotNull',
                    parameters: [
                      { _type: 'var', name: 'row' },
                      { _type: 'string', value: 'Fe Median' },
                    ],
                  },
                ],
              },
            ],
            parameters: [],
          },
        ],
      },
    ];
    const result = extractLambdaPreFilters(body);
    expect(result).toContainEqual({
      property: 'Fe Mean',
      operator: 'isNotNull',
    });
    expect(result).toContainEqual({
      property: 'Fe Median',
      operator: 'isNotNull',
    });
  });

  test('extracts filters from nested function calls (filter inside project inside filter)', () => {
    const body = [
      {
        _type: 'func',
        function: 'filter',
        parameters: [
          {
            _type: 'func',
            function: 'project',
            parameters: [
              {
                _type: 'func',
                function: 'filter',
                parameters: [
                  { _type: 'func', function: 'getAll', parameters: [] },
                  {
                    _type: 'lambda',
                    body: [
                      {
                        _type: 'func',
                        function: 'equal',
                        parameters: [
                          {
                            _type: 'property',
                            property: 'entityId',
                            parameters: [{ _type: 'var', name: 'x' }],
                          },
                          { _type: 'string', value: 'TEST-ID' },
                        ],
                      },
                    ],
                    parameters: [],
                  },
                ],
              },
            ],
          },
          {
            _type: 'lambda',
            body: [
              {
                _type: 'property',
                property: 'isNotNull',
                parameters: [
                  { _type: 'var', name: 'row' },
                  { _type: 'string', value: 'Amount' },
                ],
              },
            ],
            parameters: [],
          },
        ],
      },
    ];
    const result = extractLambdaPreFilters(body);
    expect(result).toContainEqual({
      property: 'entityId',
      operator: 'equal',
      value: 'TEST-ID',
    });
    expect(result).toContainEqual({
      property: 'Amount',
      operator: 'isNotNull',
    });
  });

  test('handles integer literal values', () => {
    const body = [
      {
        _type: 'func',
        function: 'filter',
        parameters: [
          { _type: 'func', function: 'getAll', parameters: [] },
          {
            _type: 'lambda',
            body: [
              {
                _type: 'func',
                function: 'equal',
                parameters: [
                  {
                    _type: 'property',
                    property: 'status',
                    parameters: [{ _type: 'var', name: 'x' }],
                  },
                  { _type: 'integer', value: 42 },
                ],
              },
            ],
            parameters: [],
          },
        ],
      },
    ];
    const result = extractLambdaPreFilters(body);
    expect(result).toEqual([
      { property: 'status', operator: 'equal', value: 42 },
    ]);
  });

  test('returns empty for lambda with no filter calls', () => {
    const body = [
      {
        _type: 'func',
        function: 'project',
        parameters: [{ _type: 'func', function: 'getAll', parameters: [] }],
      },
    ];
    expect(extractLambdaPreFilters(body)).toEqual([]);
  });
});

describe(unitTest('formatPreFiltersForContext'), () => {
  test('returns empty string for no filters', () => {
    expect(formatPreFiltersForContext([])).toBe('');
  });

  test('formats equality filter with short property name', () => {
    const result = formatPreFiltersForContext([
      {
        property: 'FeSecCoverage.SymEntity.fsymId',
        operator: 'equal',
        value: 'D7HG0X-S',
      },
    ]);
    expect(result).toBe("Pre-applied filters: fsymId = 'D7HG0X-S'");
  });

  test('formats isEmpty filter', () => {
    const result = formatPreFiltersForContext([
      { property: 'consEndDate', operator: 'isEmpty' },
    ]);
    expect(result).toBe('Pre-applied filters: consEndDate IS NULL (always)');
  });

  test('formats multiple filters', () => {
    const result = formatPreFiltersForContext([
      { property: 'consEndDate', operator: 'isEmpty' },
      { property: 'factsetEntityId', operator: 'equal', value: '05J1CM-E' },
      { property: 'Fe Mean', operator: 'isNotNull' },
    ]);
    expect(result).toBe(
      "Pre-applied filters: consEndDate IS NULL (always); factsetEntityId = '05J1CM-E'; Fe Mean IS NOT NULL (post-filter)",
    );
  });
});
