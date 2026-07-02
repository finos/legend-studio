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
  extractModelContext,
  buildEnrichedBusinessContext,
  findBestAlternateRoot,
  resolveEntitiesDeterministic,
  buildSemanticPropertyIndex,
  buildModelContextEnrichmentText,
} from '../LegendAIDocEnrichment.js';
import {
  ClassDocumentationEntry,
  PropertyDocumentationEntry,
  NormalizedDocumentationEntry,
  AssociationDocumentationEntry,
  EnumerationDocumentationEntry,
  BasicDocumentationEntry,
  ModelDocumentationEntry,
} from '../../model-documentation/index.js';
import type {
  TDSColumnSchema,
  TDSServiceSchema,
  LegendAIModelContext,
} from '../LegendAITypes.js';

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

// ────────────────────────────────────────────────────────────────────────────
// extractModelContext
// ────────────────────────────────────────────────────────────────────────────

function makePropertyDocWithType(
  name: string,
  type: string,
  mult?: Multiplicity,
): PropertyDocumentationEntry {
  const prop = new PropertyDocumentationEntry();
  prop.name = name;
  prop.docs = [];
  prop.type = type;
  if (mult) {
    prop.multiplicity = mult;
  }
  return prop;
}

describe(unitTest('extractModelContext'), () => {
  test('extracts classes with properties', () => {
    const idProp = makePropertyDocWithType(
      'id',
      'Integer',
      new Multiplicity(1, 1),
    );
    const nameProp = makePropertyDocWithType(
      'name',
      'String',
      new Multiplicity(1, 1),
    );
    const entries = makeClassWithProps('Customer', [idProp, nameProp]);

    const ctx = extractModelContext(entries);
    expect(ctx.entities).toHaveLength(1);
    expect(ctx.entities[0]?.path).toBe('my::model::Customer');
    expect(ctx.entities[0]?.name).toBe('Customer');
    expect(ctx.entities[0]?.properties).toHaveLength(2);
    expect(ctx.entities[0]?.properties[0]).toEqual({
      name: 'id',
      type: 'Integer',
      isCollection: false,
      isOptional: false,
    });
  });

  test('extracts associations', () => {
    const customerProp = makePropertyDocWithType(
      'customer',
      'my::model::Customer',
      new Multiplicity(0, 1),
    );
    const ordersProp = makePropertyDocWithType(
      'orders',
      'my::model::Order',
      new Multiplicity(0, undefined),
    );
    const assocEntries = makeAssociationDocs(
      'Order_Customer',
      customerProp,
      ordersProp,
    );

    const ctx = extractModelContext(assocEntries);
    expect(ctx.associations).toHaveLength(1);
    expect(ctx.associations[0]).toEqual({
      name: 'Order_Customer',
      leftEntity: 'my::model::Customer',
      leftProperty: 'customer',
      rightEntity: 'my::model::Order',
      rightProperty: 'orders',
    });
  });

  test('extracts enumerations', () => {
    const enumEntry = new EnumerationDocumentationEntry();
    enumEntry.name = 'Title';
    enumEntry.path = 'my::model::Title';
    enumEntry.docs = [];
    const mr = new BasicDocumentationEntry();
    mr.name = 'Mr';
    mr.docs = [];
    const mrs = new BasicDocumentationEntry();
    mrs.name = 'Mrs';
    mrs.docs = [];
    enumEntry.enumValues = [mr, mrs];

    const normalized = new NormalizedDocumentationEntry(
      'Title',
      '',
      enumEntry,
      enumEntry,
    );

    const ctx = extractModelContext([normalized]);
    expect(ctx.enumerations).toHaveLength(1);
    expect(ctx.enumerations?.[0]).toEqual({
      path: 'my::model::Title',
      name: 'Title',
      values: ['Mr', 'Mrs'],
    });
  });

  test('deduplicates classes across multiple normalized entries', () => {
    const idProp = makePropertyDocWithType(
      'id',
      'Integer',
      new Multiplicity(1, 1),
    );
    const nameProp = makePropertyDocWithType(
      'name',
      'String',
      new Multiplicity(1, 1),
    );
    // makeClassWithProps creates one entry per property + 1 for the class
    const entries = makeClassWithProps('Customer', [idProp, nameProp]);
    // All entries have the same elementEntry class — should only produce 1 entity
    const ctx = extractModelContext(entries);
    expect(ctx.entities).toHaveLength(1);
  });

  test('marks collection and optional properties correctly', () => {
    const required = makePropertyDocWithType(
      'id',
      'Integer',
      new Multiplicity(1, 1),
    );
    const optional = makePropertyDocWithType(
      'name',
      'String',
      new Multiplicity(0, 1),
    );
    const collection = makePropertyDocWithType(
      'orders',
      'my::model::Order',
      new Multiplicity(0, undefined),
    );
    const entries = makeClassWithProps('Customer', [
      required,
      optional,
      collection,
    ]);

    const ctx = extractModelContext(entries);
    const props = ctx.entities[0]?.properties;
    expect(props).toBeDefined();
    expect(props?.[0]).toEqual({
      name: 'id',
      type: 'Integer',
      isCollection: false,
      isOptional: false,
    });
    expect(props?.[1]).toEqual({
      name: 'name',
      type: 'String',
      isCollection: false,
      isOptional: true,
    });
    expect(props?.[2]).toEqual({
      name: 'orders',
      type: 'my::model::Order',
      isCollection: true,
      isOptional: true,
    });
  });

  test('returns empty context for no class entries', () => {
    const ctx = extractModelContext([]);
    expect(ctx.entities).toHaveLength(0);
    expect(ctx.associations).toHaveLength(0);
    expect(ctx.enumerations).toBeUndefined();
  });

  test('includes class description from docs', () => {
    const cls = new ClassDocumentationEntry();
    cls.name = 'Order';
    cls.path = 'my::model::Order';
    cls.docs = ['Records details of customer orders'];
    cls.properties = [];
    const entry = new NormalizedDocumentationEntry('Order', '', cls, cls);

    const ctx = extractModelContext([entry]);
    expect(ctx.entities[0]?.description).toBe(
      'Records details of customer orders',
    );
  });
});

