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

import { jest } from '@jest/globals';
import type { DataSpaceQueryCoordinates, JsonObject } from '@finos/legend-cube';
import { action, makeObservable, observable } from 'mobx';
import { createElement } from 'react';
import type {
  CubeDataSpaceDescription,
  CubeDataSpaceEdit,
  CubeDataSpaceEditor,
  CubeDataSpaceEditorSession,
  CubeDataSpaceEditorTarget,
  CubeDataSpaceSummary,
} from '../stores/CubeDataSpaceEditor.js';

// A fake of a host's data space editor (PLAN §11.25), for the Data Space
// tab's and the node editor's tests: two data spaces, and sessions a test
// drives in place of the query builder

export const FAKE_TRADES_DATA_SPACE: CubeDataSpaceSummary = {
  path: 'trading::TradesDataSpace',
  title: 'Trades',
  description: 'Every trade, by desk',
  project: {
    groupId: 'com.example',
    artifactId: 'trading',
    versionId: '2.3.0',
  },
};

export const FAKE_RISK_DATA_SPACE: CubeDataSpaceSummary = {
  path: 'risk::RiskDataSpace',
  project: { groupId: 'com.example', artifactId: 'risk', versionId: '1.0.0' },
};

export const FAKE_TRADES_DESCRIPTION: CubeDataSpaceDescription = {
  path: FAKE_TRADES_DATA_SPACE.path,
  title: 'Trades',
  executionContexts: [
    {
      name: 'production',
      title: 'Production',
      mapping: 'trading::TradeMapping',
      runtime: 'trading::TradeRuntime',
    },
    {
      name: 'uat',
      mapping: 'trading::TradeUatMapping',
      runtime: 'trading::TradeUatRuntime',
    },
  ],
  defaultExecutionContext: 'production',
};

const property = (name: string): JsonObject => ({
  _type: 'property',
  property: name,
  parameters: [{ _type: 'var', name: 'x' }],
});

const columnLambda = (name: string): JsonObject => ({
  _type: 'lambda',
  body: [property(name)],
  parameters: [{ _type: 'var', name: 'x' }],
});

const getAll = (entity: string): JsonObject => ({
  _type: 'func',
  function: 'getAll',
  parameters: [{ _type: 'packageableElementPtr', fullPath: entity }],
});

/**
 * The query builder's query of an entity's columns, as a data space
 * source's coordinates: `<entity>.all()->project(~[<column>: x|$x.<column>, …])`
 */
export const buildFakeDataSpaceQuery = (
  entity: string,
  columns: readonly string[],
  executionContext = 'production',
): DataSpaceQueryCoordinates => ({
  dataSpace: FAKE_TRADES_DATA_SPACE.path,
  executionContext,
  entity,
  query: {
    _type: 'lambda',
    body: [
      {
        _type: 'func',
        function: 'project',
        parameters: [
          getAll(entity),
          {
            _type: 'collection',
            multiplicity: {
              lowerBound: columns.length,
              upperBound: columns.length,
            },
            values: columns.map(columnLambda),
          },
          {
            _type: 'collection',
            multiplicity: {
              lowerBound: columns.length,
              upperBound: columns.length,
            },
            values: columns.map((column) => ({
              _type: 'string',
              value: column,
            })),
          },
        ],
      },
    ],
    parameters: [],
  },
  relation: {
    _type: 'lambda',
    body: [
      {
        _type: 'func',
        function: 'project',
        parameters: [
          getAll(entity),
          {
            _type: 'classInstance',
            type: 'colSpecArray',
            value: {
              colSpecs: columns.map((column) => ({
                name: column,
                function1: columnLambda(column),
              })),
            },
          },
        ],
      },
    ],
    parameters: [],
  },
});

/** The edit of an entity's columns in an execution context of the trades data space */
export const buildFakeDataSpaceEdit = (
  entity: string,
  columns: readonly string[],
  executionContext = 'production',
): CubeDataSpaceEdit => {
  const context = FAKE_TRADES_DESCRIPTION.executionContexts.find(
    (each) => each.name === executionContext,
  );
  if (!context) {
    throw new Error(`No execution context "${executionContext}"`);
  }
  return {
    coordinates: buildFakeDataSpaceQuery(entity, columns, executionContext),
    mapping: context.mapping,
    runtime: context.runtime,
  };
};

