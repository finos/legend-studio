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
  getConcatConvertedType,
  validateConcatSchemas,
} from '../Concat.js';

const PRECISE = 'meta::pure::precisePrimitives::';
const type = (path: string, params: number[] = []): CubeType =>
  PrimitiveType.get(path, params);
const VARCHAR_5 = type(`${PRECISE}Varchar`, [5]);
const VARCHAR_15 = type(`${PRECISE}Varchar`, [15]);
const VARCHAR_40 = type(`${PRECISE}Varchar`, [40]);
const TINY_INT = type(`${PRECISE}TinyInt`);
const SMALL_INT = type(`${PRECISE}SmallInt`);
const INT = type(`${PRECISE}Int`);
const BIG_INT = type(`${PRECISE}BigInt`);
const U_BIG_INT = type(`${PRECISE}UBigInt`);
const INTEGER = type('Integer');
const FLOAT_4 = type(`${PRECISE}Float4`);
const DOUBLE = type(`${PRECISE}Double`);
const FLOAT = type('Float');
const NUMERIC_10_2 = type(`${PRECISE}Numeric`, [10, 2]);
const NUMERIC_12_4 = type(`${PRECISE}Numeric`, [12, 4]);
const DECIMAL = type('Decimal');
const NUMBER = type('Number');
const STRING = type('String');
const TIMESTAMP = type(`${PRECISE}Timestamp`);
const DATE_TIME = type('DateTime');
const STRICT_DATE = type('StrictDate');
const DATE = type('Date');
const STRICT_TIME = type('StrictTime');
const BOOLEAN = type('Boolean');
const VARIANT = type('meta::pure::metamodel::variant::Variant');
const REGION = new EnumType('test::Region', ['EMEA', 'APAC']);
const COUNTRY = new EnumType('test::Country', ['UK', 'FR']);
const BLOB = OpaqueType.get('my::model::Blob');

/** The spec's message (§7.10), which comes before Cube's */
const IDENTICAL = 'Both input schemas must be identical.';
const ORDER =
  'The inputs have the same columns in a different order: columns are matched by position.';

/** A Concat that converts types (Convert types, PLAN §11.5, Q5) */
const converting = (): Concat => new Concat('concat101', true);

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
 * collecting errors, and the exported check with the node's setting, give the
 * same verdict; and, for a node that converts no types, the exported check
 * with its default setting
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
  expect(validateConcatSchemas(first, second, direct, node.widenTypes)).toBe(
    errors.length === 0,
  );
  expect(validateConcatSchemas(first, second, undefined, node.widenTypes)).toBe(
    errors.length === 0,
  );
  expect(direct).toEqual(errors);
  expect(
    node.widenTypes || validateConcatSchemas(first, second) === !errors.length,
  ).toBe(true);
  return errors;
};

/** The errors of a Concat that converts types, for these inputs */
const convertingErrors = (first: Schema, second: Schema): string[] =>
  validationErrors(first, second, converting());

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

  test('Requires equal types with widenTypes off, though the types convert', () => {
    // the default: Convert types is a setting the user turns on (Q5)
    expect(
      validationErrors(
        schema(columnOf('C', INT)),
        schema(columnOf('C', FLOAT_4)),
      ),
    ).toEqual([
      IDENTICAL,
      'Column "C" is Int in the first input and Float4 in the second.',
    ]);
    expect(
      validationErrors(
        schema(columnOf('C', VARCHAR_15)),
        schema(columnOf('C', VARCHAR_40)),
        new Concat('concat101', false),
      ),
    ).toEqual([
      IDENTICAL,
      'Column "C" is Varchar(15) in the first input and Varchar(40) in the second.',
    ]);
  });
});

