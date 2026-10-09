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

import { describe, expect, test } from '@jest/globals';
import {
  resolvedTable,
  TestUnaryNode,
} from '../../../__test-utils__/CubeTestNodes.js';
import { unitTest } from '../../../__test-utils__/CubeTestUtils.js';
import { Connection } from '../../../graph/Connection.js';
import { Query } from '../../../graph/Query.js';
import { buildSchemasAndValidity } from '../../../inference/SchemaInference.js';
import { ERR_INCOMPLETE, ERR_SCHEMAS } from '../../../messages/CubeMessages.js';
import { Schema, SchemaColumn } from '../../../schema/Schema.js';
import {
  type CubeType,
  EnumType,
  OpaqueType,
  PrimitiveType,
} from '../../../types/CubeType.js';
import { createNodeRegistry } from '../../NodeRegistry.js';
import {
  Concat,
  CONCAT_PORT_LABELS,
  validateConcatSchemas,
} from '../Concat.js';

const PRECISE = 'meta::pure::precisePrimitives::';
const type = (path: string, params: number[] = []): CubeType =>
  PrimitiveType.get(path, params);
const VARCHAR_5 = type(`${PRECISE}Varchar`, [5]);
const VARCHAR_15 = type(`${PRECISE}Varchar`, [15]);
const VARCHAR_40 = type(`${PRECISE}Varchar`, [40]);
const SMALL_INT = type(`${PRECISE}SmallInt`);
const INT = type(`${PRECISE}Int`);
const BIG_INT = type(`${PRECISE}BigInt`);
const INTEGER = type('Integer');
const STRING = type('String');
const TIMESTAMP = type(`${PRECISE}Timestamp`);
const STRICT_DATE = type('StrictDate');
const REGION = new EnumType('test::Region', ['EMEA', 'APAC']);

/** The spec's message (§7.10), which comes before Cube's */
const IDENTICAL = 'Both input schemas must be identical.';
const ORDER =
  'The inputs have the same columns in a different order: columns are matched by position.';

const columnOf = (
  name: string,
  columnType: CubeType = INT,
  nullable = false,
): SchemaColumn => new SchemaColumn(name, columnType, nullable);

const schema = (...columns: SchemaColumn[]): Schema => new Schema(columns);

/** A schema of INT columns, not nullable, with these names */
const named = (...names: string[]): Schema =>
  schema(...names.map((name) => columnOf(name)));

/** Each column as `name type`, with `?` when nullable, e.g. `ID Varchar(5)` or `CITY Varchar(15)?` */
const describeColumns = (columns: readonly SchemaColumn[]): string[] =>
  columns.map((c) => `${c.name} ${c.type.displayName}${c.nullable ? '?' : ''}`);

/**
 * The node's errors for these inputs, checking that validating without
 * collecting errors, and the exported check, give the same verdict
 */
const validationErrors = (
  first: Schema,
  second: Schema,
  node = new Concat('concat101'),
): string[] => {
  const errors: string[] = [];
  expect(node.validate([first, second], errors)).toBe(errors.length === 0);
  expect(node.validate([first, second])).toBe(errors.length === 0);
  const direct: string[] = [];
  expect(validateConcatSchemas(first, second, direct)).toBe(
    errors.length === 0,
  );
  expect(validateConcatSchemas(first, second)).toBe(errors.length === 0);
  expect(direct).toEqual(errors);
  return errors;
};

const outputOf = (
  first: Schema,
  second: Schema,
  node = new Concat('concat101'),
): Schema => {
  const output = node.schematize([first, second]);
  if (!output) {
    throw new Error(
      `Expected a valid concat, got: ${validationErrors(first, second, node).join(' | ')}`,
    );
  }
  return output;
};

// Appendix C-like customers and suppliers, with the precise types an engine reports
const CUSTOMERS = schema(
  columnOf('ID', VARCHAR_5),
  columnOf('COMPANY_NAME', VARCHAR_40),
  columnOf('CITY', VARCHAR_15, true),
  columnOf('COUNTRY', VARCHAR_15, true),
);

