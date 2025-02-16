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
  csvStringify,
  guaranteeType,
  IllegalStateError,
  parseCSVFile,
  type PlainObject,
} from '@finos/legend-shared';
import {
  LegendDataCubeSourceBuilderState,
  LegendDataCubeSourceBuilderType,
} from './LegendDataCubeSourceBuilderState.js';
import type { LegendDataCubeApplicationStore } from '../../LegendDataCubeBaseStore.js';
import { action, makeObservable, observable } from 'mobx';
import type { LegendDataCubeDataCubeEngine } from '../../LegendDataCubeDataCubeEngine.js';
import {
  LocalFileDataCubeSource,
  LocalFileDataCubeSourceFormat,
  RawLocalFileQueryDataCubeSource,
} from '../../model/LocalFileDataCubeSource.js';

export class LocalFileDataCubeSourceBuilderState extends LegendDataCubeSourceBuilderState {
  readonly processState = ActionState.create();

  fileName?: string | undefined;
  fileFormat?: string | undefined;
  // NOTE: type string is suitable for CSV/Excel, etc. but will not be appropriate
  // for other format that we want to support, e.g. arrow/parquet
  fileData?: string | undefined;
  previewText?: string | undefined;
  rowCount?: number | undefined;

  constructor(
    application: LegendDataCubeApplicationStore,
    engine: LegendDataCubeDataCubeEngine,
  ) {
    super(application, engine);

    makeObservable(this, {
      fileName: observable,
      setFileName: action,

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

  setFileFormat(format: string | undefined) {
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

  processFile(file: File | undefined) {
    this.setFileName(undefined);
    this.setFileFormat(undefined);
    this.setFileData(undefined);
    this.setRowCount(undefined);
    this.setPreviewText(undefined);

    if (!file) {
      return;
    }

    this.processState.inProgress();

    const fileName = file.name;
    const fileFormat = fileName.split('.').pop();

    switch (fileFormat?.toLowerCase()) {
      case LocalFileDataCubeSourceFormat.CSV.toLowerCase(): {
        parseCSVFile(file, {
          complete: (result) => {
            this.setFileData(
              csvStringify(result.data, { escapeChar: `'`, quoteChar: `'` }),
            );
            this.setFileName(fileName);
            this.setFileFormat(fileFormat);
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
        this.processState.complete();
        throw new IllegalStateError(
          `Can't process file with format '${fileFormat}'`,
        );
      }
    }

    this.processState.complete();
  }

  override get label(): LegendDataCubeSourceBuilderType {
    return LegendDataCubeSourceBuilderType.LOCAL_FILE;
  }

  override get isValid(): boolean {
    return Boolean(this.fileData);
  }

  override async generateSourceData(): Promise<PlainObject> {
    if (
      !this.fileData ||
      !this.fileName ||
      !this.fileFormat ||
      this.rowCount === undefined
    ) {
      throw new IllegalStateError(
        `Can't generate source data: file data and information is not set`,
      );
    }

    const source = guaranteeType(
      await this._engine.ingestLocalFileData(this.fileData, this.fileFormat),
      LocalFileDataCubeSource,
      `Can't generate data source`,
    );
    const rawSource = new RawLocalFileQueryDataCubeSource();
    rawSource.count = this.rowCount;
    rawSource.fileName = this.fileName;
    rawSource.db = source.db;
    rawSource.model = source.model;
    rawSource.schema = source.schema;
    rawSource.table = source.table;
    rawSource.runtime = source.runtime;

    return RawLocalFileQueryDataCubeSource.serialization.toJson(rawSource);
  }
}
