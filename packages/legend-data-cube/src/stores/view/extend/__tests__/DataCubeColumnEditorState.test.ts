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
  PRIMITIVE_TYPE,
  V1_AppliedFunction,
  V1_ClassInstance,
  V1_ColSpecArray,
  type V1_Lambda,
  type V1_ValueSpecification,
} from '@finos/legend-graph';
import {
  DataCubeExistingColumnEditorState,
  DataCubeNewColumnState,
} from '../DataCubeColumnEditorState.js';
import type { DataCubeExtendManagerState } from '../DataCubeExtendManagerState.js';
import { TEST__DataCubeEngine } from '../../../__tests__/DataCubeTestUtils.js';
import type { DataCubeRelationType } from '../../../core/DataCubeEngine.js';
import {
  DataCubeSnapshot,
  type DataCubeSnapshotExtendedColumn,
} from '../../../core/DataCubeSnapshot.js';
import { INTERNAL__DataCubeSource } from '../../../core/model/DataCubeSource.js';
import {
  _lambda,
  _property,
  _synthesizeMinimalSourceQuery,
  _var,
} from '../../../core/DataCubeQueryBuilderUtils.js';
import {
  DataCubeColumnDataType,
  DataCubeColumnKind,
} from '../../../core/DataCubeQueryEngine.js';
import type { DataCubeJsonOffer } from '../../../core/variant/DataCubeJsonOffers.js';

jest.mock('monaco-editor', () => {
  const monaco = jest.requireActual<{ editor: object }>('monaco-editor');
  return {
    ...monaco,
    editor: {
      ...monaco.editor,
      createModel: () => ({
        setValue: () => undefined,
        dispose: () => undefined,
      }),
    },
    Uri: { file: (path: string) => ({ path }) },
  };
});

class TEST__ReturnTypeDataCubeEngine extends TEST__DataCubeEngine {
  readonly checkedQueries: { code: string; baseQuery: V1_Lambda }[] = [];
  returnType = PRIMITIVE_TYPE.STRING as string;

  override buildExecutionContext() {
    return undefined;
  }

