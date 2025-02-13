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

import { guaranteeType, type PlainObject } from '@finos/legend-shared';
import {
  LegendDataCubeSourceBuilderState,
  LegendDataCubeSourceBuilderType,
} from './LegendDataCubeSourceBuilderState.js';
import type { LegendDataCubeApplicationStore } from '../../LegendDataCubeBaseStore.js';
import { action, makeObservable, observable } from 'mobx';
import type { LegendDataCubeDataCubeEngine } from '../../LegendDataCubeDataCubeEngine.js';
import {
  CSVFileQueryDataCubeSource,
  RawCSVFileQueryDataCubeSource,
} from '../../model/CSVFileQueryDataCubeSource.js';

export class CSVFileQueryDataCubeSourceBuilderState extends LegendDataCubeSourceBuilderState {
  fileData!: string;
  fileName!: string;
  rowCount!: number;

  constructor(
    application: LegendDataCubeApplicationStore,
    engine: LegendDataCubeDataCubeEngine,
  ) {
    super(application, engine);
    makeObservable(this, {
      fileData: observable,
      fileName: observable,
      rowCount: observable,

      setFileData: action,
      setFileName: action,
      setRowCount: action,
    });
  }

  setFileData(data: string) {
    this.fileData = data;
  }

  setFileName(fileName: string) {
    this.fileName = fileName;
  }

  setRowCount(count: number) {
    this.rowCount = count;
  }

  override get label(): LegendDataCubeSourceBuilderType {
    return LegendDataCubeSourceBuilderType.CSV_FILE_QUERY;
  }

  override get isValid(): boolean {
    return Boolean(this.fileData);
  }

  override async generateSourceData(): Promise<PlainObject> {
    const csvDataSource = guaranteeType(
      await this._engine.ingestFileData(this.fileData),
      CSVFileQueryDataCubeSource,
      `Can't generate data source`,
    );

    const rawCsvDataSource = new RawCSVFileQueryDataCubeSource();
    rawCsvDataSource.count = this.rowCount;
    rawCsvDataSource.fileName = this.fileName;
    rawCsvDataSource.db = csvDataSource.db;
    rawCsvDataSource.model = csvDataSource.model;
    rawCsvDataSource.schema = csvDataSource.schema;
    rawCsvDataSource.table = csvDataSource.table;
    rawCsvDataSource.runtime = csvDataSource.runtime;

    return RawCSVFileQueryDataCubeSource.serialization.toJson(rawCsvDataSource);
  }
}