/** A session a test drives in place of the query builder: it loads, then holds the query the test gives it */
export class FakeCubeDataSpaceEditorSession
  implements CubeDataSpaceEditorSession
{
  readonly target: CubeDataSpaceEditorTarget;
  isLoading = true;
  loadError: string | undefined;
  hasChanges = false;
  edit: CubeDataSpaceEdit | undefined;
  editProblem: string | undefined;
  isDisposed = false;
  /** How many times its own undo and redo ran */
  undone = 0;
  redone = 0;

  constructor(target: CubeDataSpaceEditorTarget) {
    makeObservable(this, {
      isLoading: observable,
      loadError: observable,
      hasChanges: observable,
      edit: observable.ref,
      editProblem: observable,
      load: action,
      fail: action,
      setEdit: action,
      setProblem: action,
    });
    this.target = target;
  }

  /** The data space's model loaded */
  load(): void {
    this.isLoading = false;
  }

  fail(message: string): void {
    this.isLoading = false;
    this.loadError = message;
  }

  /** The query builder now holds this query */
  setEdit(edit: CubeDataSpaceEdit): void {
    this.hasChanges = true;
    this.edit = edit;
    this.editProblem = undefined;
  }

  /** The query builder now holds a query Cube can't run, for this reason */
  setProblem(problem: string): void {
    this.hasChanges = true;
    this.edit = undefined;
    this.editProblem = problem;
  }

  undo(): void {
    this.undone += 1;
  }

  redo(): void {
    this.redone += 1;
  }

  dispose(): void {
    this.isDisposed = true;
  }
}

export interface FakeCubeDataSpaceEditor {
  readonly editor: CubeDataSpaceEditor;
  /** Every session opened, in order */
  readonly sessions: FakeCubeDataSpaceEditorSession[];
  readonly listDataSpaces: jest.Mock<CubeDataSpaceEditor['listDataSpaces']>;
  readonly describeDataSpace: jest.Mock<
    CubeDataSpaceEditor['describeDataSpace']
  >;
}

/** A fresh fake: build one per test, since jest.fn keeps its calls across tests */
export const createFakeCubeDataSpaceEditor = (
  dataSpaces: readonly CubeDataSpaceSummary[] = [
    FAKE_RISK_DATA_SPACE,
    FAKE_TRADES_DATA_SPACE,
  ],
): FakeCubeDataSpaceEditor => {
  const sessions: FakeCubeDataSpaceEditorSession[] = [];
  const listDataSpaces = jest.fn<CubeDataSpaceEditor['listDataSpaces']>(
    async () => Promise.resolve(dataSpaces),
  );
  const describeDataSpace = jest.fn<CubeDataSpaceEditor['describeDataSpace']>(
    async (_project, dataSpace) =>
      dataSpace === FAKE_TRADES_DESCRIPTION.path
        ? Promise.resolve(FAKE_TRADES_DESCRIPTION)
        : Promise.resolve({
            path: dataSpace,
            executionContexts: [
              {
                name: 'default',
                mapping: `${dataSpace}Mapping`,
                runtime: `${dataSpace}Runtime`,
              },
            ],
            defaultExecutionContext: 'default',
          }),
  );
  return {
    editor: {
      listDataSpaces,
      describeDataSpace,
      openSession: (target) => {
        const session = new FakeCubeDataSpaceEditorSession(target);
        sessions.push(session);
        return session;
      },
      // its text, a field to type in, as the explorer's search, and a control
      renderSession: (session) =>
        createElement(
          'div',
          { 'data-testid': 'fake-query-builder' },
          createElement(
            'span',
            undefined,
            `The query builder on ${(session as FakeCubeDataSpaceEditorSession).target.dataSpace}`,
          ),
          createElement('input', { 'aria-label': 'Search properties' }),
          createElement('button', { 'aria-label': 'Remove column' }),
        ),
    },
    sessions,
    listDataSpaces,
    describeDataSpace,
  };
};
