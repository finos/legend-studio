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
import { guaranteeNonNullable } from '@finos/legend-shared';
import { CORE_PURE_PATH, PRIMITIVE_TYPE } from '@finos/legend-graph';
import { DataCubeExtendManagerState } from '../DataCubeExtendManagerState.js';
import type { DataCubeViewState } from '../../DataCubeViewState.js';
import { TEST__DataCubeEngine } from '../../../__tests__/DataCubeTestUtils.js';
import type { DataCubeRelationType } from '../../../core/DataCubeEngine.js';
import {
  DataCubeSnapshot,
  type DataCubeSnapshotExtendedColumn,
} from '../../../core/DataCubeSnapshot.js';
import { INTERNAL__DataCubeSource } from '../../../core/model/DataCubeSource.js';
import { DataCubeConfiguration } from '../../../core/model/DataCubeConfiguration.js';
import { newColumnConfiguration } from '../../../core/DataCubeConfigurationBuilder.js';
import {
  _lambda,
  _property,
  _synthesizeMinimalSourceQuery,
  _var,
} from '../../../core/DataCubeQueryBuilderUtils.js';
import { DataCubeColumnKind } from '../../../core/DataCubeQueryEngine.js';
import { _toCol } from '../../../core/model/DataCubeColumn.js';

class TEST__ColumnCheckDataCubeEngine extends TEST__DataCubeEngine {
  readonly checkedSnapshots: DataCubeSnapshot[] = [];
  error?: Error | undefined;

  override async getPartialQueryCode(snapshot: DataCubeSnapshot) {
    this.checkedSnapshots.push(snapshot);
    return '';
  }

  override async getQueryCodeRelationReturnType(): Promise<DataCubeRelationType> {
    if (this.error) {
      throw this.error;
    }
    return { columns: [] };
  }
}

const SOURCE_COLUMNS = [
  { name: 'id', type: PRIMITIVE_TYPE.INTEGER },
  { name: 'doc', type: CORE_PURE_PATH.VARIANT },
];

const setUp = async () => {
  const engine = new TEST__ColumnCheckDataCubeEngine();
  const source = new INTERNAL__DataCubeSource();
  source.columns = SOURCE_COLUMNS;
  source.query = _synthesizeMinimalSourceQuery(source.columns);
  const extendedColumn = (
    name: string,
    type: string,
    property = 'doc',
  ): DataCubeSnapshotExtendedColumn => ({
    name,
    type,
    mapFn: engine.serializeValueSpecification(
      _lambda([_var()], [_property(property)]),
    ),
  });
  const leafExtendedColumns = [
    extendedColumn('a', PRIMITIVE_TYPE.STRING),
    extendedColumn('b', PRIMITIVE_TYPE.STRING),
    extendedColumn('c', PRIMITIVE_TYPE.STRING),
  ];
  const groupExtendedColumns = [
    extendedColumn('g1', PRIMITIVE_TYPE.INTEGER, 'id'),
    extendedColumn('g2', PRIMITIVE_TYPE.INTEGER, 'id'),
  ];
  const configuration = new DataCubeConfiguration();
  configuration.columns = [
    ...SOURCE_COLUMNS,
    ...leafExtendedColumns,
    ...groupExtendedColumns,
  ].map((column) => newColumnConfiguration(column));
  const snapshot = DataCubeSnapshot.create(configuration.serialize());
  snapshot.data.sourceColumns = SOURCE_COLUMNS;
  snapshot.data.leafExtendedColumns = leafExtendedColumns;
  snapshot.data.groupExtendedColumns = groupExtendedColumns;
  snapshot.data.selectColumns = [
    ...SOURCE_COLUMNS.filter((column) => column.name === 'id'),
    ...leafExtendedColumns,
  ].map(_toCol);
  snapshot.finalize();

  const publishedSnapshots: DataCubeSnapshot[] = [];
  const alertError = jest.fn();
  const view = {
    engine,
    source,
    settingService: { getBooleanValue: () => false },
    snapshotService: {
      broadcastSnapshot: (published: DataCubeSnapshot) =>
        publishedSnapshots.push(published),
    },
    taskService: { newTask: () => ({}), endTask: () => undefined },
    dataCube: { alertService: { alertError, alertCodeCheckError: jest.fn() } },
  };
  const manager = new DataCubeExtendManagerState(
    view as unknown as DataCubeViewState,
  );
  await manager.receiveSnapshot(snapshot);
  return {
    engine,
    manager,
    publishedSnapshots,
    alertError,
    extendedColumn,
  };
};

const namesOf = (columns: { name: string }[]) =>
  columns.map((column) => column.name);