describe(unitTest('Concat node'), () => {
  test('Is a binary node with First and Second ports', () => {
    const node = new Concat('concat101');
    expect(node.type).toBe('concat');
    expect(Concat.TYPE).toBe('concat');
    expect(node.ports).toEqual(['tds1', 'tds2']);
    expect(node.portLabels).toEqual(['First', 'Second']);
    expect(CONCAT_PORT_LABELS).toEqual(['First', 'Second']);
    expect(Object.isFrozen(CONCAT_PORT_LABELS)).toBe(true);
    expect(node.acceptsNewInputs).toBe(true);
  });

  test('Takes no rows by their order, and gives its rows none', () => {
    const node = new Concat('concat101');
    expect(node.consumesInputOrder).toBe(false);
    expect(node.outputOrder([undefined, undefined])).toEqual([]);
  });

  test('Converts no types by default', () => {
    expect(new Concat('concat101').widenTypes).toBe(false);
    expect(new Concat('concat101', undefined).widenTypes).toBe(false);
    expect(new Concat('concat101', false).widenTypes).toBe(false);
    expect(new Concat('concat101', true).widenTypes).toBe(true);
  });

  test.each<[string, unknown]>([
    ['a string', 'true'],
    ['a number', 1],
    ['zero', 0],
    ['null', null],
    ['an object', {}],
  ])('Refuses a widenTypes setting that is %s', (_, widenTypes) => {
    expect(() => new Concat('concat101', widenTypes as never)).toThrow(
      `A concat's widenTypes must be true or false`,
    );
  });

  test('Refuses an empty id', () => {
    expect(() => new Concat('')).toThrow();
  });

  test('Keeps its id and saved keys when its setting is edited', () => {
    const rest = { note: 'kept' };
    const node = new Concat('concat101', false, rest);
    const edited = node.withWidenTypes(true);
    expect(edited).toBeInstanceOf(Concat);
    expect(edited.id).toBe('concat101');
    expect(edited.key).not.toBe(node.key);
    expect(edited.widenTypes).toBe(true);
    expect(edited.rest).toBe(rest);
    expect(node.widenTypes).toBe(false);
    const restored = edited.withWidenTypes(false);
    expect(restored.id).toBe('concat101');
    expect(restored.widenTypes).toBe(false);
    expect(restored.rest).toBe(rest);
  });

  test('Has no setting by side to swap when its inputs swap', () => {
    const node = new Concat('concat101', true);
    expect(node.withSwappedInputs()).toBe(node);
  });

  test('Describes itself, saying when it converts types', () => {
    expect(new Concat('concat101').describe()).toBe(
      'Concatenate additional input',
    );
    expect(new Concat('concat101', true).describe()).toBe(
      'Concatenate additional input, converting types',
    );
    // it holds nothing users typed
    expect(new Concat('concat101').describeRedacted()).toBe(
      'Concatenate additional input',
    );
    expect(new Concat('concat101', true).describeRedacted()).toBe(
      'Concatenate additional input, converting types',
    );
  });

  test('Checks that it gets one input schema per port', () => {
    const node = new Concat('concat101');
    expect(() => node.validate([CUSTOMERS])).toThrow(/input schema/u);
    expect(() => node.schematize([CUSTOMERS, CUSTOMERS, CUSTOMERS])).toThrow(
      /input schema/u,
    );
  });
});

