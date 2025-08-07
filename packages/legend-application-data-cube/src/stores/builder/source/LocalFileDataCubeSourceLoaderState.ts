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

import {
  ActionState,
  assertErrorThrown,
  csvStringify,
  guaranteeNonNullable,
  IllegalStateError,
  parseCSVFile,
  type PlainObject,
} from '@finos/legend-shared';
import { makeObservable, observable, action } from 'mobx';
import type { LegendDataCubeApplicationStore } from '../../LegendDataCubeBaseStore.js';
import type { LegendDataCubeDataCubeEngine } from '../../LegendDataCubeDataCubeEngine.js';
import {
  LocalFileDataCubeSourceFormat,
  RawLocalFileQueryDataCubeSource,
} from '../../model/LocalFileDataCubeSource.js';
import { LegendDataCubeSourceLoaderState } from './LegendDataCubeSourceLoaderState.js';
import type { DataCubeAlertService } from '@finos/legend-data-cube';
import type { PersistentDataCube } from '@finos/legend-graph';
import { LegendDataCubeSourceBuilderType } from './LegendDataCubeSourceBuilderState.js';

export class LocalFileDataCubeSourceLoaderState extends LegendDataCubeSourceLoaderState {
  readonly processState = ActionState.create();

  fileName?: string | undefined;
  fileFormat?: LocalFileDataCubeSourceFormat | undefined;
  // NOTE: type string is suitable for CSV/Excel, etc. but will not be appropriate
  // for other format that we want to support, e.g. arrow/parquet
  fileData?: string | undefined;
  previewText?: string | undefined;
  rowCount?: number | undefined;
  columnNames?: string[] | undefined;

  constructor(
    application: LegendDataCubeApplicationStore,
    engine: LegendDataCubeDataCubeEngine,
    alertService: DataCubeAlertService,
    sourceData: PlainObject,
    persistentDataCube: PersistentDataCube,
    onSuccess: () => Promise<void>,
    onError: (error: unknown) => Promise<void>,
  ) {
    super(
      application,
      engine,
      alertService,
      sourceData,
      persistentDataCube,
      onSuccess,
      onError,
    );

    makeObservable(this, {
      fileName: observable,
      setFileName: action,

      columnNames: observable,
      setColumnNames: action,

      fileFormat: observable,
      setFileFormat: action,

      fileData: observable,
      setFileData: action,

      previewText: observable,
      setPreviewText: action,

      rowCount: observable,
      setRowCount: action,
    });
  }

  setFileName(fileName: string | undefined) {
    this.fileName = fileName;
  }

  setColumnNames(columnNames: string[] | undefined) {
    this.columnNames = columnNames;
  }

  setFileFormat(format: LocalFileDataCubeSourceFormat | undefined) {
    this.fileFormat = format;
  }

  setFileData(data: string | undefined) {
    this.fileData = data;
  }

  setRowCount(count: number | undefined) {
    this.rowCount = count;
  }

  setPreviewText(text: string | undefined) {
    this.previewText = text;
  }

  reset() {
    this.setFileName(undefined);
    this.setColumnNames(undefined);
    this.setFileFormat(undefined);
    this.setFileData(undefined);
    this.setRowCount(undefined);
    this.setPreviewText(undefined);
  }

  async processFile(file: File | undefined) {
    if (!file) {
      return;
    }

    this.reset();
    this.processState.inProgress();

    try {
      const fileName = file.name;
      const fileFormat = fileName.split('.').pop();

      switch (fileFormat?.toLowerCase()) {
        case LocalFileDataCubeSourceFormat.CSV.toLowerCase(): {
          parseCSVFile(file, {
            complete: (result) => {
              this.setFileData(
                csvStringify(result.data, { escapeChar: `'`, quoteChar: `'` }),
              );
              this.setColumnNames(
                Object.keys(result.data.at(0) as object).filter(
                  (key) => key !== '',
                ),
              );
              this.setFileName(fileName);
              this.setFileFormat(LocalFileDataCubeSourceFormat.CSV);
              this.setRowCount(result.data.length);
              this.setPreviewText(
                csvStringify(result.data.slice(0, 100), {
                  escapeChar: `'`,
                  quoteChar: `'`,
                }),
              );
            },
            header: true,
            dynamicTyping: false,
            skipEmptyLines: true,
          });
          break;
        }
        default: {
          throw new IllegalStateError(
            `Can't process file with format '${fileFormat}'`,
          );
        }
      }
      this.processState.complete();
    } catch (error) {
      assertErrorThrown(error);
      this.processState.fail();
      this.reset();
    }
  }

  override get isValid(): boolean {
    return Boolean(this.fileData);
  }

  override get label() {
    return LegendDataCubeSourceBuilderType.LOCAL_FILE;
  }

  override async load(source: PlainObject | undefined) {
    const deserializedSource =
      RawLocalFileQueryDataCubeSource.serialization.fromJson(
        guaranteeNonNullable(source),
      );

    if (
      !this.fileData ||
      !this.fileName ||
      !this.fileFormat ||
      this.rowCount === undefined
    ) {
      throw new IllegalStateError(
        `Can't load source data: file data and information is not set`,
      );
    }

    const intersectingColumns = guaranteeNonNullable(
      this.columnNames?.filter((col) =>
        deserializedSource.columnNames.includes(col),
      ),
    );
    if (intersectingColumns.length !== deserializedSource.columnNames.length) {
      throw new Error(
        `Columns mismatch: Expected [${deserializedSource.columnNames.join(',')}], got [${this.columnNames?.join(',')}]`,
      );
    }

    const tableDetails = guaranteeNonNullable(
      await this._engine.ingestLocalFileData(
        this.fileData,
        this.fileFormat,
        deserializedSource._ref,
      ),
      `Can't load source data: failed to ingest data from local file`,
    );

    // TODO: do a type check for columns
    const rawSource = new RawLocalFileQueryDataCubeSource();
    rawSource.fileName = this.fileName;
    rawSource.fileFormat = this.fileFormat;
    rawSource._ref = tableDetails.dbReference;
    rawSource.columnNames = tableDetails.columnNames;

    return RawLocalFileQueryDataCubeSource.serialization.toJson(rawSource);
  }
}
