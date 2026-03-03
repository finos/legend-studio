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
  type GeneratorFn,
  assertErrorThrown,
  LogEvent,
  csvStringify,
} from '@finos/legend-shared';
import { observable, makeObservable, flow, flowResult } from 'mobx';
import {
  type PackageableElement,
  V1_DataProductArtifact,
  DataProduct,
  IngestDefinition,
  type TEMPORARY_IngestContent,
  type ArtifactGenerationExtensionResult,
  TDSExecutionResult,
  type RawLambda,
  type ExecutionResultWithMetadata,
  LakehouseRuntime,
  GRAPH_MANAGER_EVENT,
} from '@finos/legend-graph';
import type { EditorStore } from './EditorStore.js';
import {
  LegendSQLPlaygroundState,
  DEFAULT_SQL_TEXT,
  buildDefaultDataProductQuery,
  buildDefaultIngestQuery,
} from '@finos/legend-query-builder';

const DATA_PRODUCT_ARTIFACT_EXTENSION = 'dataProduct';

export class LegendSQLStudioPlaygroundState extends LegendSQLPlaygroundState {
  readonly editorStore: EditorStore;
  targetElement?: PackageableElement | undefined;
  isOpen = false;

  constructor(editorStore: EditorStore) {
    super();
    makeObservable(this, {
      targetElement: observable,
      isOpen: observable,
      executeRawSQL: flow,
      initializeAccessorExplorer: flow,
    });
    this.editorStore = editorStore;
  }

  open(element: PackageableElement): void {
    this.isOpen = true;
    this.targetElement = element;
    this.accessorExplorerState = undefined;
    flowResult(this.initializeAccessorExplorer()).catch(
      this.editorStore.applicationStore.alertUnhandledError,
    );
    if (element instanceof DataProduct) {
      const firstAccessPointId =
        element.accessPointGroups[0]?.accessPoints[0]?.id;
      this.setSQLQuery(
        `${DEFAULT_SQL_TEXT}${buildDefaultDataProductQuery(element.path, firstAccessPointId)}`,
      );
    } else if (element instanceof IngestDefinition) {
      const content = element.content as unknown as
        | TEMPORARY_IngestContent
        | undefined;
      const firstDatasetName = content?.datasets?.[0]?.name;
      this.setSQLQuery(
        `${DEFAULT_SQL_TEXT}${buildDefaultIngestQuery(element.path, firstDatasetName)}`,
      );
    } else {
      this.setSQLQuery(DEFAULT_SQL_TEXT);
    }
  }

  close(): void {
    this.isOpen = false;
    this.targetElement = undefined;
    this.accessorExplorerState = undefined;
    this.setSQLQuery(DEFAULT_SQL_TEXT);
  }

  *initializeAccessorExplorer(): GeneratorFn<void> {
    if (this.accessorExplorerState || !this.targetElement) {
      return;
    }
    try {
      const entities = this.editorStore.graphManagerState.graph.allElements
        .filter(
          (element) =>
            element instanceof DataProduct ||
            element instanceof IngestDefinition,
        )
        .map((element) =>
          this.editorStore.graphManagerState.graphManager.elementToEntity(
            element,
          ),
        );

      yield flowResult(
        this.initializeExplorer(
          entities,
          this.editorStore.graphManagerState.graphManager.pluginManager.getPureProtocolProcessorPlugins(),
          (path) => this.fetchDataProductArtifact(path),
        ),
      );
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(GRAPH_MANAGER_EVENT.EXECUTION_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
    }
  }

  private async fetchDataProductArtifact(
    dataProductPath: string,
  ): Promise<V1_DataProductArtifact | undefined> {
    try {
      const generatedArtifacts =
        (await this.editorStore.graphManagerState.graphManager.generateArtifacts(
          this.editorStore.graphManagerState.graph,
          this.editorStore.graphEditorMode.getGraphTextInputOption(),
          [dataProductPath],
        )) as unknown as ArtifactGenerationExtensionResult;

      const dataProductArtifactResults = generatedArtifacts.values.filter(
        (artifact) => artifact.extension === DATA_PRODUCT_ARTIFACT_EXTENSION,
      );

      for (const artifactResult of dataProductArtifactResults) {
        for (const artifactByElement of artifactResult.artifactsByExtensionElements) {
          const dataProductContent = artifactByElement.files[0]?.content;
          if (dataProductContent) {
            return V1_DataProductArtifact.serialization.fromJson(
              JSON.parse(dataProductContent),
            );
          }
        }
      }
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.notificationService.notifyError(
        `Error fetching artifact for ${dataProductPath}: ${error}`,
      );
    }
    return undefined;
  }

  override *executeRawSQL(): GeneratorFn<void> {
    if (this.executeRawSQLState.isInProgress || !this.targetElement) {
      return;
    }
    try {
      this.executeRawSQLState.inProgress();
      const sql = this.getSelectedSQL();
      const start = Date.now();
      const sqlQuery = `#SQL{${sql}}#`;

      const runtimes = this.editorStore.graphManagerState.graph.ownRuntimes;
      const packageableRuntime = runtimes[0];
      if (!packageableRuntime) {
        this.editorStore.applicationStore.notificationService.notifyError(
          new Error('No runtime found in the graph'),
        );
        return;
      }
      if (!(packageableRuntime.runtimeValue instanceof LakehouseRuntime)) {
        this.editorStore.applicationStore.notificationService.notifyError(
          new Error('Runtime must be a LakehouseRuntime'),
        );
        return;
      }
      const runtime = packageableRuntime.runtimeValue;
      const queryToExecute = `${sqlQuery}->from(${packageableRuntime.path})`;

      const lambda =
        (yield this.editorStore.graphManagerState.graphManager.pureCodeToLambda(
          queryToExecute,
        )) as RawLambda;

      const executionResult =
        (yield this.editorStore.graphManagerState.graphManager.runQuery(
          lambda,
          undefined,
          runtime,
          this.editorStore.graphManagerState.graph,
        )) as ExecutionResultWithMetadata;

      const result = executionResult.executionResult;
      if (result instanceof TDSExecutionResult) {
        const data = result.result.rows.map((row) => row.values);
        const csvData = csvStringify([result.result.columns, ...data]);
        this.setSqlExecutionResult({
          value: csvData,
          sqlDuration: Date.now() - start,
        });
      } else {
        this.editorStore.applicationStore.notificationService.notifyError(
          'Expected TDS execution result, got unsupported result type',
        );
      }
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(GRAPH_MANAGER_EVENT.EXECUTION_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
    } finally {
      this.executeRawSQLState.complete();
    }
  }
}