describe(unitTest('Concat validation'), () => {
  test('Accepts two inputs with the same names and types, in the same order', () => {
    expect(validationErrors(CUSTOMERS, CUSTOMERS)).toEqual([]);
    expect(
      validationErrors(
        schema(columnOf('ID', VARCHAR_5)),
        schema(columnOf('ID', VARCHAR_5)),
      ),
    ).toEqual([]);
  });

  describe('The column count', () => {
    test('Is reported when the first input has more columns', () => {
      expect(validationErrors(named('A', 'B', 'C'), named('A', 'B'))).toEqual([
        IDENTICAL,
        'The first input has 3 columns and the second 2.',
      ]);
    });

    test('Is reported when the second input has more columns', () => {
      expect(validationErrors(named('A', 'B'), named('A', 'B', 'C'))).toEqual([
        IDENTICAL,
        'The first input has 2 columns and the second 3.',
      ]);
    });

    test('Says "1 column" for a single column', () => {
      expect(validationErrors(named('A'), named('A', 'B'))).toEqual([
        IDENTICAL,
        'The first input has 1 column and the second 2.',
      ]);
      expect(validationErrors(named('A', 'B'), named('A'))).toEqual([
        IDENTICAL,
        'The first input has 2 columns and the second 1.',
      ]);
    });

    test('Is checked before the names and types: a different count is all that is reported', () => {
      expect(
        validationErrors(
          named('A', 'B'),
          schema(
            columnOf('X', STRING),
            columnOf('Y', STRING),
            columnOf('Z', STRING),
          ),
        ),
      ).toEqual([IDENTICAL, 'The first input has 2 columns and the second 3.']);
    });
  });

  describe('The names', () => {
    test('Are compared at each position', () => {
      expect(
        validationErrors(named('A', 'B', 'C'), named('A', 'X', 'C')),
      ).toEqual([
        IDENTICAL,
        'Column 2 is "B" in the first input and "X" in the second: columns are matched by position.',
      ]);
    });

    test('Are reported at every position that differs', () => {
      expect(
        validationErrors(named('A', 'B', 'C'), named('X', 'B', 'Z')),
      ).toEqual([
        IDENTICAL,
        'Column 1 is "A" in the first input and "X" in the second: columns are matched by position.',
        'Column 3 is "C" in the first input and "Z" in the second: columns are matched by position.',
      ]);
    });

    test('Are case-sensitive: a name in another case is another name', () => {
      expect(validationErrors(named('VC', 'ID'), named('vc', 'ID'))).toEqual([
        IDENTICAL,
        'Column 1 is "VC" in the first input and "vc" in the second: columns are matched by position.',
      ]);
    });

    test('In another order are reported once, as an order', () => {
      expect(
        validationErrors(named('A', 'B', 'C'), named('C', 'A', 'B')),
      ).toEqual([IDENTICAL, ORDER]);
      // two columns swapped
      expect(
        validationErrors(named('A', 'B', 'C'), named('A', 'C', 'B')),
      ).toEqual([IDENTICAL, ORDER]);
    });

    test('In another order, with a name the other input lacks, are reported position by position', () => {
      expect(
        validationErrors(named('A', 'B', 'C'), named('B', 'A', 'D')),
      ).toEqual([
        IDENTICAL,
        'Column 1 is "A" in the first input and "B" in the second: columns are matched by position.',
        'Column 2 is "B" in the first input and "A" in the second: columns are matched by position.',
        'Column 3 is "C" in the first input and "D" in the second: columns are matched by position.',
      ]);
    });

    test('In another order and another case are reported position by position', () => {
      expect(validationErrors(named('A', 'b'), named('B', 'a'))).toEqual([
        IDENTICAL,
        'Column 1 is "A" in the first input and "B" in the second: columns are matched by position.',
        'Column 2 is "b" in the first input and "a" in the second: columns are matched by position.',
      ]);
    });

    test('Are checked before the types: different names are all that is reported', () => {
      // A's types differ too, and B is named X in the second input
      expect(
        validationErrors(
          schema(columnOf('A', INT), columnOf('B', VARCHAR_15)),
          schema(columnOf('A', BIG_INT), columnOf('X', VARCHAR_15)),
        ),
      ).toEqual([
        IDENTICAL,
        'Column 2 is "B" in the first input and "X" in the second: columns are matched by position.',
      ]);
      // reordered, each column with another type in its new place
      expect(
        validationErrors(
          schema(columnOf('A', INT), columnOf('B', VARCHAR_15)),
          schema(columnOf('B', INT), columnOf('A', VARCHAR_15)),
        ),
      ).toEqual([IDENTICAL, ORDER]);
    });
  });

  describe('The types', () => {
    // strict, as D5 says, even next to the type's own ancestor (Q5)
    test.each<[string, CubeType, CubeType, string]>([
      [
        'two Varchar lengths',
        VARCHAR_15,
        VARCHAR_40,
        'Column "C" is Varchar(15) in the first input and Varchar(40) in the second.',
      ],
      [
        'SmallInt and Int',
        SMALL_INT,
        INT,
        'Column "C" is SmallInt in the first input and Int in the second.',
      ],
      [
        'Int and BigInt',
        INT,
        BIG_INT,
        'Column "C" is Int in the first input and BigInt in the second.',
      ],
      [
        'a parent and its child (Integer and SmallInt)',
        INTEGER,
        SMALL_INT,
        'Column "C" is Integer in the first input and SmallInt in the second.',
      ],
      [
        'a child and its parent (SmallInt and Integer)',
        SMALL_INT,
        INTEGER,
        'Column "C" is SmallInt in the first input and Integer in the second.',
      ],
      [
        'a parent and its child (String and Varchar(40))',
        STRING,
        VARCHAR_40,
        'Column "C" is String in the first input and Varchar(40) in the second.',
      ],
      [
        'a child and its parent (Varchar(40) and String)',
        VARCHAR_40,
        STRING,
        'Column "C" is Varchar(40) in the first input and String in the second.',
      ],
      [
        'two Numeric precisions and scales',
        type(`${PRECISE}Numeric`, [10, 2]),
        type(`${PRECISE}Numeric`, [12, 4]),
        'Column "C" is Numeric(10,2) in the first input and Numeric(12,4) in the second.',
      ],
      [
        'StrictDate and Timestamp',
        STRICT_DATE,
        TIMESTAMP,
        'Column "C" is StrictDate in the first input and Timestamp in the second.',
      ],
      [
        'two enumerations',
        REGION,
        new EnumType('test::Country', ['UK', 'FR']),
        'Column "C" is Region in the first input and Country in the second.',
      ],
      [
        'an enumeration and a string',
        REGION,
        VARCHAR_15,
        'Column "C" is Region in the first input and Varchar(15) in the second.',
      ],
    ])('Must be equal: %s differ', (_, firstType, secondType, message) => {
      expect(
        validationErrors(
          schema(columnOf('ID'), columnOf('C', firstType)),
          schema(columnOf('ID'), columnOf('C', secondType)),
        ),
      ).toEqual([IDENTICAL, message]);
    });

    test('Of two enumerations with the same short name are named by their paths', () => {
      expect(
        validationErrors(
          schema(columnOf('C', new EnumType('a::Region', ['EMEA']))),
          schema(columnOf('C', new EnumType('b::Region', ['EMEA']))),
        ),
      ).toEqual([
        IDENTICAL,
        'Column "C" is a::Region in the first input and b::Region in the second.',
      ]);
    });

    test('Of two opaque types with the same short name are named by their paths', () => {
      expect(
        validationErrors(
          schema(columnOf('C', OpaqueType.get('a::Blob'))),
          schema(columnOf('C', OpaqueType.get('b::Blob'))),
        ),
      ).toEqual([
        IDENTICAL,
        'Column "C" is a::Blob in the first input and b::Blob in the second.',
      ]);
    });

    test('Of an enumeration and an opaque type with the same short name are named by their paths', () => {
      expect(
        validationErrors(
          schema(columnOf('C', new EnumType('a::Region', ['EMEA']))),
          schema(columnOf('C', OpaqueType.get('a::Region'))),
        ),
      ).toEqual([
        IDENTICAL,
        'Column "C" is a::Region in the first input and a::Region in the second.',
      ]);
    });

    test('Are reported at every position that differs, in order', () => {
      expect(
        validationErrors(
          schema(
            columnOf('ID', INT),
            columnOf('NAME', VARCHAR_15),
            columnOf('DAY', STRICT_DATE),
          ),
          schema(
            columnOf('ID', BIG_INT),
            columnOf('NAME', VARCHAR_15),
            columnOf('DAY', TIMESTAMP),
          ),
        ),
      ).toEqual([
        IDENTICAL,
        'Column "ID" is Int in the first input and BigInt in the second.',
        'Column "DAY" is StrictDate in the first input and Timestamp in the second.',
      ]);
    });

    test('Are equal for the same enumeration, whatever values each input knows', () => {
      expect(
        validationErrors(
          schema(columnOf('C', REGION)),
          schema(columnOf('C', new EnumType('test::Region', ['EMEA']))),
        ),
      ).toEqual([]);
    });

    test('Are equal for the same opaque type', () => {
      const blob = OpaqueType.get('my::model::Blob');
      expect(
        validationErrors(
          schema(columnOf('C', blob)),
          schema(columnOf('C', OpaqueType.get('my::model::Blob'))),
        ),
      ).toEqual([]);
    });
  });

  test('Never compares nullability, either way', () => {
    expect(
      validationErrors(
        schema(columnOf('A', INT, true), columnOf('B', VARCHAR_15, false)),
        schema(columnOf('A', INT, false), columnOf('B', VARCHAR_15, true)),
      ),
    ).toEqual([]);
  });

  test('Still requires equal types with widenTypes on, until M4.13', () => {
    // M4.13 converts types within a family: this Concat then becomes valid, typed String
    const widening = new Concat('concat101', true);
    const first = schema(columnOf('C', VARCHAR_15));
    const second = schema(columnOf('C', VARCHAR_40));
    expect(validationErrors(first, second, widening)).toEqual([
      IDENTICAL,
      'Column "C" is Varchar(15) in the first input and Varchar(40) in the second.',
    ]);
    expect(widening.schematize([first, second])).toBeUndefined();
    // M4.13 converts SmallInt and Int to Integer
    expect(
      validationErrors(
        schema(columnOf('C', SMALL_INT)),
        schema(columnOf('C', INT)),
        widening,
      ),
    ).toEqual([
      IDENTICAL,
      'Column "C" is SmallInt in the first input and Int in the second.',
    ]);
  });
});