// ────────────────────────────────────────────────────────────────────────────
// buildEnrichedBusinessContext
// ────────────────────────────────────────────────────────────────────────────

function makeModelContext(): LegendAIModelContext {
  return {
    entities: [
      {
        path: 'my::model::Customer',
        name: 'Customer',
        description: 'Stores customer information',
        properties: [
          {
            name: 'id',
            type: 'String',
            isCollection: false,
            isOptional: false,
          },
          {
            name: 'companyName',
            type: 'String',
            isCollection: false,
            isOptional: false,
          },
          {
            name: 'title',
            type: 'my::model::Title',
            isCollection: false,
            isOptional: true,
          },
          {
            name: 'orders',
            type: 'my::model::Order',
            isCollection: true,
            isOptional: true,
          },
        ],
      },
      {
        path: 'my::model::Order',
        name: 'Order',
        description: 'Records customer orders',
        properties: [
          {
            name: 'orderId',
            type: 'Integer',
            isCollection: false,
            isOptional: false,
          },
          {
            name: 'createdDate',
            type: 'StrictDate',
            isCollection: false,
            isOptional: true,
          },
        ],
      },
    ],
    associations: [
      {
        name: 'Order_Customer',
        leftEntity: 'my::model::Customer',
        leftProperty: 'customer',
        rightEntity: 'my::model::Order',
        rightProperty: 'orders',
      },
    ],
    enumerations: [
      { path: 'my::model::Title', name: 'Title', values: ['Mr', 'Mrs', 'Ms'] },
    ],
  };
}

