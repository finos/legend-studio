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

import { unitTest } from '@finos/legend-shared/test';
import { describe, expect, jest, test } from '@jest/globals';
import { guaranteeNonNullable, guaranteeType } from '@finos/legend-shared';
import {
  CORE_PURE_PATH,
  TabularDataSet,
  TDSExecutionResult,
  TDSRow,
  V1_AppliedFunction,
  V1_CInteger,
  type V1_Lambda,
} from '@finos/legend-graph';
import { DataCubeJsonFieldsState } from '../DataCubeJsonFieldsState.js';
import type { DataCubeColumnBaseEditorState } from '../DataCubeColumnEditorState.js';
import { TEST__DataCubeEngine } from '../../../__tests__/DataCubeTestUtils.js';
import type { DataCubeExecutionResult } from '../../../core/DataCubeEngine.js';
import { DataCubeSnapshot } from '../../../core/DataCubeSnapshot.js';
import { INTERNAL__DataCubeSource } from '../../../core/model/DataCubeSource.js';
import { _synthesizeMinimalSourceQuery } from '../../../core/DataCubeQueryBuilderUtils.js';

const DOCUMENTS = [
  '{"customer":{"tier":"gold","contact":{"email":"a@b.c"}},"items":[{"sku":"x","qty":1}],"tags":["a"]}',
  '{"customer":{"tier":"silver"},"items":[],"tags":[]}',
];

class TEST__ValuesDataCubeEngine extends TEST__DataCubeEngine {
  readonly executedQueries: V1_Lambda[] = [];
  values: unknown[];
  error?: Error | undefined;

  constructor(values: unknown[]) {
    super();
    this.values = values;
  }

  override buildExecutionContext() {
    return undefined;
  }

  override async executeQuery(
    query: V1_Lambda,
  ): Promise<DataCubeExecutionResult> {
    this.executedQueries.push(query);
    if (this.error) {
      throw this.error;
    }
    const result = new TDSExecutionResult();
    result.result = new TabularDataSet();
    result.result.columns = ['doc'];
    result.result.rows = this.values.map((value) => {
      const row = new TDSRow();
      row.values = [value as string];
      return row;
    });
    return { result, executedQuery: '', executionTime: 0 };
  }
}

const setUp = (values: unknown[]) => {
  const engine = new TEST__ValuesDataCubeEngine(values);
  const source = new INTERNAL__DataCubeSource();
  source.columns = [{ name: 'doc', type: CORE_PURE_PATH.VARIANT }];
  source.query = _synthesizeMinimalSourceQuery(source.columns);
  const snapshot = DataCubeSnapshot.create({});
  snapshot.data.sourceColumns = source.columns;
  const editor = {
    view: {
      engine,
      source,
      taskService: { newTask: () => ({}), endTask: () => undefined },
      settingService: { getBooleanValue: () => false },
    },
    getLatestSnapshot: () => snapshot,
    applyJsonOffer: jest.fn(async () => undefined),
  };
  const state = new DataCubeJsonFieldsState(
    editor as unknown as DataCubeColumnBaseEditorState,
  );
  state.setColumn({ name: 'doc', type: CORE_PURE_PATH.VARIANT });
  return { engine, editor, state };
};

const limitOf = (query: V1_Lambda | undefined) => {
  const func = guaranteeType(
    guaranteeNonNullable(query).body[0],
    V1_AppliedFunction,
  );
  return func.function === 'limit'
    ? guaranteeType(func.parameters[1], V1_CInteger).value
    : undefined;
};

describe(unitTest(`Variant: reading the fields of a JSON column`), () => {
  test(`reads the first values of the column, shows the first two levels of fields, and selects the first field which can become a column`, async () => {
    const { engine, state } = setUp(DOCUMENTS);
    await state.read(false);
    expect(limitOf(engine.executedQueries[0])).toBe(1001);
    expect(state.status).toEqual({
      text: 'All 2 non-empty values read: every field, type and share covers the whole column.',
      isError: false,
    });
    expect(state.selectedPath).toEqual(['customer']);
    expect(state.isExpanded([])).toBe(true);
    expect(state.isExpanded(['customer'])).toBe(true);
    expect(state.isExpanded(['customer', 'contact'])).toBe(false);
  });

  test(`says when the values read are only a sample, and reads every value on demand, keeping the selected field`, async () => {
    const { engine, state } = setUp(
      Array.from({ length: 1001 }, () => '{"a":1}'),
    );
    await state.read(false);
    expect(state.sample?.rows).toBe(1000);
    expect(state.status?.text).toBe(
      'First 1,000 non-empty values read: types and shares are from the sample.',
    );
    state.select(['a']);
    await state.read(true);
    expect(limitOf(engine.executedQueries[1])).toBeUndefined();
    expect(state.sample?.rows).toBe(1001);
    expect(state.sample?.complete).toBe(true);
    expect(state.selectedPath).toEqual(['a']);
  });

  test(`ignores the values of a read which was stopped, keeping what was read before`, async () => {
    const { engine, state } = setUp(DOCUMENTS);
    await state.read(false);
    engine.values = ['{"other":1}'];
    const reading = state.read(true);
    expect(state.status?.text).toBe('Reading every value of doc...');
    state.stop();
    await reading;
    expect(state.sample?.rows).toBe(2);
    expect(state.status?.text).toBe(
      'Stopped reading every value, showing the sample. All 2 non-empty values read: every field, type and share covers the whole column.',
    );
  });

  test(`says why the values couldn't be read`, async () => {
    const { engine, state } = setUp(['not json', '[1]']);
    await state.read(false);
    expect(state.status?.text).toBe(
      'All 2 non-empty values read: every field, type and share covers the whole column.',
    );
    engine.error = new Error('boom');
    await state.read(false);
    expect(state.status).toEqual({
      text: `Couldn't read doc: boom`,
      isError: true,
    });
  });

  test(`fills in the column with what the picked field can become`, async () => {
    const { editor, state } = setUp(DOCUMENTS);
    await state.read(false);
    const offer = guaranteeNonNullable(
      state.selectedField?.offers.find((candidate) => candidate.key === 'json'),
    );
    await state.pick(offer);
    expect(editor.applyJsonOffer).toHaveBeenCalledWith(offer);
    expect(state.pickedOffer).toBe(offer);
  });
});