describe(unitTest('Concat schema'), () => {
  test.each<[string, Schema, Schema]>([
    ['a different count', named('A', 'B'), named('A')],
    ['a different name', named('A', 'B'), named('A', 'X')],
    ['the same names in another order', named('A', 'B'), named('B', 'A')],
    [
      'a different type',
      schema(columnOf('A', INT)),
      schema(columnOf('A', BIG_INT)),
    ],
  ])('Has none for inputs with %s', (_, first, second) => {
    expect(new Concat('concat101').schematize([first, second])).toBeUndefined();
  });

  test("Has the first input's names and types, in order", () => {
    const output = outputOf(CUSTOMERS, CUSTOMERS);
    expect(output).toBeInstanceOf(Schema);
    expect(describeColumns(output.columns)).toEqual([
      'ID Varchar(5)',
      'COMPANY_NAME Varchar(40)',
      'CITY Varchar(15)?',
      'COUNTRY Varchar(15)?',
    ]);
  });

  test("Has the first input's type for an enumeration the second knows other values of", () => {
    const fewer = new EnumType('test::Region', ['EMEA']);
    const [fromFirst] = outputOf(
      schema(columnOf('R', REGION)),
      schema(columnOf('R', fewer)),
    ).columns;
    expect(fromFirst?.type).toBe(REGION);
    const [fromSecond] = outputOf(
      schema(columnOf('R', fewer)),
      schema(columnOf('R', REGION)),
    ).columns;
    expect(fromSecond?.type).toBe(fewer);
  });

  test('Makes a column nullable when either input has it nullable', () => {
    const first = schema(
      columnOf('NEITHER', INT, false),
      columnOf('FIRST', INT, true),
      columnOf('SECOND', INT, false),
      columnOf('BOTH', INT, true),
    );
    const second = schema(
      columnOf('NEITHER', INT, false),
      columnOf('FIRST', INT, false),
      columnOf('SECOND', INT, true),
      columnOf('BOTH', INT, true),
    );
    expect(describeColumns(outputOf(first, second).columns)).toEqual([
      'NEITHER Int',
      'FIRST Int?',
      'SECOND Int?',
      'BOTH Int?',
    ]);
    // and the same with the inputs the other way round
    expect(describeColumns(outputOf(second, first).columns)).toEqual([
      'NEITHER Int',
      'FIRST Int?',
      'SECOND Int?',
      'BOTH Int?',
    ]);
  });

  test('Has the same schema with widenTypes on, for inputs whose types are equal', () => {
    expect(
      describeColumns(
        outputOf(CUSTOMERS, CUSTOMERS, new Concat('concat101', true)).columns,
      ),
    ).toEqual(describeColumns(CUSTOMERS.columns));
  });
});