describe(unitTest(`Extended columns: updating a column`), () => {
  test(`edits a leaf-level column in place when it stays leaf-level, so the columns after it keep coming after it`, async () => {
    const { engine, manager, publishedSnapshots, extendedColumn } =
      await setUp();
    await manager.updateColumn(
      'b',
      extendedColumn('b2', PRIMITIVE_TYPE.STRING),
      false,
      DataCubeColumnKind.DIMENSION,
    );

    const checked = guaranteeNonNullable(engine.checkedSnapshots[0]).data;
    expect(namesOf(checked.leafExtendedColumns)).toEqual(['a', 'b2', 'c']);
    expect(namesOf(checked.selectColumns)).toEqual(['id', 'a', 'b2', 'c']);

    expect(namesOf(manager.leafExtendedColumns)).toEqual(['a', 'b2', 'c']);
    expect(namesOf(manager.selectColumns)).toEqual(['id', 'a', 'b2', 'c']);
    expect(namesOf(manager.groupExtendedColumns)).toEqual(['g1', 'g2']);
    expect(namesOf(manager.columnConfigurations)).toContain('b2');
    expect(namesOf(manager.columnConfigurations)).not.toContain('b');

    const published = guaranteeNonNullable(publishedSnapshots[0]).data;
    expect(namesOf(published.leafExtendedColumns)).toEqual(['a', 'b2', 'c']);
    expect(namesOf(published.selectColumns)).toEqual(['id', 'a', 'b2', 'c']);
  });

  test(`edits a group-level column in place when it stays group-level`, async () => {
    const { engine, manager, publishedSnapshots, extendedColumn } =
      await setUp();
    const updated = extendedColumn('g1', PRIMITIVE_TYPE.INTEGER, 'doc');
    await manager.updateColumn('g1', updated, true, undefined);

    expect(
      namesOf(
        guaranteeNonNullable(engine.checkedSnapshots[0]).data
          .groupExtendedColumns,
      ),
    ).toEqual(['g1', 'g2']);
    expect(namesOf(manager.groupExtendedColumns)).toEqual(['g1', 'g2']);
    expect(manager.groupExtendedColumns[0]?.data).toEqual(updated);
    expect(namesOf(manager.leafExtendedColumns)).toEqual(['a', 'b', 'c']);
    expect(
      manager.columnConfigurations.find((column) => column.name === 'g1')?.kind,
    ).toBe(DataCubeColumnKind.MEASURE);
    expect(
      namesOf(
        guaranteeNonNullable(publishedSnapshots[0]).data.groupExtendedColumns,
      ),
    ).toEqual(['g1', 'g2']);
  });

  test(`moves a leaf-level column which becomes group-level to the end of the group-level columns, and stops selecting it`, async () => {
    const { engine, manager, extendedColumn } = await setUp();
    await manager.updateColumn(
      'a',
      extendedColumn('a', PRIMITIVE_TYPE.STRING),
      true,
      undefined,
    );

    const checked = guaranteeNonNullable(engine.checkedSnapshots[0]).data;
    expect(namesOf(checked.leafExtendedColumns)).toEqual(['b', 'c']);
    expect(namesOf(checked.groupExtendedColumns)).toEqual(['g1', 'g2', 'a']);
    expect(namesOf(checked.selectColumns)).toEqual(['id', 'b', 'c']);

    expect(namesOf(manager.leafExtendedColumns)).toEqual(['b', 'c']);
    expect(namesOf(manager.groupExtendedColumns)).toEqual(['g1', 'g2', 'a']);
    expect(namesOf(manager.selectColumns)).toEqual(['id', 'b', 'c']);
  });

  test(`moves a group-level column which becomes leaf-level to the end of the leaf-level columns, selecting it only if it is selected`, async () => {
    const { manager, extendedColumn } = await setUp();
    await manager.updateColumn(
      'g1',
      extendedColumn('g1', PRIMITIVE_TYPE.INTEGER, 'id'),
      false,
      DataCubeColumnKind.MEASURE,
    );
    expect(namesOf(manager.leafExtendedColumns)).toEqual(['a', 'b', 'c', 'g1']);
    expect(namesOf(manager.groupExtendedColumns)).toEqual(['g2']);
    expect(namesOf(manager.selectColumns)).toEqual(['id', 'a', 'b', 'c', 'g1']);

    guaranteeNonNullable(
      manager.columnConfigurations.find((column) => column.name === 'g2'),
    ).isSelected = false;
    await manager.updateColumn(
      'g2',
      extendedColumn('g2', PRIMITIVE_TYPE.INTEGER, 'id'),
      false,
      DataCubeColumnKind.MEASURE,
    );
    expect(namesOf(manager.leafExtendedColumns)).toEqual([
      'a',
      'b',
      'c',
      'g1',
      'g2',
    ]);
    expect(namesOf(manager.groupExtendedColumns)).toEqual([]);
    expect(namesOf(manager.selectColumns)).toEqual(['id', 'a', 'b', 'c', 'g1']);
  });

  test(`leaves the columns as they were when the update fails to check`, async () => {
    const { engine, manager, publishedSnapshots, alertError, extendedColumn } =
      await setUp();
    engine.error = new Error('boom');
    await manager.updateColumn(
      'b',
      extendedColumn('b', PRIMITIVE_TYPE.STRING),
      true,
      undefined,
    );
    expect(alertError).toHaveBeenCalledTimes(1);
    expect(namesOf(manager.leafExtendedColumns)).toEqual(['a', 'b', 'c']);
    expect(namesOf(manager.groupExtendedColumns)).toEqual(['g1', 'g2']);
    expect(namesOf(manager.selectColumns)).toEqual(['id', 'a', 'b', 'c']);
    expect(publishedSnapshots).toEqual([]);
  });
});
