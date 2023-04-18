/**
 * Copyright (c) 2020-present, Goldman Sachs
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
import { guaranteeNonNullable } from '@finos/legend-shared';
import { unitTest } from '@finos/legend-shared/test';
import { TEMPORARY__createRelationalDataFromCSV } from '../TestableUtils.js';

export const SINGLE_CSV =
  'default\nFirmTable\nLegal_name,id\ncf566,1\nf223f,2\n-----\n';
export const MULTI_TABLE_CSV =
  'default\nFirmTable\nLegal_name,id\ncf566,1\nf223f,2\n-----\ndefault\nPersonTable\nfirm_id,firstName,id\n1,53e,1\n-----\n';

test(unitTest('CreateRelationalDataFromCSV for single table'), () => {
  const single = TEMPORARY__createRelationalDataFromCSV(SINGLE_CSV);
  expect(single.tables.length).toBe(1);
  const table = guaranteeNonNullable(single.tables[0]);
  expect(table.table).toBe('FirmTable');
  expect(table.schema).toBe('default');
  expect(table.values).toBe('Legal_name,id\ncf566,1\nf223f,2\n');
});

test(unitTest('CreateRelationalDataFromCSV for multi table'), () => {
  const multi = TEMPORARY__createRelationalDataFromCSV(MULTI_TABLE_CSV);
  expect(multi.tables.length).toBe(2);
  const firmTable = guaranteeNonNullable(
    multi.tables.find((t) => t.table === 'FirmTable'),
  );
  expect(firmTable.table).toBe('FirmTable');
  expect(firmTable.schema).toBe('default');
  expect(firmTable.values).toBe('Legal_name,id\ncf566,1\nf223f,2\n');

  const personTable = guaranteeNonNullable(
    multi.tables.find((t) => t.table === 'PersonTable'),
  );
  expect(personTable.table).toBe('PersonTable');
  expect(personTable.schema).toBe('default');
  expect(personTable.values).toBe('firm_id,firstName,id\n1,53e,1\n');
});
