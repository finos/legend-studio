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

import { action, computed, makeObservable, observable } from 'mobx';
import {
  ActionState,
  assertErrorThrown,
  guaranteeNonNullable,
  uuid,
} from '@finos/legend-shared';
import { PureClientVersion } from '@finos/legend-graph';
import type { DataCubeSnapshot } from '../../core/DataCubeSnapshot.js';
import {
  _toCol,
  type DataCubeColumn,
} from '../../core/model/DataCubeColumn.js';
import {
  DataCubeOperationAdvancedValueType,
  DataCubeQueryFilterGroupOperator,
  DataCubeQueryFilterOperator,
} from '../../core/DataCubeQueryEngine.js';
import { buildExecutableQuery } from '../../core/DataCubeQueryBuilder.js';
import { _lambda } from '../../core/DataCubeQueryBuilderUtils.js';
import {
  DataCubeJsonShapeReader,
  type DataCubeJsonSample,
} from '../../core/variant/DataCubeJsonShape.js';
import {
  filterDataCubeJsonFields,
  getDataCubeJsonFields,
  type DataCubeJsonField,
  type DataCubeJsonOffer,
} from '../../core/variant/DataCubeJsonOffers.js';
import { DataCubeSettingKey } from '../../../__lib__/DataCubeSetting.js';
import type { DataCubeColumnBaseEditorState } from './DataCubeColumnEditorState.js';

export const DATA_CUBE_JSON_SAMPLE_SIZE = 1000;

export function buildDataCubeJsonSampleSnapshot(
  baseSnapshot: DataCubeSnapshot,
  column: DataCubeColumn,
  everyRow: boolean,
) {
  const snapshot = baseSnapshot.clone();
  const data = snapshot.data;
  const columnIndex = data.leafExtendedColumns.findIndex(
    (col) => col.name === column.name,
  );
  data.leafExtendedColumns =
    columnIndex === -1
      ? []
      : data.leafExtendedColumns.slice(0, columnIndex + 1);
  data.selectColumns = [_toCol(column)];
  data.filter = {
    groupOperator: DataCubeQueryFilterGroupOperator.AND,
    conditions: [
      {
        ..._toCol(column),
        operator: DataCubeQueryFilterOperator.IS_NOT_NULL,
        value: { type: DataCubeOperationAdvancedValueType.VOID },
      },
    ],
  };
  data.pivot = undefined;
  data.groupBy = undefined;
  data.groupExtendedColumns = [];
  data.sortColumns = [];
  data.dimensionalTree = undefined;
  data.limit = everyRow ? undefined : DATA_CUBE_JSON_SAMPLE_SIZE + 1;
  return snapshot;
}

const _pathKey = (path: string[]) => JSON.stringify(path);

export class DataCubeJsonFieldsState {
  private readonly _editor: DataCubeColumnBaseEditorState;
  private _readToken?: string | undefined;

  readonly readState = ActionState.create();

  column?: DataCubeColumn | undefined;
  sample?: DataCubeJsonSample | undefined;
  isReadingEveryRow = false;
  hasStoppedReadingEveryRow = false;
  readError?: string | undefined;

  search = '';
  selectedPath?: string[] | undefined;
  expandedPaths = new Set<string>();
  pickedOffer?: DataCubeJsonOffer | undefined;

  constructor(editor: DataCubeColumnBaseEditorState) {
    makeObservable(this, {
      column: observable.ref,
      sample: observable.ref,
      isReadingEveryRow: observable,
      hasStoppedReadingEveryRow: observable,
      readError: observable,
      search: observable,
      selectedPath: observable.ref,
      expandedPaths: observable,
      pickedOffer: observable.ref,

      fields: computed,
      shownFields: computed,
      selectedField: computed,
      status: computed,

      setColumn: action,
      setSearch: action,
      select: action,
      toggleExpanded: action,
      setPickedOffer: action,
      stop: action,
      setSample: action,
      setReadError: action,
      setIsReadingEveryRow: action,
      startReading: action,
    });

    this._editor = editor;
  }

  get fields(): DataCubeJsonField | undefined {
    return this.column && this.sample
      ? getDataCubeJsonFields(this.column.name, this.sample)
      : undefined;
  }

  get shownFields(): DataCubeJsonField | undefined {
    return filterDataCubeJsonFields(this.fields, this.search);
  }

  get selectedField(): DataCubeJsonField | undefined {
    if (!this.selectedPath) {
      return undefined;
    }
    const key = _pathKey(this.selectedPath);
    const find = (
      field: DataCubeJsonField | undefined,
    ): DataCubeJsonField | undefined =>
      !field
        ? undefined
        : _pathKey(field.path) === key
          ? field
          : field.children.reduce<DataCubeJsonField | undefined>(
              (found, child) => found ?? find(child),
              undefined,
            );
    return find(this.fields);
  }