// PLAN §11.5, Q5: differing types within numbers, strings or dates convert
// to their least common ancestor; nothing converts across them
const CONVERTED: [string, CubeType, CubeType, CubeType][] = [
  ['two Varchar lengths', VARCHAR_15, VARCHAR_40, STRING],
  ['a Varchar and String, its parent', VARCHAR_40, STRING, STRING],
  ['SmallInt and Int', SMALL_INT, INT, INTEGER],
  ['Int and BigInt', INT, BIG_INT, INTEGER],
  ['TinyInt and UBigInt', TINY_INT, U_BIG_INT, INTEGER],
  ['SmallInt and Integer, its parent', SMALL_INT, INTEGER, INTEGER],
  ['Int and Float4', INT, FLOAT_4, NUMBER],
  ['Integer and Float', INTEGER, FLOAT, NUMBER],
  ['Float4 and Double', FLOAT_4, DOUBLE, FLOAT],
  ['Int and Number, an ancestor', INT, NUMBER, NUMBER],
  ['two Numeric precisions and scales', NUMERIC_10_2, NUMERIC_12_4, DECIMAL],
  ['a Numeric and Decimal, its parent', NUMERIC_10_2, DECIMAL, DECIMAL],
  ['a Numeric and Double', NUMERIC_10_2, DOUBLE, NUMBER],
  ['StrictDate and Timestamp', STRICT_DATE, TIMESTAMP, DATE],
  ['Timestamp and DateTime, its parent', TIMESTAMP, DATE_TIME, DATE_TIME],
  ['StrictDate and DateTime', STRICT_DATE, DATE_TIME, DATE],
  ['StrictDate and Date, its ancestor', STRICT_DATE, DATE, DATE],
];

const NOT_CONVERTED: [string, CubeType, CubeType][] = [
  ['a number and a string (Int and Varchar)', INT, VARCHAR_15],
  ['a number and a date (Integer and StrictDate)', INTEGER, STRICT_DATE],
  ['a string and a date (String and Date)', STRING, DATE],
  ['Number and String, two roots', NUMBER, STRING],
  ['two enumerations', REGION, COUNTRY],
  ['an enumeration and a string', REGION, VARCHAR_15],
  [
    'two enumerations with the same short name',
    new EnumType('a::Region', ['EMEA']),
    new EnumType('b::Region', ['EMEA']),
  ],
  [
    'an enumeration and an opaque type of the same path',
    new EnumType('a::Region', ['EMEA']),
    OpaqueType.get('a::Region'),
  ],
  ['two opaque types', BLOB, OpaqueType.get('my::model::Clob')],
  ['an opaque type and a string', BLOB, STRING],
  [
    'one opaque type with other parameters',
    OpaqueType.get('my::model::Blob', [1]),
    OpaqueType.get('my::model::Blob', [2]),
  ],
  ['Boolean and a string', BOOLEAN, VARCHAR_15],
  ['Boolean and a number', BOOLEAN, INTEGER],
  ['StrictTime and StrictDate', STRICT_TIME, STRICT_DATE],
  ['StrictTime and Timestamp', STRICT_TIME, TIMESTAMP],
  ['Variant and a string', VARIANT, STRING],
  ['Variant and Boolean', VARIANT, BOOLEAN],
];

describe(unitTest('Concat converted types'), () => {
  test.each(CONVERTED)(
    'Converts %s to the type they share, in either order',
    (_, first, second, converted) => {
      expect(getConcatConvertedType(first, second)).toBe(converted);
      expect(getConcatConvertedType(second, first)).toBe(converted);
    },
  );

  test.each(NOT_CONVERTED)(
    'Converts %s to no type, in either order',
    (_, first, second) => {
      expect(getConcatConvertedType(first, second)).toBeUndefined();
      expect(getConcatConvertedType(second, first)).toBeUndefined();
    },
  );

  test.each<[string, CubeType]>([
    ['Varchar(15)', VARCHAR_15],
    ['Int', INT],
    ['Numeric(10,2)', NUMERIC_10_2],
    ['Timestamp', TIMESTAMP],
    ['String', STRING],
    ['Boolean, which has no parent', BOOLEAN],
    ['StrictTime, which has no parent', STRICT_TIME],
    ['Variant, which has no parent', VARIANT],
    ['an enumeration', REGION],
    ['an opaque type', BLOB],
  ])('Gives %s for itself, as it is', (_, itself) => {
    expect(getConcatConvertedType(itself, itself)).toBe(itself);
  });

  test('Gives the first type for one enumeration, whatever values each knows, or one opaque type', () => {
    const fewer = new EnumType('test::Region', ['EMEA']);
    expect(getConcatConvertedType(REGION, fewer)).toBe(REGION);
    expect(getConcatConvertedType(fewer, REGION)).toBe(fewer);
    // opaque types are interned, but equal by path and parameters anyway
    expect(
      getConcatConvertedType(BLOB, OpaqueType.get('my::model::Blob')),
    ).toBe(BLOB);
  });
});

