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

import { type GeneratorFn, uniqBy } from '@finos/legend-shared';
import { observable, makeObservable, flow, flowResult } from 'mobx';
import type {
  PureProtocolProcessorPlugin,
  V1_DataProductArtifact,
} from '@finos/legend-graph';
import type { Entity } from '@finos/legend-storage';
import { AbstractSQLPlaygroundState } from './AbstractSQLPlaygroundState.js';
import {
  SQLPlaygroundAccessorExplorerState,
  AccessorExplorerTreeHeaderNodeData,
  AccessorExplorerTreeAccessPointGroupNodeData,
} from './SqlPlaygroundAccessorExplorerState.js';

export const DEFAULT_SQL_TEXT = `--Start building your SQL\n`;

export const buildDefaultDataProductQuery = (
  dataProductPath: string,
  accessPointId: string | undefined,
): string => {
  const identifier = accessPointId
    ? `${dataProductPath}.${accessPointId}`
    : dataProductPath;
  return `SELECT * FROM p('${identifier}') LIMIT 100`;
};

export const buildDefaultIngestQuery = (
  ingestPath: string,
  datasetName: string | undefined,
): string => {
  const identifier = datasetName ? `${ingestPath}.${datasetName}` : ingestPath;
  return `SELECT * FROM i('${identifier}') LIMIT 100`;
};

export class LegendSQLPlaygroundState extends AbstractSQLPlaygroundState {
  accessorExplorerState?: SQLPlaygroundAccessorExplorerState | undefined;

  constructor() {
    super();
    makeObservable(this, {
      accessorExplorerState: observable,
      initializeExplorer: flow,
    });
    this.sqlEditorTextModel.setValue(DEFAULT_SQL_TEXT);
  }

  setSQLQuery(query: string): void {
    this.sqlText = query;
    this.sqlEditorTextModel.setValue(query);
  }

  getSelectedSQL(): string {
    let sql = this.sqlText;
    const currentSelection = this.sqlEditor?.getSelection();
    if (currentSelection) {
      const selectionValue =
        this.sqlEditorTextModel.getValueInRange(currentSelection);
      if (selectionValue.trim() !== '') {
        sql = selectionValue;
      }
    }
    return sql;
  }

  *initializeExplorer(
    entities: Entity[],
    plugins: PureProtocolProcessorPlugin[],
    fetchDataProductArtifact: (
      dataProductPath: string,
    ) => Promise<V1_DataProductArtifact | undefined>,
  ): GeneratorFn<void> {
    if (this.accessorExplorerState) {
      return;
    }
    this.accessorExplorerState = new SQLPlaygroundAccessorExplorerState(
      entities,
      plugins,
      fetchDataProductArtifact,
    );
    yield flowResult(this.accessorExplorerState.fetchProjectData());
  }

  override getCodeCompletionSuggestions(): string[] {
    const base = super.getCodeCompletionSuggestions();
    if (this.accessorExplorerState?.treeData) {
      const nodeLabels = uniqBy(
        Array.from(this.accessorExplorerState.treeData.nodes.values())
          .filter(
            (node) =>
              !(node instanceof AccessorExplorerTreeHeaderNodeData) &&
              !(node instanceof AccessorExplorerTreeAccessPointGroupNodeData),
          )
          .map((node) => node.label),
        (label) => label,
      );
      return base.concat(nodeLabels);
    }
    return base;
  }

  registerCommands(): void {}
  deregisterCommands(): void {}
  *executeRawSQL(): GeneratorFn<void> {}
}