describe(unitTest('Concat in a query'), () => {
  const customers = (): ReturnType<typeof resolvedTable> =>
    resolvedTable('relational101', 'CUSTOMERS', [...CUSTOMERS.columns]);
  const suppliers = (
    columns: readonly SchemaColumn[] = [
      columnOf('ID', VARCHAR_5),
      columnOf('COMPANY_NAME', VARCHAR_40, true),
      columnOf('CITY', VARCHAR_15, false),
      columnOf('COUNTRY', VARCHAR_15, true),
    ],
  ): ReturnType<typeof resolvedTable> =>
    resolvedTable('relational102', 'SUPPLIERS', [...columns]);

  /** customers then suppliers, concatenated, then a test unary node */
  const concatenated = (
    second = suppliers(),
    node = new Concat('concat101'),
  ): Query =>
    new Query(
      [customers(), second, node, new TestUnaryNode('filter101')],
      [
        new Connection('relational101', 'concat101', 'tds1'),
        new Connection('relational102', 'concat101', 'tds2'),
        new Connection('concat101', 'filter101', 'tds'),
      ],
      'filter101',
    );

  const infer = (query: Query): ReturnType<typeof buildSchemasAndValidity> =>
    buildSchemasAndValidity(query, createNodeRegistry().queryRules);

  test("Gives the first input's columns, nullable where either input is, to the next node", () => {
    const query = concatenated();
    const { schemas, validity } = infer(query);
    expect(validity.get('concat101')).toEqual([]);
    expect(validity.get('filter101')).toEqual([]);
    const expected = [
      'ID Varchar(5)',
      'COMPANY_NAME Varchar(40)?',
      'CITY Varchar(15)?',
      'COUNTRY Varchar(15)?',
    ];
    expect(describeColumns(schemas.get('concat101')?.columns ?? [])).toEqual(
      expected,
    );
    expect(describeColumns(schemas.get('filter101')?.columns ?? [])).toEqual(
      expected,
    );
    expect(query.validate(validity)).toBe(true);
  });

  test('Needs both inputs', () => {
    const query = concatenated().remove('relational102');
    const { schemas, validity } = infer(query);
    expect(validity.get('concat101')).toEqual([ERR_INCOMPLETE]);
    expect(validity.get('filter101')).toEqual([ERR_SCHEMAS]);
    expect(schemas.get('concat101')).toBeUndefined();
    expect(query.validate(validity)).toBe(false);
  });

  test('Shows its messages on itself, and makes the next node wait for a schema', () => {
    const query = concatenated(
      suppliers([
        columnOf('ID', VARCHAR_5),
        columnOf('COMPANY_NAME', VARCHAR_40),
        columnOf('CITY', VARCHAR_15),
        columnOf('REGION', VARCHAR_15),
      ]),
    );
    const { schemas, validity } = infer(query);
    expect(validity.get('concat101')).toEqual([
      IDENTICAL,
      'Column 4 is "COUNTRY" in the first input and "REGION" in the second: columns are matched by position.',
    ]);
    expect(validity.get('filter101')).toEqual([ERR_SCHEMAS]);
    expect(schemas.get('concat101')).toBeUndefined();
    expect(query.validate(validity)).toBe(false);
  });

  test('Takes its names from the new first input when its inputs swap', () => {
    const query = concatenated(
      suppliers([
        columnOf('ID', VARCHAR_5),
        columnOf('COMPANY_NAME', VARCHAR_40),
        columnOf('TOWN', VARCHAR_15),
        columnOf('COUNTRY', VARCHAR_15),
      ]),
    );
    expect(infer(query).validity.get('concat101')).toEqual([
      IDENTICAL,
      'Column 3 is "CITY" in the first input and "TOWN" in the second: columns are matched by position.',
    ]);
    const swapped = query.swapInputs('concat101');
    expect(
      swapped.connections
        .filter((c) => c.target === 'concat101')
        .map((c) => `${c.source}>${c.port}`)
        .sort(),
    ).toEqual(['relational101>tds2', 'relational102>tds1']);
    expect(infer(swapped).validity.get('concat101')).toEqual([
      IDENTICAL,
      'Column 3 is "TOWN" in the first input and "CITY" in the second: columns are matched by position.',
    ]);
  });
});
