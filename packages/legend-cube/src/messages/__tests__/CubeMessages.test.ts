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

import { expect, test } from '@jest/globals';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { unitTest } from '../../__test-utils__/CubeTestUtils.js';
import * as MESSAGES from '../CubeMessages.js';

const SPEC = readFileSync(
  resolve(__dirname, '../../../../../docs/design/WIP-CUBE-SPEC.md'),
  'utf-8',
);

/** The part of the spec from one heading to the next one given */
const specSection = (from: string, to: string): string => {
  const start = SPEC.indexOf(from);
  const end = SPEC.indexOf(to, start);
  if (start < 0 || end < 0) {
    throw new Error(`The spec has no section from "${from}" to "${to}"`);
  }
  return SPEC.slice(start, end);
};

// the spec's message catalogue (§16), with its placeholders, e.g. `<Label>`
const SPEC_CATALOGUE = specSection(
  '## 16. Validation message catalogue',
  '## 17. User interface',
);

// the lines of the code blocks in the catalogue: one message per line
const CATALOGUE_LINES = new Set(
  Array.from(
    SPEC_CATALOGUE.matchAll(/```\n(?<codeBlock>[\s\S]*?)```/gu),
  ).flatMap((match) =>
    (match.groups?.codeBlock ?? '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean),
  ),
);

// the spec lists the three whole-number messages on one line
const COMBINED_WHOLE_NUMBER_LINE =
  'Row index / Start row index / Stop row index must be a whole number.';

test(
  unitTest('Messages match the spec catalogue verbatim, line for line'),
  () => {
    expect(CATALOGUE_LINES.size).toBeGreaterThan(40);
    const rendered = [
      MESSAGES.MESSAGE_CANNOT_BE_EMPTY('<Label>'),
      MESSAGES.MESSAGE_CANNOT_HAVE_DUPLICATES('<Label>'),
      MESSAGES.MESSAGE_MUST_BE_A_COLLECTION('<Label>'),
      MESSAGES.MESSAGE_DOES_NOT_HAVE_A_NAME('<Label>'),
      MESSAGES.MESSAGE_NOT_IN_INPUT_SCHEMA('<Label>', '<n>'),
      MESSAGES.MESSAGE_ALREADY_IN_INPUT_SCHEMA('<Label>', '<n>'),
      MESSAGES.MESSAGE_ALREADY_IN_OUTPUT_SCHEMA('<Label>', '<n>'),
      MESSAGES.MESSAGE_SIZE_MUST_BE_POSITIVE_WHOLE_NUMBER,
      MESSAGES.MESSAGE_START_ROW_INDEX_MUST_BE_LESS_THAN_STOP,
      MESSAGES.ERR_INCOMPLETE,
      MESSAGES.ERR_SCHEMAS,
      MESSAGES.ERR_OTHER,
      MESSAGES.MESSAGE_SOURCE_INFO_UNRESOLVED,
      MESSAGES.MESSAGE_SOURCE_SCHEMA_UNRESOLVED,
      MESSAGES.MESSAGE_PARAMETER_WITHOUT_VALUE('<name>'),
      MESSAGES.MESSAGE_LEFT_JOIN_COLUMNS_EMPTY,
      MESSAGES.MESSAGE_RIGHT_JOIN_COLUMNS_EMPTY,
      MESSAGES.MESSAGE_JOIN_COLUMN_COUNTS_DIFFER,
      MESSAGES.MESSAGE_JOIN_COLUMNS_INCOMPATIBLE('<l>', '<r>'),
      MESSAGES.MESSAGE_DUPLICATE_COLUMNS_BETWEEN_INPUTS(['a', 'b']),
      MESSAGES.MESSAGE_DIFFERENCE_COLUMN_TYPE_DIFFERS('<n>'),
      MESSAGES.MESSAGE_DIFFERENCE_COLUMN_NOT_NUMERIC('<n>'),
      MESSAGES.MESSAGE_INPUT_SCHEMAS_DIFFER,
      MESSAGES.MESSAGE_AGGREGATION_FUNCTION_EMPTY,
      MESSAGES.MESSAGE_AGGREGATION_FUNCTION_UNKNOWN('<a>'),
      MESSAGES.MESSAGE_AGGREGATION_FUNCTION_DISALLOWS_COLUMN('<a>'),
      MESSAGES.MESSAGE_AGGREGATION_FUNCTION_INCOMPATIBLE('<a>', '<c>'),
      MESSAGES.MESSAGE_AGGREGATION_OUTPUT_NAME_EMPTY,
      MESSAGES.MESSAGE_AGGREGATION_OUTPUT_NAME_IS_INPUT_COLUMN('<n>'),
      MESSAGES.MESSAGE_SORT_DIRECTION_EMPTY,
      MESSAGES.MESSAGE_SORT_DIRECTION_UNKNOWN('<d>'),
      MESSAGES.MESSAGE_NEW_COLUMN_NAME_EMPTY,
      MESSAGES.MESSAGE_NEW_COLUMN_NAME_INVALID,
      MESSAGES.MESSAGE_NEW_COLUMN_NAME_SAME_AS_OLD('<n>'),
      MESSAGES.MESSAGE_NEW_COLUMN_NAME_SAME_AS_OTHER('<n>'),
      MESSAGES.MESSAGE_NO_EXPRESSION('<name>'),
      MESSAGES.MESSAGE_NO_VALID_TYPE('<name>'),
      MESSAGES.MESSAGE_FILTER_EMPTY,
      MESSAGES.MESSAGE_FILTER_VALUE_REQUIRED,
      MESSAGES.MESSAGE_COMPOSITE_FILTER_EMPTY,
    ];
    // every message is a whole line of the catalogue...
    expect(rendered.filter((message) => !CATALOGUE_LINES.has(message))).toEqual(
      [],
    );
    // ...and every line of the catalogue has a message
    expect(
      Array.from(CATALOGUE_LINES).filter(
        (line) =>
          line !== COMBINED_WHOLE_NUMBER_LINE && !rendered.includes(line),
      ),
    ).toEqual([]);
    expect(CATALOGUE_LINES.has(COMBINED_WHOLE_NUMBER_LINE)).toBe(true);
    expect(MESSAGES.MESSAGE_MUST_BE_WHOLE_NUMBER('Row index')).toBe(
      'Row index must be a whole number.',
    );
    expect(MESSAGES.MESSAGE_MUST_BE_WHOLE_NUMBER('Start row index')).toBe(
      'Start row index must be a whole number.',
    );
    expect(MESSAGES.MESSAGE_MUST_BE_WHOLE_NUMBER('Stop row index')).toBe(
      'Stop row index must be a whole number.',
    );
    // the placeholder for a missing value is given in the text, not in a code block
    expect(SPEC_CATALOGUE).toContain('**`(blank)`**');
    expect(MESSAGES.BLANK_PLACEHOLDER).toBe('(blank)');
    // straight quotes only
    expect(rendered.filter((message) => /[^\x20-\x7E]/u.test(message))).toEqual(
      [],
    );
  },
);

test(unitTest('Messages added by Cube'), () => {
  expect(
    MESSAGES.MESSAGE_DIFFERENT_DATABASES('other::Db', 'test::Northwind'),
  ).toBe(
    'Sources from different databases are not supported yet; "other::Db" differs from "test::Northwind".',
  );
  expect(MESSAGES.MESSAGE_TABLE_AFTER_DATA_PRODUCT).toBe(
    'Database tables and data products cannot be mixed in one query; this query reads from data products.',
  );
  expect(MESSAGES.MESSAGE_DATA_PRODUCT_AFTER_TABLE).toBe(
    'Database tables and data products cannot be mixed in one query; this query reads from database tables.',
  );
  expect(
    MESSAGES.MESSAGE_FILTER_OPERATOR_UNSUPPORTED(
      'contains',
      'FREIGHT',
      'Double',
    ),
  ).toBe(
    'Filter operator "contains" is not supported for column "FREIGHT" of type Double.',
  );
  expect(MESSAGES.MESSAGE_FILTER_VALUE_INVALID('abc', 'SmallInt')).toBe(
    'Filter value "abc" is not a valid SmallInt.',
  );
  expect(MESSAGES.MESSAGE_FILTER_VALUE_OUT_OF_RANGE('40000', 'SmallInt')).toBe(
    'Filter value "40000" is out of range for SmallInt.',
  );
  expect(MESSAGES.MESSAGE_FILTER_VALUE_BACKSLASH('starts with')).toBe(
    'Filter values for "starts with" cannot contain a backslash (\\) yet.',
  );
  expect(MESSAGES.MESSAGE_AGGREGATION_OUTPUT_NAME_INVALID).toBe(
    'Aggregation output name is not valid column name.',
  );
  expect(
    MESSAGES.MESSAGE_GROUP_COLUMN_NOT_GROUPABLE('PAYLOAD', 'Variant'),
  ).toBe('Group column "PAYLOAD" of type Variant cannot be grouped.');
  expect(MESSAGES.MESSAGE_SORT_COLUMN_NOT_SORTABLE('PAYLOAD', 'Variant')).toBe(
    'Sort column "PAYLOAD" of type Variant cannot be sorted.',
  );
  expect(MESSAGES.MESSAGE_SORT_ORDER_LOST('join101')).toBe(
    "This sort has no effect: join101 does not keep the row order. A sort only orders the query's output, or the rows a later Drop, Limit or Slice takes.",
  );
  expect(MESSAGES.MESSAGE_SORT_COLUMNS_DROPPED(['B'], 'restrict101')).toBe(
    'Sorting by "B" has no effect: restrict101 removes that column before the order is used.',
  );
  expect(MESSAGES.MESSAGE_SORT_COLUMNS_DROPPED(['B', 'C'], 'restrict101')).toBe(
    'Sorting by "B", "C" has no effect: restrict101 removes those columns before the order is used.',
  );
  expect(MESSAGES.MESSAGE_SORT_COLUMNS_CUT(['C'])).toBe(
    'Sorting by "C" has no effect either: it comes after a removed column.',
  );
  expect(MESSAGES.MESSAGE_SORT_COLUMNS_CUT(['C', 'D'])).toBe(
    'Sorting by "C", "D" has no effect either: they come after a removed column.',
  );
  // Concat's, each after the spec's MESSAGE_INPUT_SCHEMAS_DIFFER (PLAN §11.5)
  expect(MESSAGES.MESSAGE_CONCAT_COLUMN_COUNT(1, 2)).toBe(
    'The first input has 1 column and the second 2.',
  );
  expect(MESSAGES.MESSAGE_CONCAT_COLUMN_COUNT(2, 1)).toBe(
    'The first input has 2 columns and the second 1.',
  );
  expect(MESSAGES.MESSAGE_CONCAT_COLUMN_COUNT(3, 2)).toBe(
    'The first input has 3 columns and the second 2.',
  );
  expect(MESSAGES.MESSAGE_CONCAT_COLUMN_COUNT(0, 1)).toBe(
    'The first input has 0 columns and the second 1.',
  );
  expect(MESSAGES.MESSAGE_CONCAT_COLUMN_NAME(2, 'CITY', 'TOWN')).toBe(
    'Column 2 is "CITY" in the first input and "TOWN" in the second: columns are matched by position.',
  );
  expect(MESSAGES.MESSAGE_CONCAT_COLUMN_ORDER).toBe(
    'The inputs have the same columns in a different order: columns are matched by position.',
  );
  expect(
    MESSAGES.MESSAGE_CONCAT_COLUMN_TYPE('CITY', 'Varchar(15)', 'Varchar(40)'),
  ).toBe(
    'Column "CITY" is Varchar(15) in the first input and Varchar(40) in the second.',
  );
});

test(
  unitTest('Messages the spec gives outside its catalogue match it verbatim'),
  () => {
    // the filter builder UI (§8.5) quotes it, so it is not in the §16 code blocks
    const filterBuilder = specSection(
      '### 8.5 Filter builder UI',
      '## 9. Expressions',
    );
    expect(MESSAGES.MESSAGE_FILTER_UNSUPPORTED).toBe(
      'This filter is not supported yet.',
    );
    expect(filterBuilder).toContain(`"${MESSAGES.MESSAGE_FILTER_UNSUPPORTED}"`);
    // straight quotes only
    expect(/^[\x20-\x7E]+$/u.test(MESSAGES.MESSAGE_FILTER_UNSUPPORTED)).toBe(
      true,
    );
    // Rename's (§7.5) is built from the generic "<Label> cannot be empty."
    const rename = specSection('### 7.5 Rename', '### 7.6 Distinct');
    expect(MESSAGES.MESSAGE_CANNOT_BE_EMPTY('Column renames')).toBe(
      'Column renames cannot be empty.',
    );
    expect(rename).toContain('"Column renames cannot be empty."');
    // and Sort's (§7.1)
    const sort = specSection('### 7.1 Sort', '### 7.2 Group');
    expect(MESSAGES.MESSAGE_CANNOT_BE_EMPTY('Sorts')).toBe(
      'Sorts cannot be empty.',
    );
    expect(sort).toContain('"Sorts cannot be empty."');
  },
);
