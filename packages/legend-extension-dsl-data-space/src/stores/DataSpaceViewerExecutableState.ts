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
  assertErrorThrown,
  guaranteeType,
  isNonNullable,
  LogEvent,
  uuid,
  type GeneratorFn,
} from '@finos/legend-shared';
import {
  type DataSpaceExecutableAnalysisResult,
  DataSpaceServiceExecutableInfo,
  DataSpaceExecutableTDSResult,
  type DataSpaceExecutableResult,
  DataSpaceMultiExecutionServiceExecutableInfo,
} from '../graph-manager/action/analytics/DataSpaceAnalysis.js';
import type { DataSpaceViewerState } from './DataSpaceViewerState.js';
import { action, flow, makeObservable, observable } from 'mobx';
import {
  TDSExecutionResult,
  type ExecutionResultWithMetadata,
} from '@finos/legend-graph';
import { DSL_DATASPACE_EVENT } from '../__lib__/DSL_DataSpace_Event.js';

export interface ResultColumnData {
  id: string;
  name: string;
  documentation?: string | undefined;
  isLoadingSamples?: boolean | undefined;
  sampleValues?: string | undefined;
}

export class DataSpaceExecutableAnalysisResultState {
  readonly execState: DataSpaceViewerExecutableState;
  value: DataSpaceExecutableResult;

  constructor(
    viewerState: DataSpaceViewerExecutableState,
    value: DataSpaceExecutableResult,
  ) {
    this.value = value;
    this.execState = viewerState;
  }
}

export class DataSpaceExecutableTDSResultState extends DataSpaceExecutableAnalysisResultState {
  declare value: DataSpaceExecutableTDSResult;
  gridData: ResultColumnData[] = [];

  constructor(
    viewerState: DataSpaceViewerExecutableState,
    value: DataSpaceExecutableTDSResult,
  ) {
    super(viewerState, value);
    makeObservable(this, {
      gridData: observable,
      setGridData: action,
      buildSampleValues: flow,
    });
    this.value = value;
    this.gridData = this.buildGridData(undefined);
  }

  setGridData(val: ResultColumnData[]): void {
    this.gridData = val;
  }

  buildGridData(
    sampleValuesOptions?:
      | {
          isLoadingSamples?: boolean;
          values?: Map<string, string>;
        }
      | undefined,
  ): ResultColumnData[] {
    return this.value.columns.map((v) => ({
      id: uuid(),
      name: v.name,
      documentation: v.documentation,
      sampleValues: v.sampleValues ?? sampleValuesOptions?.values?.get(v.name),
      isLoadingSamples: sampleValuesOptions?.isLoadingSamples,
    }));
  }

  *buildSampleValues(): GeneratorFn<void> {
    try {
      const samples = this.value.columns
        .map((e) => e.sampleValues)
        .filter(isNonNullable);
      const info = this.execState.value.info;
      if (samples.length) {
        // if samples have been provided by user we don't do anything;
        return;
      }
      if (!info) {
        return;
      }
      const query = info.query;
      // the query we save here is in pure grammar. We will append the take function for now
      // but as more complex use cases come up we may want to switch and use the protocol
      const takeStatement = `->take(5)`;
      // TODO: params not supported at the moment. We should instead ask the underlying producer of the dataspace to provide
      // param values as part of the executables
      const executeQuery = query + takeStatement;
      let mapping: string | undefined = undefined;
      let runtime: string | undefined = undefined;
      if (info instanceof DataSpaceServiceExecutableInfo) {
        mapping = info.mapping;
        runtime = info.runtime;
      } else if (info instanceof DataSpaceMultiExecutionServiceExecutableInfo) {
        // Not Supported
        this.execState.viewerState.applicationStore.logService.error(
          LogEvent.create(DSL_DATASPACE_EVENT.ERROR_GENERATE_SAMPLE_VALUES),
          'Multi execution services not supported to generate sample values',
        );
        return;
      } else {
        const analysis = this.execState.viewerState.dataSpaceAnalysisResult;
        const executionContextKey = info.executionContextKey
          ? (analysis.executionContextsIndex.get(info.executionContextKey) ??
            analysis.defaultExecutionContext)
          : analysis.defaultExecutionContext;
        mapping = executionContextKey.mapping.path;
        runtime = executionContextKey.defaultRuntime.path;
      }
      this.setGridData(
        this.buildGridData({
          isLoadingSamples: true,
        }),
      );
      const result =
        (yield this.execState.viewerState.graphManagerState.graphManager.runQueryWithUncompiledGraph(
          executeQuery,
          mapping,
          runtime,
          this.execState.viewerState.graphManagerState.graph,
        )) as unknown as ExecutionResultWithMetadata;
      const _result = guaranteeType(result.executionResult, TDSExecutionResult);
      const sampleMap = new Map<string, string>();
      _result.result.columns.forEach((col, colIdx) => {
        const sample = _result.result.rows
          .map((row) => row.values[colIdx])
          .filter(isNonNullable)
          .join(', ');
        if (sample) {
          sampleMap.set(col, sample);
        }
      });
      if (sampleMap.size) {
        this.setGridData(
          this.buildGridData({
            values: sampleMap,
          }),
        );
      } else {
        this.setGridData(this.buildGridData());
      }
    } catch (error) {
      assertErrorThrown(error);
      this.setGridData(this.buildGridData());
      this.execState.viewerState.applicationStore.logService.error(
        LogEvent.create(DSL_DATASPACE_EVENT.ERROR_GENERATE_SAMPLE_VALUES),
        error,
      );
    }
  }
}

export class DataSpaceViewerExecutableState {
  readonly uuid = uuid();
  readonly viewerState: DataSpaceViewerState;
  readonly value: DataSpaceExecutableAnalysisResult;
  resultState: DataSpaceExecutableAnalysisResultState;

  constructor(
    dataSpaceViewerState: DataSpaceViewerState,
    value: DataSpaceExecutableAnalysisResult,
  ) {
    makeObservable(this, {
      resultState: observable,
    });
    this.viewerState = dataSpaceViewerState;
    this.value = value;
    this.resultState = this.buildResultState(value);
  }

  buildResultState(
    value: DataSpaceExecutableAnalysisResult,
  ): DataSpaceExecutableAnalysisResultState {
    if (value.result instanceof DataSpaceExecutableTDSResult) {
      return new DataSpaceExecutableTDSResultState(this, value.result);
    }
    return new DataSpaceExecutableAnalysisResultState(this, value.result);
  }
}
