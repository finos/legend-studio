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

import { test, expect, describe } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import { guaranteeNonNullable } from '@finos/legend-shared';
import {
  DataSpace,
  DataSpaceDiagram,
  DataSpaceExecutableTemplate,
  DataSpaceExecutionContext,
  DataSpacePackageableElementExecutable,
} from '@finos/legend-extension-dsl-data-space/graph';
import type { DataSpaceDocResponse } from '@finos/legend-application-studio';
import {
  buildDataSpaceAISuggestionRows,
  isDataSpaceAISuggestionRowSelectedByDefault,
  serializeDataSpaceAISuggestionFields,
} from '../stores/DataSpaceAISuggestion.js';

const createDataSpace = (): DataSpace => {
  const dataSpace = new DataSpace('MySpace');
  dataSpace.title = 'Existing Title';

  const prod = new DataSpaceExecutionContext();
  prod.name = 'prod';
  const dev = new DataSpaceExecutionContext();
  dev.name = 'dev';
  dev.description = 'Development data';
  dataSpace.executionContexts = [prod, dev];

  const diagram = new DataSpaceDiagram();
  diagram.title = '';
  diagram.diagram = {
    value: { path: 'model::MyDiagram' },
  } as DataSpaceDiagram['diagram'];
  dataSpace.diagrams = [diagram];

  const template = new DataSpaceExecutableTemplate();
  template.id = 'q1';
  template.title = 'q1';
  const withoutId = new DataSpacePackageableElementExecutable();
  withoutId.title = 'my service';
  dataSpace.executables = [template, withoutId];
  return dataSpace;
};

const SUGGESTION: DataSpaceDocResponse = {
  title: 'Trade Analytics',
  description: 'Trades booked across desks.',
  executionContexts: [
    { name: 'prod', description: 'Production trades.' },
    { name: 'dev', description: 'Development data' },
    { name: 'unknown', description: 'Ignored.' },
  ],
  diagrams: [
    {
      diagram: 'model::MyDiagram',
      title: 'Trade Model',
      description: 'Trades and their parties.',
    },
  ],
  executables: [
    { id: null, title: 'Desk Service', description: 'Trades by desk.' },
    { id: 'q1', title: 'Daily Trades', description: '' },
  ],
};

describe(unitTest('DataSpace AI suggestion rows'), () => {
  test('lists only fields whose suggestion differs from the current value', () => {
    const rows = buildDataSpaceAISuggestionRows(createDataSpace(), SUGGESTION);
    expect(rows.map((row) => row.key)).toEqual([
      'dataSpace.title',
      'dataSpace.description',
      'executionContext:prod.description',
      'diagram:model::MyDiagram.title',
      'diagram:model::MyDiagram.description',
      'executable:0.title',
      'executable:1.title',
      'executable:1.description',
    ]);
  });

  test('matches executables by id, falling back to position when they have none', () => {
    const rows = buildDataSpaceAISuggestionRows(createDataSpace(), SUGGESTION);
    const valueOf = (key: string): string | undefined =>
      rows.find((row) => row.key === key)?.suggestedValue;
    expect(valueOf('executable:0.title')).toBe('Daily Trades');
    expect(valueOf('executable:1.title')).toBe('Desk Service');
  });

  test('pre-selects empty fields only, unless regenerating everything', () => {
    const rows = buildDataSpaceAISuggestionRows(createDataSpace(), SUGGESTION);
    const titleRow = guaranteeNonNullable(
      rows.find((row) => row.key === 'dataSpace.title'),
    );
    const descriptionRow = guaranteeNonNullable(
      rows.find((row) => row.key === 'dataSpace.description'),
    );
    expect(isDataSpaceAISuggestionRowSelectedByDefault(titleRow, false)).toBe(
      false,
    );
    expect(
      isDataSpaceAISuggestionRowSelectedByDefault(descriptionRow, false),
    ).toBe(true);
    expect(isDataSpaceAISuggestionRowSelectedByDefault(titleRow, true)).toBe(
      true,
    );
  });

  test('writes accepted values into the data space', () => {
    const dataSpace = createDataSpace();
    const rows = buildDataSpaceAISuggestionRows(dataSpace, SUGGESTION);
    rows.forEach((row) => row.write(dataSpace, row.suggestedValue));
    expect(dataSpace.title).toBe('Trade Analytics');
    expect(dataSpace.description).toBe('Trades booked across desks.');
    expect(dataSpace.executionContexts?.[0]?.description).toBe(
      'Production trades.',
    );
    expect(dataSpace.executionContexts?.[1]?.description).toBe(
      'Development data',
    );
    expect(dataSpace.diagrams?.[0]?.title).toBe('Trade Model');
    expect(dataSpace.executables?.[0]?.title).toBe('Daily Trades');
    expect(dataSpace.executables?.[1]?.description).toBe('Trades by desk.');
  });

  test('reads applied fields back from another data space instance', () => {
    const rows = buildDataSpaceAISuggestionRows(createDataSpace(), SUGGESTION);
    const rebuilt = createDataSpace();
    rows.forEach((row) => row.write(rebuilt, `${row.fieldLabel}!`));
    expect(serializeDataSpaceAISuggestionFields(rebuilt, rows)).toBe(
      rows.map((row) => `${row.fieldLabel}!`).join('\n'),
    );
  });

  test('tolerates a response without nested sections', () => {
    const rows = buildDataSpaceAISuggestionRows(createDataSpace(), {
      title: 'Existing Title',
      description: 'New description',
    });
    expect(rows.map((row) => row.key)).toEqual(['dataSpace.description']);
  });
});