  get status(): { text: string; isError: boolean } | undefined {
    const column = this.column;
    if (!column) {
      return undefined;
    }
    if (this.readState.isInProgress) {
      return {
        text: this.isReadingEveryRow
          ? `Reading every value of ${column.name}...`
          : `Sampling ${column.name}...`,
        isError: false,
      };
    }
    if (this.readError !== undefined) {
      return {
        text: `Couldn't read ${column.name}: ${this.readError}`,
        isError: true,
      };
    }
    const sample = this.sample;
    if (!sample) {
      return undefined;
    }
    if (sample.shape.present === 0) {
      return {
        text: `No JSON values in the ${sample.rows.toLocaleString()} values read.`,
        isError: true,
      };
    }
    return {
      text: `${this.hasStoppedReadingEveryRow ? 'Stopped reading every value, showing the sample. ' : ''}${
        sample.complete
          ? `All ${sample.rows.toLocaleString()} non-empty values read: every field, type and share covers the whole column.`
          : `First ${sample.rows.toLocaleString()} non-empty values read: types and shares are from the sample.`
      }`,
      isError: false,
    };
  }

  isExpanded(path: string[]): boolean {
    return this.expandedPaths.has(_pathKey(path));
  }

  isSelected(path: string[]): boolean {
    return (
      this.selectedPath !== undefined &&
      _pathKey(this.selectedPath) === _pathKey(path)
    );
  }

  setColumn(column: DataCubeColumn | undefined): void {
    this.stop();
    this.column = column;
    this.sample = undefined;
    this.readError = undefined;
    this.hasStoppedReadingEveryRow = false;
    this.search = '';
    this.selectedPath = undefined;
    this.expandedPaths.clear();
    this.pickedOffer = undefined;
  }

  setSearch(value: string): void {
    this.search = value;
  }

  select(path: string[]): void {
    this.selectedPath = path;
  }

  toggleExpanded(path: string[]): void {
    const key = _pathKey(path);
    if (this.expandedPaths.has(key)) {
      this.expandedPaths.delete(key);
    } else {
      this.expandedPaths.add(key);
    }
  }

  setPickedOffer(offer: DataCubeJsonOffer | undefined): void {
    this.pickedOffer = offer;
  }

  setSample(sample: DataCubeJsonSample | undefined): void {
    this.sample = sample;
    const fields = this.fields;
    if (!fields) {
      return;
    }
    this.expandedPaths.add(_pathKey(fields.path));
    fields.children.forEach((child) =>
      this.expandedPaths.add(_pathKey(child.path)),
    );
    if (!this.selectedField) {
      const find = (field: DataCubeJsonField): DataCubeJsonField | undefined =>
        field.offers.length
          ? field
          : field.children.reduce<DataCubeJsonField | undefined>(
              (found, child) => found ?? find(child),
              undefined,
            );
      this.selectedPath = (
        fields.children.reduce<DataCubeJsonField | undefined>(
          (found, child) => found ?? find(child),
          undefined,
        ) ?? fields
      ).path;
    }
  }

  setReadError(value: string | undefined): void {
    this.readError = value;
  }

  setIsReadingEveryRow(value: boolean): void {
    this.isReadingEveryRow = value;
  }

  startReading(everyRow: boolean): void {
    this.readState.inProgress();
    this.isReadingEveryRow = everyRow;
    this.hasStoppedReadingEveryRow = false;
    this.readError = undefined;
  }

  async read(everyRow: boolean): Promise<void> {
    const column = this.column;
    if (!column) {
      return;
    }
    const token = uuid();
    this._readToken = token;
    this.startReading(everyRow);

    const view = this._editor.view;
    const task = view.taskService.newTask(
      `Reading values of ${column.name}...`,
    );
    try {
      const snapshot = buildDataCubeJsonSampleSnapshot(
        guaranteeNonNullable(this._editor.getLatestSnapshot()),
        column,
        everyRow,
      );
      const result = await view.engine.executeQuery(
        _lambda([], [buildExecutableQuery(snapshot, view.source, view.engine)]),
        view.source,
        {
          debug: view.settingService.getBooleanValue(
            DataCubeSettingKey.DEBUGGER__ENABLE_DEBUG_MODE,
          ),
          clientVersion: view.settingService.getBooleanValue(
            DataCubeSettingKey.DEBUGGER__USE_DEV_CLIENT_PROTOCOL_VERSION,
          )
            ? PureClientVersion.VX_X_X
            : undefined,
        },
      );
      if (this._readToken !== token) {
        return;
      }
      const rows = result.result.result.rows;
      const reader = new DataCubeJsonShapeReader();
      (everyRow ? rows : rows.slice(0, DATA_CUBE_JSON_SAMPLE_SIZE)).forEach(
        (row) => reader.add(row.values[0]),
      );
      this.setSample(
        reader.result(everyRow || rows.length <= DATA_CUBE_JSON_SAMPLE_SIZE),
      );
    } catch (error) {
      assertErrorThrown(error);
      if (this._readToken === token) {
        this.setReadError(error.message);
      }
    } finally {
      view.taskService.endTask(task);
      if (this._readToken === token) {
        this._readToken = undefined;
        this.setIsReadingEveryRow(false);
        this.readState.complete();
      }
    }
  }

  stop(): void {
    if (this._readToken !== undefined) {
      this._readToken = undefined;
      this.hasStoppedReadingEveryRow = this.isReadingEveryRow;
      this.isReadingEveryRow = false;
      this.readState.complete();
    }
  }

  async pick(offer: DataCubeJsonOffer): Promise<void> {
    this.setPickedOffer(offer);
    await this._editor.applyJsonOffer(offer);
  }
}