describe(unitTest('buildEnrichedBusinessContext'), () => {
  test('includes root entity properties', () => {
    const ctx = makeModelContext();
    const result = buildEnrichedBusinessContext(
      'Show all customers',
      'my::model::Customer',
      [],
      ctx,
    );

    expect(result.naturalLanguageQuery).toBe('Show all customers');
    const props = result.businessContextMatch?.properties ?? [];
    expect(props.length).toBeGreaterThanOrEqual(3);
    expect(props.find((p) => p.propertyName === 'id')).toBeDefined();
    expect(props.find((p) => p.propertyName === 'companyName')).toBeDefined();
  });

  test('includes enum values for enum-typed properties', () => {
    const ctx = makeModelContext();
    const result = buildEnrichedBusinessContext(
      'Show customers by title',
      'my::model::Customer',
      [],
      ctx,
    );

    const titleProp = result.businessContextMatch?.properties?.find(
      (p) => p.propertyName === 'title',
    );
    expect(titleProp).toBeDefined();
    expect(titleProp?.probablePropertyValues).toEqual(['Mr', 'Mrs', 'Ms']);
    expect(titleProp?.matchType).toEqual(['enumeration']);
  });

  test('includes root entity description in additionalNlModelContext', () => {
    const ctx = makeModelContext();
    const result = buildEnrichedBusinessContext(
      'Show all customers',
      'my::model::Customer',
      ['my::model::Order'],
      ctx,
    );

    const nlContext =
      result.businessContextMatch?.additionalNlModelContext ?? [];
    const rootDesc = nlContext.find((n) => n.category === 'root_entity');
    expect(rootDesc).toBeDefined();
    expect(rootDesc?.description).toBe('Stores customer information');
  });

  test('includes related entity descriptions', () => {
    const ctx = makeModelContext();
    const result = buildEnrichedBusinessContext(
      'Show customers with orders',
      'my::model::Customer',
      ['my::model::Order'],
      ctx,
    );

    const nlContext =
      result.businessContextMatch?.additionalNlModelContext ?? [];
    const relDesc = nlContext.find((n) => n.category === 'related_entity');
    expect(relDesc).toBeDefined();
    expect(relDesc?.description).toBe('Records customer orders');
  });

  test('includes association context', () => {
    const ctx = makeModelContext();
    const result = buildEnrichedBusinessContext(
      'Show customers with orders',
      'my::model::Customer',
      ['my::model::Order'],
      ctx,
    );

    const nlContext =
      result.businessContextMatch?.additionalNlModelContext ?? [];
    const assocCtx = nlContext.find((n) => n.category === 'association');
    expect(assocCtx).toBeDefined();
    expect(assocCtx?.description).toContain('Customer');
    expect(assocCtx?.description).toContain('Order');
  });

  test('includes related entity properties', () => {
    const ctx = makeModelContext();
    const result = buildEnrichedBusinessContext(
      'Show customers with orders',
      'my::model::Customer',
      ['my::model::Order'],
      ctx,
    );

    const props = result.businessContextMatch?.properties ?? [];
    const orderProp = props.find((p) => p.propertyName === 'Order.orderId');
    expect(orderProp).toBeDefined();
    expect(orderProp?.matchType).toEqual(['Integer']);
  });

  test('returns minimal context for unknown root entity', () => {
    const ctx = makeModelContext();
    const result = buildEnrichedBusinessContext(
      'Show data',
      'my::model::Unknown',
      [],
      ctx,
    );

    expect(result.naturalLanguageQuery).toBe('Show data');
    // No properties since root entity not found
    expect(result.businessContextMatch).toBeUndefined();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// findBestAlternateRoot
// ────────────────────────────────────────────────────────────────────────────

describe(unitTest('findBestAlternateRoot'), () => {
  test('returns undefined when no related entities', () => {
    const ctx = makeModelContext();
    expect(
      findBestAlternateRoot('my::model::Customer', [], ctx),
    ).toBeUndefined();
  });

  test('returns single related entity directly', () => {
    const ctx = makeModelContext();
    expect(
      findBestAlternateRoot('my::model::Customer', ['my::model::Order'], ctx),
    ).toBe('my::model::Order');
  });

  test('prefers entity directly associated with failed root', () => {
    const ctx: LegendAIModelContext = {
      entities: [
        { path: 'a::Root', name: 'Root', properties: [] },
        { path: 'a::Direct', name: 'Direct', properties: [] },
        { path: 'a::Indirect', name: 'Indirect', properties: [] },
      ],
      associations: [
        {
          name: 'Root_Direct',
          leftEntity: 'a::Root',
          leftProperty: 'root',
          rightEntity: 'a::Direct',
          rightProperty: 'direct',
        },
        {
          name: 'Direct_Indirect',
          leftEntity: 'a::Direct',
          leftProperty: 'direct',
          rightEntity: 'a::Indirect',
          rightProperty: 'indirect',
        },
      ],
    };
    expect(
      findBestAlternateRoot('a::Root', ['a::Indirect', 'a::Direct'], ctx),
    ).toBe('a::Direct');
  });

  test('falls back to first related entity when no associations', () => {
    const ctx: LegendAIModelContext = {
      entities: [
        { path: 'a::A', name: 'A', properties: [] },
        { path: 'a::B', name: 'B', properties: [] },
        { path: 'a::C', name: 'C', properties: [] },
      ],
      associations: [],
    };
    expect(findBestAlternateRoot('a::A', ['a::B', 'a::C'], ctx)).toBe('a::B');
  });

  test('picks most-connected entity among multiple candidates', () => {
    const ctx: LegendAIModelContext = {
      entities: [
        { path: 'a::Root', name: 'Root', properties: [] },
        { path: 'a::Hub', name: 'Hub', properties: [] },
        { path: 'a::Leaf', name: 'Leaf', properties: [] },
        { path: 'a::Extra', name: 'Extra', properties: [] },
      ],
      associations: [
        {
          name: 'Root_Hub',
          leftEntity: 'a::Root',
          leftProperty: 'root',
          rightEntity: 'a::Hub',
          rightProperty: 'hub',
        },
        {
          name: 'Hub_Leaf',
          leftEntity: 'a::Hub',
          leftProperty: 'hub',
          rightEntity: 'a::Leaf',
          rightProperty: 'leaf',
        },
        {
          name: 'Hub_Extra',
          leftEntity: 'a::Hub',
          leftProperty: 'hub',
          rightEntity: 'a::Extra',
          rightProperty: 'extra',
        },
      ],
    };
    // Hub has 3 associations (Root_Hub + Hub_Leaf + Hub_Extra), Leaf has 1
    expect(findBestAlternateRoot('a::Root', ['a::Leaf', 'a::Hub'], ctx)).toBe(
      'a::Hub',
    );
  });
});

describe(unitTest('resolveEntitiesDeterministic'), () => {
  const baseCtx: LegendAIModelContext = {
    entities: [
      {
        path: 'model::Trade',
        name: 'Trade',
        properties: [
          {
            name: 'tradeId',
            type: 'String',
            isCollection: false,
            isOptional: false,
          },
          {
            name: 'quantity',
            type: 'Float',
            isCollection: false,
            isOptional: false,
          },
          {
            name: 'settlement',
            type: 'Date',
            isCollection: false,
            isOptional: false,
          },
        ],
        description: 'A financial trade record',
        isRootMapped: true,
      },
      {
        path: 'model::Account',
        name: 'Account',
        properties: [
          {
            name: 'accountId',
            type: 'String',
            isCollection: false,
            isOptional: false,
          },
          {
            name: 'accountName',
            type: 'String',
            isCollection: false,
            isOptional: false,
          },
        ],
        description: 'Client account information',
      },
      {
        path: 'model::Product',
        name: 'Product',
        properties: [
          {
            name: 'productId',
            type: 'String',
            isCollection: false,
            isOptional: false,
          },
          {
            name: 'productType',
            type: 'String',
            isCollection: false,
            isOptional: false,
          },
        ],
      },
    ],
    associations: [
      {
        name: 'Trade_Account',
        leftEntity: 'model::Trade',
        leftProperty: 'trade',
        rightEntity: 'model::Account',
        rightProperty: 'account',
      },
    ],
  };

  test('returns undefined for empty model context', () => {
    const ctx: LegendAIModelContext = { entities: [], associations: [] };
    expect(resolveEntitiesDeterministic('show trades', ctx)).toBeUndefined();
  });

  test('returns the only entity when model has exactly one', () => {
    const entity = baseCtx.entities[0];
    expect(entity).toBeDefined();
    const ctx: LegendAIModelContext = {
      entities: entity ? [entity] : [],
      associations: [],
    };
    const result = resolveEntitiesDeterministic('anything', ctx);
    expect(result).toEqual({
      rootEntity: 'model::Trade',
      relatedEntities: [],
    });
  });

  test('picks entity by name match', () => {
    const result = resolveEntitiesDeterministic(
      'show me the account data',
      baseCtx,
    );
    expect(result).toBeDefined();
    expect(result?.rootEntity).toBe('model::Account');
  });

  test('picks entity by property match', () => {
    const result = resolveEntitiesDeterministic(
      'what is the settlement date',
      baseCtx,
    );
    expect(result).toBeDefined();
    expect(result?.rootEntity).toBe('model::Trade');
  });

  test('gives root-mapped bonus when scores are close', () => {
    // Question mentions "product" — Trade is root-mapped (+3 bonus)
    // but name match (+5) beats root-mapped bonus
    const result = resolveEntitiesDeterministic('list product info', baseCtx);
    expect(result).toBeDefined();
    expect(result?.rootEntity).toBe('model::Product');
  });

  test('includes association-connected entities in relatedEntities', () => {
    const result = resolveEntitiesDeterministic('show trades', baseCtx);
    expect(result).toBeDefined();
    expect(result?.rootEntity).toBe('model::Trade');
    expect(result?.relatedEntities).toContain('model::Account');
  });

  test('picks root-mapped entity when no meaningful tokens', () => {
    const result = resolveEntitiesDeterministic('?!', baseCtx);
    expect(result).toBeDefined();
    expect(result?.rootEntity).toBe('model::Trade'); // root-mapped
  });

  test('picks root-mapped entity when all scores are zero', () => {
    const result = resolveEntitiesDeterministic('xyzzy foobar blarg', baseCtx);
    expect(result).toBeDefined();
    expect(result?.rootEntity).toBe('model::Trade'); // root-mapped
  });

  test('description keyword match contributes to score', () => {
    const result = resolveEntitiesDeterministic('financial records', baseCtx);
    expect(result).toBeDefined();
    expect(result?.rootEntity).toBe('model::Trade'); // "financial" in description
  });

  test('limits relatedEntities to at most 5', () => {
    const ctx: LegendAIModelContext = {
      entities: [
        {
          path: 'a::Root',
          name: 'Root',
          properties: [],
          isRootMapped: true,
        },
        ...Array.from({ length: 8 }, (_, i) => ({
          path: `a::E${i}`,
          name: `Entity${i}`,
          properties: [
            {
              name: 'root',
              type: 'String',
              isCollection: false,
              isOptional: false,
            },
          ],
        })),
      ],
      associations: Array.from({ length: 8 }, (_, i) => ({
        name: `Assoc${i}`,
        leftEntity: 'a::Root',
        leftProperty: 'root',
        rightEntity: `a::E${i}`,
        rightProperty: `e${i}`,
      })),
    };
    const result = resolveEntitiesDeterministic('show root data', ctx);
    expect(result).toBeDefined();
    expect(result?.relatedEntities.length).toBeLessThanOrEqual(5);
  });

  test('queryable entity wins over non-queryable with higher name score', () => {
    const ctx: LegendAIModelContext = {
      entities: [
        {
          path: 'model::OrigAggr',
          name: 'OrigAggr',
          properties: [
            {
              name: 'aggrid',
              type: 'Integer',
              isCollection: false,
              isOptional: false,
            },
            {
              name: 'loanamt',
              type: 'Float',
              isCollection: false,
              isOptional: false,
            },
          ],
          description: 'Loan aggregation data',
        },
        {
          path: 'model::OrigFhlloan',
          name: 'OrigFhlloan',
          properties: [
            {
              name: 'loanseqnum',
              type: 'String',
              isCollection: false,
              isOptional: false,
            },
            {
              name: 'cusip',
              type: 'String',
              isCollection: false,
              isOptional: false,
            },
          ],
          description: 'FHL loan level data',
          isQueryable: true,
        },
      ],
      associations: [],
      executables: [
        {
          title: 'FHL Loans For Beg Date Data',
          rootEntityPath: 'model::OrigFhlloan',
        },
      ],
    };
    // "loan" matches both entities but OrigFhlloan is queryable (+10)
    const result = resolveEntitiesDeterministic('show loan data', ctx);
    expect(result).toBeDefined();
    expect(result?.rootEntity).toBe('model::OrigFhlloan');
  });

  test('executable title match boosts score', () => {
    const ctx: LegendAIModelContext = {
      entities: [
        {
          path: 'model::OrigFhlloan',
          name: 'OrigFhlloan',
          properties: [
            {
              name: 'cusip',
              type: 'String',
              isCollection: false,
              isOptional: false,
            },
          ],
          isQueryable: true,
        },
        {
          path: 'model::OrigGnmloan',
          name: 'OrigGnmloan',
          properties: [
            {
              name: 'cusip',
              type: 'String',
              isCollection: false,
              isOptional: false,
            },
          ],
          isQueryable: true,
        },
        {
          path: 'model::OrigSec',
          name: 'OrigSec',
          properties: [
            {
              name: 'cusip',
              type: 'String',
              isCollection: false,
              isOptional: false,
            },
          ],
          isQueryable: true,
        },
      ],
      associations: [],
      executables: [
        {
          title: 'FHL Loans For Factor Date',
          rootEntityPath: 'model::OrigFhlloan',
        },
        {
          title: 'GNM Loans For Factor Date',
          rootEntityPath: 'model::OrigGnmloan',
        },
        {
          title: 'Sec For Agency Data',
          rootEntityPath: 'model::OrigSec',
        },
      ],
    };
    // "FHL" matches the executable title for OrigFhlloan
    const result = resolveEntitiesDeterministic('show FHL loan data', ctx);
    expect(result).toBeDefined();
    expect(result?.rootEntity).toBe('model::OrigFhlloan');
  });

  test('picks first queryable entity when no meaningful tokens', () => {
    const ctx: LegendAIModelContext = {
      entities: [
        {
          path: 'model::RefTable',
          name: 'RefTable',
          properties: [],
        },
        {
          path: 'model::QueryableEntity',
          name: 'QueryableEntity',
          properties: [],
          isQueryable: true,
        },
      ],
      associations: [],
    };
    const result = resolveEntitiesDeterministic('?!', ctx);
    expect(result).toBeDefined();
    expect(result?.rootEntity).toBe('model::QueryableEntity');
  });
});

describe(unitTest('buildSemanticPropertyIndex'), () => {
  test('indexes property names as tokens', () => {
    const ctx: LegendAIModelContext = {
      entities: [
        {
          path: 'model::Trade',
          name: 'Trade',
          properties: [
            {
              name: 'tradeDate',
              type: 'Date',
              isCollection: false,
              isOptional: false,
            },
            {
              name: 'settlementAmount',
              type: 'Float',
              isCollection: false,
              isOptional: false,
            },
          ],
        },
      ],
      associations: [],
    };
    const index = buildSemanticPropertyIndex(ctx);
    // camelCase is split: tradeDate → "trade", "date"
    expect(index.get('trade')?.has('model::Trade')).toBe(true);
    expect(index.get('date')?.has('model::Trade')).toBe(true);
    expect(index.get('settlement')?.has('model::Trade')).toBe(true);
    expect(index.get('amount')?.has('model::Trade')).toBe(true);
  });

  test('indexes entity descriptions', () => {
    const ctx: LegendAIModelContext = {
      entities: [
        {
          path: 'model::Security',
          name: 'Security',
          properties: [],
          description: 'Mortgage-backed security information',
        },
      ],
      associations: [],
    };
    const index = buildSemanticPropertyIndex(ctx);
    expect(index.get('mortgage')?.has('model::Security')).toBe(true);
    expect(index.get('security')?.has('model::Security')).toBe(true);
  });

  test('skips short tokens (length <= 2)', () => {
    const ctx: LegendAIModelContext = {
      entities: [
        {
          path: 'model::Item',
          name: 'Item',
          properties: [
            {
              name: 'id',
              type: 'String',
              isCollection: false,
              isOptional: false,
            },
          ],
        },
      ],
      associations: [],
    };
    const index = buildSemanticPropertyIndex(ctx);
    expect(index.has('id')).toBe(false);
  });
});

describe(unitTest('buildEnrichedBusinessContext with executables'), () => {
  test('includes queryable_hint for queryable entities', () => {
    const ctx: LegendAIModelContext = {
      entities: [
        {
          path: 'model::Loan',
          name: 'Loan',
          properties: [
            {
              name: 'amount',
              type: 'Float',
              isCollection: false,
              isOptional: false,
            },
          ],
          isQueryable: true,
        },
      ],
      associations: [],
      executables: [
        {
          title: 'Loan Service',
          rootEntityPath: 'model::Loan',
        },
      ],
    };
    const result = buildEnrichedBusinessContext(
      'show loans',
      'model::Loan',
      [],
      ctx,
    );
    const hints = result.businessContextMatch?.additionalNlModelContext ?? [];
    const queryableHint = hints.find((h) => h.category === 'queryable_hint');
    expect(queryableHint).toBeDefined();
    expect(queryableHint?.description).toContain('Loan Service');
  });

  test('includes product_context from dataspaceDescription', () => {
    const ctx: LegendAIModelContext = {
      entities: [
        {
          path: 'model::Data',
          name: 'Data',
          properties: [],
        },
      ],
      associations: [],
      dataspaceDescription:
        '# Welcome\nThis dataspace provides mortgage-backed securities data.',
    };
    const result = buildEnrichedBusinessContext(
      'show data',
      'model::Data',
      [],
      ctx,
    );
    const hints = result.businessContextMatch?.additionalNlModelContext ?? [];
    const productCtx = hints.find((h) => h.category === 'product_context');
    expect(productCtx).toBeDefined();
    expect(productCtx?.description).toContain('mortgage-backed securities');
  });

  test('includes query_template for matching executable', () => {
    const ctx: LegendAIModelContext = {
      entities: [
        {
          path: 'model::Loan',
          name: 'Loan',
          properties: [
            {
              name: 'amount',
              type: 'Float',
              isCollection: false,
              isOptional: false,
            },
          ],
          isQueryable: true,
        },
      ],
      associations: [],
      executables: [
        {
          title: 'Loan Service',
          rootEntityPath: 'model::Loan',
          queryTemplate:
            'model::Loan.all()->filter({x|$x.amount > 1000})->project(~[Amount: {x|$x.amount}])',
        },
      ],
    };
    const result = buildEnrichedBusinessContext(
      'show loans over 1000',
      'model::Loan',
      [],
      ctx,
    );
    const hints = result.businessContextMatch?.additionalNlModelContext ?? [];
    const template = hints.find((h) => h.category === 'query_template');
    expect(template).toBeDefined();
    expect(template?.description).toContain('Loan.all()');
    expect(template?.description).toContain('filter');
  });

  test('includes required_parameters for executable with params', () => {
    const ctx: LegendAIModelContext = {
      entities: [
        {
          path: 'model::Holdings',
          name: 'Holdings',
          properties: [
            {
              name: 'fundIsin',
              type: 'String',
              isCollection: false,
              isOptional: false,
            },
          ],
          isQueryable: true,
        },
      ],
      associations: [],
      executables: [
        {
          title: 'BBG Holdings Service',
          rootEntityPath: 'model::Holdings',
          requiredParameters: [
            { name: 'processingDate', type: 'Date' },
            { name: 'fundIsins', type: 'String' },
          ],
        },
      ],
    };
    const result = buildEnrichedBusinessContext(
      'show holdings',
      'model::Holdings',
      [],
      ctx,
    );
    const hints = result.businessContextMatch?.additionalNlModelContext ?? [];
    const reqParams = hints.find((h) => h.category === 'required_parameters');
    expect(reqParams).toBeDefined();
    expect(reqParams?.description).toContain('processingDate (Date)');
    expect(reqParams?.description).toContain('fundIsins (String)');
    expect(reqParams?.description).toContain('MUST include filters');
  });

  test('includes column_mappings for executable with column-property mappings', () => {
    const ctx: LegendAIModelContext = {
      entities: [
        {
          path: 'model::Holdings',
          name: 'Holdings',
          properties: [
            {
              name: 'longCompName',
              type: 'String',
              isCollection: false,
              isOptional: false,
            },
          ],
          isQueryable: true,
        },
      ],
      associations: [],
      executables: [
        {
          title: 'Holdings Service',
          rootEntityPath: 'model::Holdings',
          columnPropertyMappings: [
            {
              columnName: 'LONG COMP NAME',
              propertyPath: 'longCompName',
            },
          ],
        },
      ],
    };
    const result = buildEnrichedBusinessContext(
      'show holdings',
      'model::Holdings',
      [],
      ctx,
    );
    const hints = result.businessContextMatch?.additionalNlModelContext ?? [];
    const colMap = hints.find((h) => h.category === 'column_mappings');
    expect(colMap).toBeDefined();
    expect(colMap?.description).toContain('"LONG COMP NAME" → longCompName');
  });

  test('includes executable_summary listing all executables', () => {
    const ctx: LegendAIModelContext = {
      entities: [
        {
          path: 'model::Loan',
          name: 'Loan',
          properties: [],
          isQueryable: true,
        },
        {
          path: 'model::Security',
          name: 'Security',
          properties: [],
          isQueryable: true,
        },
      ],
      associations: [],
      executables: [
        {
          title: 'Loan Service',
          rootEntityPath: 'model::Loan',
          requiredParameters: [{ name: 'cusip', type: 'String' }],
        },
        {
          title: 'Sec Service',
          rootEntityPath: 'model::Security',
        },
      ],
    };
    const result = buildEnrichedBusinessContext(
      'show loans',
      'model::Loan',
      ['model::Security'],
      ctx,
    );
    const hints = result.businessContextMatch?.additionalNlModelContext ?? [];
    const summary = hints.find((h) => h.category === 'executable_summary');
    expect(summary).toBeDefined();
    expect(summary?.description).toContain('"Loan Service" → Loan');
    expect(summary?.description).toContain('"Sec Service" → Security');
    expect(summary?.description).toContain('requires: cusip');
  });

  test('does not include executable hints when no executables match root', () => {
    const ctx: LegendAIModelContext = {
      entities: [
        {
          path: 'model::Other',
          name: 'Other',
          properties: [],
        },
      ],
      associations: [],
      executables: [
        {
          title: 'Loan Service',
          rootEntityPath: 'model::Loan',
        },
      ],
    };
    const result = buildEnrichedBusinessContext(
      'show other',
      'model::Other',
      [],
      ctx,
    );
    const hints = result.businessContextMatch?.additionalNlModelContext ?? [];
    // Should have executable_summary but no query_template for Other
    const template = hints.find((h) => h.category === 'query_template');
    expect(template).toBeUndefined();
    // executable_summary should still exist
    const summary = hints.find((h) => h.category === 'executable_summary');
    expect(summary).toBeDefined();
  });

  test('includes cross_class_warning when question mentions properties on other entities', () => {
    const ctx: LegendAIModelContext = {
      entities: [
        {
          path: 'model::CombinedHoldings',
          name: 'CombinedHoldings',
          properties: [
            {
              name: 'fundTicker',
              type: 'String',
              isCollection: false,
              isOptional: false,
            },
            {
              name: 'positionClass',
              type: 'String',
              isCollection: false,
              isOptional: false,
            },
          ],
          isQueryable: true,
        },
        {
          path: 'model::FiccSales',
          name: 'FiccSales',
          properties: [
            {
              name: 'cntryOfDomicile',
              type: 'String',
              isCollection: false,
              isOptional: false,
            },
            {
              name: 'cntryOfRisk',
              type: 'String',
              isCollection: false,
              isOptional: false,
            },
            {
              name: 'longUltParentCompName',
              type: 'String',
              isCollection: false,
              isOptional: false,
            },
          ],
        },
      ],
      associations: [],
    };
    const result = buildEnrichedBusinessContext(
      'show fund holdings domiciled in the United States',
      'model::CombinedHoldings',
      [],
      ctx,
    );
    const hints = result.businessContextMatch?.additionalNlModelContext ?? [];
    const warning = hints.find((h) => h.category === 'cross_class_warning');
    expect(warning).toBeDefined();
    expect(warning?.description).toContain('cntryOfDomicile');
    expect(warning?.description).toContain('FiccSales');
    expect(warning?.description).toContain('NOT on CombinedHoldings');
  });

  test('does not include cross_class_warning when property exists on root', () => {
    const ctx: LegendAIModelContext = {
      entities: [
        {
          path: 'model::Holdings',
          name: 'Holdings',
          properties: [
            {
              name: 'fundTicker',
              type: 'String',
              isCollection: false,
              isOptional: false,
            },
            {
              name: 'positionClass',
              type: 'String',
              isCollection: false,
              isOptional: false,
            },
          ],
          isQueryable: true,
        },
        {
          path: 'model::Other',
          name: 'Other',
          properties: [
            {
              name: 'someOtherProp',
              type: 'String',
              isCollection: false,
              isOptional: false,
            },
          ],
        },
      ],
      associations: [],
    };
    const result = buildEnrichedBusinessContext(
      'show fund ticker information',
      'model::Holdings',
      [],
      ctx,
    );
    const hints = result.businessContextMatch?.additionalNlModelContext ?? [];
    const warning = hints.find((h) => h.category === 'cross_class_warning');
    expect(warning).toBeUndefined();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// buildModelContextEnrichmentText
// ────────────────────────────────────────────────────────────────────────────

describe(unitTest('buildModelContextEnrichmentText'), () => {
  test('returns undefined for empty model context', () => {
    const ctx: LegendAIModelContext = {
      entities: [],
      associations: [],
    };
    expect(buildModelContextEnrichmentText(ctx)).toBeUndefined();
  });

  test('includes dataspace description', () => {
    const ctx: LegendAIModelContext = {
      entities: [
        {
          path: 'model::Order',
          name: 'Order',
          properties: [
            {
              name: 'orderId',
              type: 'Integer',
              isCollection: false,
              isOptional: false,
            },
          ],
        },
      ],
      associations: [],
      dataspaceDescription: 'This dataspace contains order data.',
    };
    const result = buildModelContextEnrichmentText(ctx);
    expect(result).toBeDefined();
    expect(result).toContain('DATA MODEL CONTEXT');
    expect(result).toContain('This dataspace contains order data');
    expect(result).toContain('Model Entities');
    expect(result).toContain('Order');
    expect(result).toContain('orderId');
  });

  test('includes entity properties with types', () => {
    const ctx: LegendAIModelContext = {
      entities: [
        {
          path: 'model::Trade',
          name: 'Trade',
          properties: [
            {
              name: 'tradeId',
              type: 'String',
              isCollection: false,
              isOptional: false,
            },
            {
              name: 'amount',
              type: 'Float',
              isCollection: false,
              isOptional: true,
            },
          ],
          description: 'Represents a single trade execution',
          isQueryable: true,
          isRootMapped: true,
        },
      ],
      associations: [],
    };
    const result = buildModelContextEnrichmentText(ctx) ?? '';
    expect(result).toContain('Trade');
    expect(result).toContain('[QUERYABLE, ROOT_MAPPED]');
    expect(result).toContain('tradeId: String');
    expect(result).toContain('amount: Float');
    expect(result).toContain('Represents a single trade execution');
  });

  test('includes enumerations with values', () => {
    const ctx: LegendAIModelContext = {
      entities: [],
      associations: [],
      enumerations: [
        {
          path: 'model::Status',
          name: 'Status',
          values: ['ACTIVE', 'INACTIVE', 'PENDING'],
        },
      ],
    };
    const result = buildModelContextEnrichmentText(ctx) ?? '';
    expect(result).toContain('Enumerations');
    expect(result).toContain('Status');
    expect(result).toContain('ACTIVE, INACTIVE, PENDING');
  });

  test('includes associations', () => {
    const ctx: LegendAIModelContext = {
      entities: [],
      associations: [
        {
          name: 'OrderProduct',
          leftEntity: 'model::Order',
          rightEntity: 'model::Product',
          leftProperty: 'product',
          rightProperty: 'orders',
        },
      ],
    };
    const result = buildModelContextEnrichmentText(ctx) ?? '';
    expect(result).toContain('Entity Relationships');
    expect(result).toContain('Order.product');
    expect(result).toContain('Product.orders');
  });

  test('includes executable intelligence', () => {
    const ctx: LegendAIModelContext = {
      entities: [],
      associations: [],
      executables: [
        {
          title: 'Fund Holdings Report',
          rootEntityPath: 'model::FundHolding',
          description: 'Daily fund position report',
          requiredParameters: [{ name: 'asOfDate', type: 'StrictDate' }],
        },
      ],
    };
    const result = buildModelContextEnrichmentText(ctx) ?? '';
    expect(result).toContain('Available Executables');
    expect(result).toContain('Fund Holdings Report');
    expect(result).toContain('FundHolding');
    expect(result).toContain('Daily fund position report');
    expect(result).toContain('asOfDate (StrictDate)');
  });

  test('prioritizes queryable entities over non-queryable', () => {
    const ctx: LegendAIModelContext = {
      entities: [
        {
          path: 'model::Alpha',
          name: 'Alpha',
          properties: [],
        },
        {
          path: 'model::Beta',
          name: 'Beta',
          properties: [],
          isQueryable: true,
        },
      ],
      associations: [],
    };
    const result = buildModelContextEnrichmentText(ctx) ?? '';
    const alphaIdx = result.indexOf('Alpha');
    const betaIdx = result.indexOf('Beta');
    // Beta should appear before Alpha because it's queryable
    expect(betaIdx).toBeLessThan(alphaIdx);
  });

  test('handles collection properties with (many) annotation', () => {
    const ctx: LegendAIModelContext = {
      entities: [
        {
          path: 'model::Portfolio',
          name: 'Portfolio',
          properties: [
            {
              name: 'holdings',
              type: 'Holding',
              isCollection: true,
              isOptional: false,
            },
          ],
        },
      ],
      associations: [],
    };
    const result = buildModelContextEnrichmentText(ctx) ?? '';
    expect(result).toContain('holdings: Holding (many)');
  });

  test('full model context produces complete enrichment', () => {
    const ctx: LegendAIModelContext = {
      entities: [
        {
          path: 'model::Order',
          name: 'Order',
          properties: [
            {
              name: 'orderId',
              type: 'Integer',
              isCollection: false,
              isOptional: false,
            },
            {
              name: 'status',
              type: 'model::OrderStatus',
              isCollection: false,
              isOptional: false,
            },
          ],
          isQueryable: true,
          isRootMapped: true,
          description: 'Customer order',
        },
      ],
      associations: [
        {
          name: 'OrderLineItems',
          leftEntity: 'model::Order',
          rightEntity: 'model::LineItem',
          leftProperty: 'lineItems',
          rightProperty: 'order',
        },
      ],
      enumerations: [
        {
          path: 'model::OrderStatus',
          name: 'OrderStatus',
          values: ['NEW', 'FILLED', 'CANCELLED'],
        },
      ],
      executables: [
        {
          title: 'Order History',
          rootEntityPath: 'model::Order',
          requiredParameters: [{ name: 'startDate', type: 'StrictDate' }],
        },
      ],
      dataspaceDescription: 'Order management data',
    };
    const result = buildModelContextEnrichmentText(ctx) ?? '';
    expect(result).toContain('DATA MODEL CONTEXT');
    expect(result).toContain('Data Model Overview');
    expect(result).toContain('Order management data');
    expect(result).toContain('Model Entities');
    expect(result).toContain('Order');
    expect(result).toContain('[QUERYABLE, ROOT_MAPPED]');
    expect(result).toContain('Enumerations');
    expect(result).toContain('NEW, FILLED, CANCELLED');
    expect(result).toContain('Entity Relationships');
    expect(result).toContain('Order.lineItems');
    expect(result).toContain('Available Executables');
    expect(result).toContain('Order History');
    expect(result).toContain('startDate (StrictDate)');
  });

  test('maps column names to enum values when services provided', () => {
    const ctx: LegendAIModelContext = {
      entities: [
        {
          path: 'model::Order',
          name: 'Order',
          properties: [
            {
              name: 'status',
              type: 'model::OrderStatus',
              isCollection: false,
              isOptional: false,
            },
            {
              name: 'region',
              type: 'model::Region',
              isCollection: false,
              isOptional: false,
            },
            {
              name: 'orderId',
              type: 'Integer',
              isCollection: false,
              isOptional: false,
            },
          ],
        },
      ],
      associations: [],
      enumerations: [
        {
          path: 'model::OrderStatus',
          name: 'OrderStatus',
          values: ['NEW', 'FILLED', 'CANCELLED'],
        },
        {
          path: 'model::Region',
          name: 'Region',
          values: ['US', 'EU', 'APAC', 'LATAM'],
        },
      ],
    };
    const services: TDSServiceSchema[] = [
      {
        title: 'OrderService',
        pattern: '/orders',
        columns: [
          { name: 'orderId', type: 'Integer' },
          { name: 'status', type: 'String' },
          { name: 'region', type: 'String' },
          { name: 'amount', type: 'Float' },
        ] as TDSColumnSchema[],
        parameters: [],
      } as TDSServiceSchema,
    ];
    const result = buildModelContextEnrichmentText(ctx, services) ?? '';
    expect(result).toContain('Column Filter Value Mappings');
    expect(result).toContain('Column "status" accepts: NEW, FILLED, CANCELLED');
    expect(result).toContain('Column "region" accepts: US, EU, APAC, LATAM');
    // orderId is an Integer, not an enum — should NOT appear
    expect(result).not.toContain('Column "orderId"');
    // amount has no model property match — should NOT appear
    expect(result).not.toContain('Column "amount"');
  });

  test('does not produce enum mappings without services', () => {
    const ctx: LegendAIModelContext = {
      entities: [
        {
          path: 'model::Trade',
          name: 'Trade',
          properties: [
            {
              name: 'status',
              type: 'model::Status',
              isCollection: false,
              isOptional: false,
            },
          ],
        },
      ],
      associations: [],
      enumerations: [
        { path: 'model::Status', name: 'Status', values: ['ACTIVE', 'CLOSED'] },
      ],
    };
    const result = buildModelContextEnrichmentText(ctx) ?? '';
    // Enumerations section should exist but NOT column mappings
    expect(result).toContain('Enumerations');
    expect(result).not.toContain('Column Filter Value Mappings');
  });

  test('deduplicates column enum mappings across services', () => {
    const ctx: LegendAIModelContext = {
      entities: [
        {
          path: 'model::Trade',
          name: 'Trade',
          properties: [
            {
              name: 'status',
              type: 'model::Status',
              isCollection: false,
              isOptional: false,
            },
          ],
        },
      ],
      associations: [],
      enumerations: [
        { path: 'model::Status', name: 'Status', values: ['OPEN', 'CLOSED'] },
      ],
    };
    const services: TDSServiceSchema[] = [
      {
        title: 'Service1',
        pattern: '/svc1',
        columns: [{ name: 'status', type: 'String' }] as TDSColumnSchema[],
        parameters: [],
      } as TDSServiceSchema,
      {
        title: 'Service2',
        pattern: '/svc2',
        columns: [{ name: 'status', type: 'String' }] as TDSColumnSchema[],
        parameters: [],
      } as TDSServiceSchema,
    ];
    const result = buildModelContextEnrichmentText(ctx, services) ?? '';
    // Should appear exactly once, not duplicated
    const matches = result.match(/Column "status" accepts/g);
    expect(matches).toHaveLength(1);
  });

  test('generates service-to-entity JOIN hints when services and associations present', () => {
    const ctx: LegendAIModelContext = {
      entities: [
        {
          path: 'model::Order',
          name: 'Order',
          properties: [
            {
              name: 'orderId',
              type: 'Integer',
              isCollection: false,
              isOptional: false,
            },
            {
              name: 'quantity',
              type: 'Integer',
              isCollection: false,
              isOptional: false,
            },
            {
              name: 'customerId',
              type: 'String',
              isCollection: false,
              isOptional: false,
            },
          ],
        },
        {
          path: 'model::Product',
          name: 'Product',
          properties: [
            {
              name: 'productId',
              type: 'String',
              isCollection: false,
              isOptional: false,
            },
            {
              name: 'productName',
              type: 'String',
              isCollection: false,
              isOptional: false,
            },
            {
              name: 'price',
              type: 'Float',
              isCollection: false,
              isOptional: false,
            },
          ],
        },
      ],
      associations: [
        {
          name: 'Order_Product',
          leftEntity: 'model::Order',
          rightEntity: 'model::Product',
          leftProperty: 'product',
          rightProperty: 'orders',
        },
      ],
    };
    const services: TDSServiceSchema[] = [
      {
        title: 'OrderService',
        pattern: '/orders',
        columns: [
          { name: 'orderId', type: 'Integer' },
          { name: 'quantity', type: 'Integer' },
          { name: 'customerId', type: 'String' },
        ] as TDSColumnSchema[],
        parameters: [],
      } as TDSServiceSchema,
      {
        title: 'ProductService',
        pattern: '/products',
        columns: [
          { name: 'productId', type: 'String' },
          { name: 'productName', type: 'String' },
          { name: 'price', type: 'Float' },
        ] as TDSColumnSchema[],
        parameters: [],
      } as TDSServiceSchema,
    ];
    const result = buildModelContextEnrichmentText(ctx, services) ?? '';
    expect(result).toContain('Model-Aware Service JOIN Guide');
    expect(result).toContain('OrderService');
    expect(result).toContain('ProductService');
    expect(result).toContain('entity Order');
    expect(result).toContain('entity Product');
    expect(result).toContain('Inter-Service Relationships');
    expect(result).toContain('Order.product');
  });

  test('shows same-entity hint when two services map to the same entity', () => {
    const ctx: LegendAIModelContext = {
      entities: [
        {
          path: 'model::Trade',
          name: 'Trade',
          properties: [
            {
              name: 'tradeId',
              type: 'String',
              isCollection: false,
              isOptional: false,
            },
            {
              name: 'amount',
              type: 'Float',
              isCollection: false,
              isOptional: false,
            },
          ],
        },
      ],
      associations: [
        {
          name: 'Dummy',
          leftEntity: 'model::Trade',
          rightEntity: 'model::Other',
          leftProperty: 'other',
          rightProperty: 'trades',
        },
      ],
    };
    const services: TDSServiceSchema[] = [
      {
        title: 'TradeHistoryService',
        pattern: '/trades/history',
        columns: [
          { name: 'tradeId', type: 'String' },
          { name: 'amount', type: 'Float' },
        ] as TDSColumnSchema[],
        parameters: [],
      } as TDSServiceSchema,
      {
        title: 'TradeCurrentService',
        pattern: '/trades/current',
        columns: [
          { name: 'tradeId', type: 'String' },
          { name: 'amount', type: 'Float' },
        ] as TDSColumnSchema[],
        parameters: [],
      } as TDSServiceSchema,
    ];
    const result = buildModelContextEnrichmentText(ctx, services) ?? '';
    expect(result).toContain('SAME entity');
    expect(result).toContain('shared identifier column');
  });

  test('does not generate JOIN hints with only one service', () => {
    const ctx: LegendAIModelContext = {
      entities: [
        {
          path: 'model::Order',
          name: 'Order',
          properties: [
            {
              name: 'orderId',
              type: 'Integer',
              isCollection: false,
              isOptional: false,
            },
          ],
        },
      ],
      associations: [
        {
          name: 'Dummy',
          leftEntity: 'model::Order',
          rightEntity: 'model::Product',
          leftProperty: 'product',
          rightProperty: 'orders',
        },
      ],
    };
    const services: TDSServiceSchema[] = [
      {
        title: 'OrderService',
        pattern: '/orders',
        columns: [{ name: 'orderId', type: 'Integer' }] as TDSColumnSchema[],
        parameters: [],
      } as TDSServiceSchema,
    ];
    const result = buildModelContextEnrichmentText(ctx, services) ?? '';
    expect(result).not.toContain('Model-Aware Service JOIN Guide');
  });
});