describe(unitTest('Concat validation, converting types'), () => {
  test.each(CONVERTED)(
    'Accepts %s, which types must match to do without it',
    (_, first, second) => {
      const firstSchema = schema(columnOf('ID'), columnOf('C', first));
      const secondSchema = schema(columnOf('ID'), columnOf('C', second));
      expect(convertingErrors(firstSchema, secondSchema)).toEqual([]);
      expect(convertingErrors(secondSchema, firstSchema)).toEqual([]);
      expect(validationErrors(firstSchema, secondSchema)).toEqual([
        IDENTICAL,
        `Column "C" is ${first.displayName} in the first input and ${second.displayName} in the second.`,
      ]);
    },
  );

  test.each<[string, CubeType, CubeType, string]>([
    [
      'a number and a string',
      INT,
      VARCHAR_15,
      `Column "C" is Int in the first input and Varchar(15) in the second, which can't be converted to one type.`,
    ],
    [
      'a string and a number',
      VARCHAR_15,
      INT,
      `Column "C" is Varchar(15) in the first input and Int in the second, which can't be converted to one type.`,
    ],
    [
      'a number and a date',
      INTEGER,
      STRICT_DATE,
      `Column "C" is Integer in the first input and StrictDate in the second, which can't be converted to one type.`,
    ],
    [
      'a string and a date',
      STRING,
      TIMESTAMP,
      `Column "C" is String in the first input and Timestamp in the second, which can't be converted to one type.`,
    ],
    [
      'two enumerations',
      REGION,
      COUNTRY,
      `Column "C" is Region in the first input and Country in the second, which can't be converted to one type.`,
    ],
    [
      'an enumeration and a string',
      REGION,
      VARCHAR_15,
      `Column "C" is Region in the first input and Varchar(15) in the second, which can't be converted to one type.`,
    ],
    [
      'two opaque types',
      BLOB,
      OpaqueType.get('my::model::Clob'),
      `Column "C" is Blob in the first input and Clob in the second, which can't be converted to one type.`,
    ],
    [
      'Boolean and a string',
      BOOLEAN,
      VARCHAR_15,
      `Column "C" is Boolean in the first input and Varchar(15) in the second, which can't be converted to one type.`,
    ],
    [
      'StrictTime and StrictDate',
      STRICT_TIME,
      STRICT_DATE,
      `Column "C" is StrictTime in the first input and StrictDate in the second, which can't be converted to one type.`,
    ],
    [
      'Variant and a string',
      VARIANT,
      STRING,
      `Column "C" is Variant in the first input and String in the second, which can't be converted to one type.`,
    ],
  ])(
    "Reports %s, which can't be converted, after the spec's message",
    (_, first, second, message) => {
      expect(
        convertingErrors(
          schema(columnOf('ID'), columnOf('C', first)),
          schema(columnOf('ID'), columnOf('C', second)),
        ),
      ).toEqual([IDENTICAL, message]);
    },
  );

  test.each<[string, CubeType, CubeType, string]>([
    [
      'two enumerations',
      new EnumType('a::Region', ['EMEA']),
      new EnumType('b::Region', ['EMEA']),
      `Column "C" is a::Region in the first input and b::Region in the second, which can't be converted to one type.`,
    ],
    [
      'two opaque types',
      OpaqueType.get('a::Blob'),
      OpaqueType.get('b::Blob'),
      `Column "C" is a::Blob in the first input and b::Blob in the second, which can't be converted to one type.`,
    ],
    [
      'an enumeration and an opaque type',
      new EnumType('a::Region', ['EMEA']),
      OpaqueType.get('a::Region'),
      `Column "C" is a::Region in the first input and a::Region in the second, which can't be converted to one type.`,
    ],
  ])(
    'Names %s with the same short name by their paths',
    (_, first, second, message) => {
      expect(
        convertingErrors(
          schema(columnOf('C', first)),
          schema(columnOf('C', second)),
        ),
      ).toEqual([IDENTICAL, message]);
    },
  );

  test("Reports every position whose types can't be converted, in order, and none whose can", () => {
    expect(
      convertingErrors(
        schema(
          columnOf('ID', INT),
          columnOf('NAME', VARCHAR_15),
          columnOf('DAY', STRICT_DATE),
          columnOf('FLAG', BOOLEAN),
          columnOf('AMOUNT', NUMERIC_10_2),
        ),
        schema(
          columnOf('ID', VARCHAR_15),
          columnOf('NAME', VARCHAR_40),
          columnOf('DAY', TIMESTAMP),
          columnOf('FLAG', INTEGER),
          columnOf('AMOUNT', NUMERIC_10_2),
        ),
      ),
    ).toEqual([
      IDENTICAL,
      `Column "ID" is Int in the first input and Varchar(15) in the second, which can't be converted to one type.`,
      `Column "FLAG" is Boolean in the first input and Integer in the second, which can't be converted to one type.`,
    ]);
  });

  test('Checks the column count before the types', () => {
    expect(
      convertingErrors(
        named('A', 'B'),
        schema(
          columnOf('A', STRING),
          columnOf('B', STRING),
          columnOf('C', STRING),
        ),
      ),
    ).toEqual([IDENTICAL, 'The first input has 2 columns and the second 3.']);
    // and with types that would convert
    expect(
      convertingErrors(
        named('A', 'B', 'C'),
        schema(columnOf('A', BIG_INT), columnOf('B', BIG_INT)),
      ),
    ).toEqual([IDENTICAL, 'The first input has 3 columns and the second 2.']);
  });

  test('Checks the names before the types, as it does without converting', () => {
    // A's types can't be converted, and B is named X in the second input
    expect(
      convertingErrors(
        schema(columnOf('A', INT), columnOf('B', VARCHAR_15)),
        schema(columnOf('A', STRING), columnOf('X', VARCHAR_15)),
      ),
    ).toEqual([
      IDENTICAL,
      'Column 2 is "B" in the first input and "X" in the second: columns are matched by position.',
    ]);
    // a name in another case, with types that would convert
    expect(
      convertingErrors(
        schema(columnOf('A', INT), columnOf('B', VARCHAR_15)),
        schema(columnOf('a', BIG_INT), columnOf('B', VARCHAR_40)),
      ),
    ).toEqual([
      IDENTICAL,
      'Column 1 is "A" in the first input and "a" in the second: columns are matched by position.',
    ]);
    // reordered, each column with a type it can't be converted from in its new place
    expect(
      convertingErrors(
        schema(columnOf('A', INT), columnOf('B', VARCHAR_15)),
        schema(columnOf('B', INT), columnOf('A', VARCHAR_15)),
      ),
    ).toEqual([IDENTICAL, ORDER]);
  });

  test('Never compares nullability, either way, with converted types too', () => {
    expect(
      convertingErrors(
        schema(
          columnOf('A', INT, true),
          columnOf('B', VARCHAR_15, false),
          columnOf('C', SMALL_INT, true),
        ),
        schema(
          columnOf('A', INT, false),
          columnOf('B', VARCHAR_40, true),
          columnOf('C', BIG_INT, false),
        ),
      ),
    ).toEqual([]);
  });

  test('Accepts inputs whose types are equal, as it does without converting', () => {
    expect(convertingErrors(CUSTOMERS, CUSTOMERS)).toEqual([]);
    expect(
      convertingErrors(
        schema(columnOf('C', REGION)),
        schema(columnOf('C', new EnumType('test::Region', ['EMEA']))),
      ),
    ).toEqual([]);
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

  test.each<[string, Schema, Schema]>([
    ['a different count', named('A', 'B'), named('A')],
    ['a different name', named('A', 'B'), named('A', 'X')],
    ['the same names in another order', named('A', 'B'), named('B', 'A')],
    [
      "types that can't be converted",
      schema(columnOf('A', INT)),
      schema(columnOf('A', VARCHAR_15)),
    ],
  ])('Has none for inputs with %s, converting types', (_, first, second) => {
    expect(converting().schematize([first, second])).toBeUndefined();
  });

  test('Has the type both inputs share where their types differ, converting types, in either input order', () => {
    const first = schema(
      columnOf('ID', INT),
      columnOf('CITY', VARCHAR_15),
      columnOf('DAY', STRICT_DATE),
      columnOf('AMOUNT', NUMERIC_10_2),
      columnOf('RATE', FLOAT_4),
    );
    const second = schema(
      columnOf('ID', BIG_INT),
      columnOf('CITY', VARCHAR_40),
      columnOf('DAY', TIMESTAMP),
      columnOf('AMOUNT', NUMERIC_12_4),
      columnOf('RATE', INT),
    );
    const expected = [
      'ID Integer',
      'CITY String',
      'DAY Date',
      'AMOUNT Decimal',
      'RATE Number',
    ];
    const output = outputOf(first, second, converting());
    expect(describeColumns(output.columns)).toEqual(expected);
    expect(output.columns.map((c) => c.type.fullName)).toEqual([
      'Integer',
      'String',
      'Date',
      'Decimal',
      'Number',
    ]);
    expect(
      describeColumns(outputOf(second, first, converting()).columns),
    ).toEqual(expected);
    // which no Concat that converts no types has
    expect(new Concat('concat101').schematize([first, second])).toBeUndefined();
  });

  test('Keeps the precise type where both inputs have it, converting the others', () => {
    const output = outputOf(
      schema(columnOf('ID', VARCHAR_5), columnOf('CITY', VARCHAR_15)),
      schema(columnOf('ID', VARCHAR_5), columnOf('CITY', VARCHAR_40)),
      converting(),
    );
    expect(describeColumns(output.columns)).toEqual([
      'ID Varchar(5)',
      'CITY String',
    ]);
    const [id, city] = output.columns;
    expect(id?.type).toBe(VARCHAR_5);
    expect(city?.type).toBe(STRING);
  });

  test("Has the first input's names, converting types", () => {
    expect(
      describeColumns(
        outputOf(
          schema(columnOf('Id', SMALL_INT), columnOf('Name', VARCHAR_15)),
          schema(columnOf('Id', INT), columnOf('Name', VARCHAR_15)),
          converting(),
        ).columns,
      ),
    ).toEqual(['Id Integer', 'Name Varchar(15)']);
  });

  test('Makes a converted column nullable when either input has it nullable', () => {
    const first = schema(
      columnOf('NEITHER', VARCHAR_15, false),
      columnOf('FIRST', VARCHAR_15, true),
      columnOf('SECOND', VARCHAR_15, false),
      columnOf('BOTH', VARCHAR_15, true),
    );
    const second = schema(
      columnOf('NEITHER', VARCHAR_40, false),
      columnOf('FIRST', VARCHAR_40, false),
      columnOf('SECOND', VARCHAR_40, true),
      columnOf('BOTH', VARCHAR_40, true),
    );
    const expected = [
      'NEITHER String',
      'FIRST String?',
      'SECOND String?',
      'BOTH String?',
    ];
    expect(
      describeColumns(outputOf(first, second, converting()).columns),
    ).toEqual(expected);
    // and the same with the inputs the other way round
    expect(
      describeColumns(outputOf(second, first, converting()).columns),
    ).toEqual(expected);
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
    // an enumeration the second input knows other values of, from the first
    const fewer = new EnumType('test::Region', ['EMEA']);
    const [region] = outputOf(
      schema(columnOf('R', REGION)),
      schema(columnOf('R', fewer)),
      converting(),
    ).columns;
    expect(region?.type).toBe(REGION);
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

  test('Gives the types both inputs share to the next node when it converts types', () => {
    const towns = suppliers([
      columnOf('ID', VARCHAR_5),
      columnOf('COMPANY_NAME', VARCHAR_40),
      columnOf('CITY', VARCHAR_40, false),
      columnOf('COUNTRY', VARCHAR_15),
    ]);
    const strict = concatenated(towns);
    expect(infer(strict).validity.get('concat101')).toEqual([
      IDENTICAL,
      'Column "CITY" is Varchar(15) in the first input and Varchar(40) in the second.',
    ]);
    const query = concatenated(towns, converting());
    const { schemas, validity } = infer(query);
    expect(validity.get('concat101')).toEqual([]);
    expect(validity.get('filter101')).toEqual([]);
    const expected = [
      'ID Varchar(5)',
      'COMPANY_NAME Varchar(40)',
      'CITY String?',
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

  test("Shows the message of types it can't convert on itself", () => {
    const query = concatenated(
      suppliers([
        columnOf('ID', INT),
        columnOf('COMPANY_NAME', VARCHAR_40),
        columnOf('CITY', VARCHAR_15),
        columnOf('COUNTRY', VARCHAR_15),
      ]),
      converting(),
    );
    const { schemas, validity } = infer(query);
    expect(validity.get('concat101')).toEqual([
      IDENTICAL,
      `Column "ID" is Varchar(5) in the first input and Int in the second, which can't be converted to one type.`,
    ]);
    expect(validity.get('filter101')).toEqual([ERR_SCHEMAS]);
    expect(schemas.get('concat101')).toBeUndefined();
    expect(query.validate(validity)).toBe(false);
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