  override async getQueryCodeRelationReturnType(
    code: string,
    baseQuery: V1_ValueSpecification,
  ): Promise<DataCubeRelationType> {
    this.checkedQueries.push({ code, baseQuery: baseQuery as V1_Lambda });
    const columnName = guaranteeNonNullable(
      /^->extend\(~(?<name>\w+):/u.exec(code)?.groups?.name,
    );
    return { columns: [{ name: columnName, type: this.returnType }] };
  }
}

const SOURCE_COLUMNS = [
  { name: 'id', type: PRIMITIVE_TYPE.INTEGER },
  { name: 'doc', type: CORE_PURE_PATH.VARIANT },
];

const setUp = (takenNames: string[] = []) => {
  const engine = new TEST__ReturnTypeDataCubeEngine();
  const source = new INTERNAL__DataCubeSource();
  source.columns = SOURCE_COLUMNS;
  source.query = _synthesizeMinimalSourceQuery(source.columns);
  const leafExtendedColumns: DataCubeSnapshotExtendedColumn[] = [
    'a',
    'b',
    'c',
  ].map((name) => ({
    name,
    type: CORE_PURE_PATH.VARIANT,
    mapFn: engine.serializeValueSpecification(
      _lambda([_var()], [_property('doc')]),
    ),
  }));
  const snapshot = DataCubeSnapshot.create({});
  snapshot.data.sourceColumns = SOURCE_COLUMNS;
  snapshot.data.leafExtendedColumns = leafExtendedColumns;
  const manager = {
    view: {
      engine,
      source,
      dataCube: {
        layoutService: {
          newDisplay: () => ({ open: () => undefined, close: () => undefined }),
        },
        alertService: { alertError: jest.fn() },
      },
    },
    sourceColumns: SOURCE_COLUMNS,
    leafExtendedColumns,
    allColumnNames: [
      ...SOURCE_COLUMNS.map((column) => column.name),
      ...leafExtendedColumns.map((column) => column.name),
      ...takenNames,
    ],
    getLatestSnapshot: () => snapshot,
  } as unknown as DataCubeExtendManagerState;
  return { engine, manager, leafExtendedColumns };
};

const offer = (
  name: string,
  type = PRIMITIVE_TYPE.STRING as string,
): DataCubeJsonOffer => ({
  key: 'value',
  label: `as ${type}`,
  name,
  type,
  kind: DataCubeColumnKind.DIMENSION,
  code: `x|$x.doc->get('${name}')->to(@${type})`,
});

const namesOf = (columns: { name: string }[]) =>
  columns.map((column) => column.name);

const leafExtendedColumnNamesOf = (query: V1_Lambda) => {
  const names: string[] = [];
  let node: V1_ValueSpecification | undefined = query.body[0];
  while (node instanceof V1_AppliedFunction) {
    if (node.function === 'extend') {
      names.unshift(
        ...namesOf(
          guaranteeType(
            guaranteeType(node.parameters[1], V1_ClassInstance).value,
            V1_ColSpecArray,
          ).colSpecs,
        ),
      );
    }
    node = node.parameters[0];
  }
  return names;
};

describe(
  unitTest(
    `Extended columns: filling in a column from a field of a JSON column`,
  ),
  () => {
    test(`fills in the name, type, kind, level and code of the column, then checks its type`, async () => {
      const { engine, manager } = setUp();
      const editor = new DataCubeNewColumnState(manager);
      editor.setColumnKind(true, undefined);
      const picked = offer('tier');
      await editor.applyJsonOffer(picked);

      expect(editor.name).toBe('tier');
      expect(editor.expectedType).toBe(DataCubeColumnDataType.TEXT);
      expect(editor.columnKind).toBe(DataCubeColumnKind.DIMENSION);
      expect(editor.isGroupLevel).toBe(false);
      expect(editor.code).toBe(picked.code);
      expect(engine.checkedQueries.at(-1)?.code).toBe(
        `${editor.codePrefix}${picked.code})`,
      );
      expect(editor.returnType).toBe(PRIMITIVE_TYPE.STRING);
      expect(editor.isTypeValid).toBe(true);
    });

    test(`picks a name no other column has`, async () => {
      const { manager } = setUp(['tier', 'tier_2']);
      const editor = new DataCubeNewColumnState(manager);
      await editor.applyJsonOffer(offer('tier'));
      expect(editor.name).toBe('tier_3');
    });

    test(`renames the column after each field picked, until its name is edited`, async () => {
      const { engine, manager } = setUp();
      const editor = new DataCubeNewColumnState(manager);
      expect(editor.isNameEdited).toBe(false);

      await editor.applyJsonOffer(offer('tier'));
      await editor.applyJsonOffer(offer('qty', PRIMITIVE_TYPE.INTEGER));
      expect(editor.name).toBe('qty');
      expect(editor.isNameEdited).toBe(false);

      editor.setName('quantity');
      expect(editor.isNameEdited).toBe(true);
      engine.returnType = PRIMITIVE_TYPE.FLOAT;
      await editor.applyJsonOffer(offer('price', PRIMITIVE_TYPE.FLOAT));
      expect(editor.name).toBe('quantity');
      expect(editor.expectedType).toBe(DataCubeColumnDataType.NUMBER);
      expect(editor.code).toBe(offer('price', PRIMITIVE_TYPE.FLOAT).code);
    });

    test(`keeps the name of an existing column when a field is picked`, async () => {
      const { manager, leafExtendedColumns } = setUp();
      const editor = new DataCubeExistingColumnEditorState(
        manager,
        guaranteeNonNullable(leafExtendedColumns[1]),
        DataCubeColumnKind.DIMENSION,
        false,
      );
      expect(editor.isNameEdited).toBe(true);
      await editor.applyJsonOffer(offer('tier'));
      expect(editor.name).toBe('b');
    });
  },
);

describe(
  unitTest(
    `Extended columns: the leaf-level extended columns a column can use`,
  ),
  () => {
    test(`a new column can use every leaf-level extended column`, () => {
      const { manager, leafExtendedColumns } = setUp();
      const editor = new DataCubeNewColumnState(manager);
      expect(
        namesOf(editor.getPrecedingLeafExtendedColumns(leafExtendedColumns)),
      ).toEqual(['a', 'b', 'c']);
      expect(namesOf(editor.jsonColumns)).toEqual(['doc', 'a', 'b', 'c']);
      expect(leafExtendedColumnNamesOf(editor.buildExtendBaseQuery())).toEqual([
        'a',
        'b',
        'c',
      ]);
    });

    test(`an existing leaf-level column can only use the leaf-level extended columns before it`, () => {
      const { manager, leafExtendedColumns } = setUp();
      const editor = new DataCubeExistingColumnEditorState(
        manager,
        guaranteeNonNullable(leafExtendedColumns[1]),
        DataCubeColumnKind.DIMENSION,
        false,
      );
      expect(
        namesOf(editor.getPrecedingLeafExtendedColumns(leafExtendedColumns)),
      ).toEqual(['a']);
      expect(namesOf(editor.jsonColumns)).toEqual(['doc', 'a']);
      expect(leafExtendedColumnNamesOf(editor.buildExtendBaseQuery())).toEqual([
        'a',
      ]);
    });

    test(`an existing group-level column can use every leaf-level extended column`, () => {
      const { engine, manager, leafExtendedColumns } = setUp();
      const editor = new DataCubeExistingColumnEditorState(
        manager,
        {
          name: 'total',
          type: PRIMITIVE_TYPE.INTEGER,
          mapFn: engine.serializeValueSpecification(
            _lambda([_var()], [_property('id')]),
          ),
        },
        DataCubeColumnKind.MEASURE,
        true,
      );
      expect(
        namesOf(editor.getPrecedingLeafExtendedColumns(leafExtendedColumns)),
      ).toEqual(['a', 'b', 'c']);
      expect(namesOf(editor.jsonColumns)).toEqual(['doc', 'a', 'b', 'c']);
      expect(leafExtendedColumnNamesOf(editor.buildExtendBaseQuery())).toEqual([
        'a',
        'b',
        'c',
      ]);
    });
  },
);
