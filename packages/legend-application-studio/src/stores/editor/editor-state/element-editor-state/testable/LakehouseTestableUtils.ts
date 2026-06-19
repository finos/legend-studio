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

/**
 * Shared utilities for Lakehouse test state:
 * used by both DataProductTestableState and IngestTestableState.
 */

import {
  type Accessor,
  type AccessorOwner,
  type AbstractPureGraphManager,
  type BaseDataResolver,
  DataProduct,
  IngestDefinition,
  RelationElement,
  RelationElementsData,
  RelationRowTestData,
  getAccessorItemLabelForElement,
  observe_RelationElement,
  observe_RelationRowTestData,
  type PackageableElement,
} from '@finos/legend-graph';
import { noop } from '@finos/legend-shared';
import { runInAction } from 'mobx';
import type { EditorStore } from '../../../EditorStore.js';
import { RelationElementsDataState } from '../data/EmbeddedDataState.js';

// ─── Pure helpers ─────────────────────────────────────────────────────────────

export const createEmptyRelationElement = (
  itemId: string,
  columns: string[] = [],
): RelationElement => {
  const row = observe_RelationRowTestData(new RelationRowTestData());
  row.values = columns.map(() => '');
  const relationElement = new RelationElement();
  relationElement.paths = [itemId];
  relationElement.columns = columns;
  relationElement.rows = [row];
  return observe_RelationElement(relationElement);
};

export const buildRelationElementsDataWithColumns = (
  accessors: Accessor[],
): RelationElementsData => {
  const relData = new RelationElementsData();
  relData.relationElements = accessors.map((acc) => {
    const itemId = acc.accessor || 'UNKNOWN';
    const columns = acc.relationType.columns.map((col) => col.name);
    return createEmptyRelationElement(itemId, columns);
  });
  return relData;
};

export const isIngestOrDataProductAccessor = (
  accessor: Accessor,
): accessor is Accessor =>
  accessor.parentElement instanceof DataProduct ||
  accessor.parentElement instanceof IngestDefinition;

export interface ElementDataItem {
  id: string;
  label: string;
}

export const getElementDataItems = (
  element: PackageableElement,
  graphManager: AbstractPureGraphManager,
): ElementDataItem[] => {
  if (element instanceof DataProduct) {
    return element.accessPointGroups
      .flatMap((g) => g.accessPoints)
      .map((ap) => ({ id: ap.id, label: ap.id }));
  }
  if (element instanceof IngestDefinition) {
    return graphManager
      .getIngestDefinitionDatasetNames(element)
      .map((name) => ({ id: name, label: name }));
  }
  return [];
};

// ─── Shared element test data state ──────────────────────────────────────────

/**
 * Wraps a single BaseDataResolver within a test suite's testData array.
 * Shared between DataProduct and Ingest test suite states — both populate
 * test data by wiring BaseDataResolver entries to PackageableElements.
 */
export class LakehouseElementTestDataState {
  readonly testData: BaseDataResolver;
  readonly editorStore: EditorStore;
  readonly relationElementsDataState: RelationElementsDataState | undefined;

  constructor(testData: BaseDataResolver, editorStore: EditorStore) {
    this.testData = testData;
    this.editorStore = editorStore;
    if (testData.data instanceof RelationElementsData) {
      this.relationElementsDataState = new RelationElementsDataState(
        editorStore,
        testData.data,
      );
      this.initAccessorOptions();
    }
  }

  get element(): PackageableElement {
    return this.testData.element.value;
  }

  get itemLabel(): string {
    return getAccessorItemLabelForElement(this.element as AccessorOwner);
  }

  private initAccessorOptions(): void {
    const dataState = this.relationElementsDataState;
    if (!dataState) {
      return;
    }
    this.refreshAccessorOptions(dataState).catch(noop);
    dataState.setRefreshAccessorOptions(() =>
      this.refreshAccessorOptions(dataState),
    );
  }

  private async refreshAccessorOptions(
    dataState: RelationElementsDataState,
  ): Promise<void> {
    const element = this.element;
    const graphManager = this.editorStore.graphManagerState.graphManager;
    const graph = this.editorStore.graphManagerState.graph;
    const items = getElementDataItems(element, graphManager);

    if (items.length === 0) {
      dataState.setAccessorOptions(undefined, undefined);
      return;
    }

    const options = await Promise.all(
      items.map(async (item) => {
        let columns: string[] = [];
        try {
          if (element instanceof IngestDefinition) {
            const accessor =
              await graphManager.createAccessorFromPackageableElement(
                element,
                graph,
                { schemaName: undefined, tableName: item.id },
              );
            if (accessor) {
              columns = accessor.relationType.columns.map((c) => c.name);
            }
          } else if (element instanceof DataProduct) {
            const accessor = await graphManager.buildDataProductAccessor(
              element,
              graph,
              { tableName: item.id },
            );
            if (accessor) {
              columns = accessor.relationType.columns.map((c) => c.name);
            }
          }
        } catch {
          // best-effort column resolution
        }
        return { label: item.label, value: item.id, columns };
      }),
    );

    runInAction(() => {
      dataState.setAccessorOptions(options, this.itemLabel);
      const columnsByItem = new Map(
        options
          .filter((o) => o.columns.length > 0)
          .map((o) => [o.value, o.columns]),
      );
      for (const relState of dataState.relationElementStates) {
        const rel = relState.relationElement;
        if (rel.columns.length === 0) {
          const key = rel.paths[rel.paths.length - 1];
          const cols = key ? columnsByItem.get(key) : undefined;
          if (cols) {
            rel.columns = cols;
          }
        }
      }
    });
  }
}

// ─── Shared interface for TestDataState ───────────────────────────────────────

/**
 * Structural interface satisfied by both DataProductTestDataState and
 * IngestTestDataState. Used to type the shared LakehouseTestDataEditor
 * component without importing the concrete state classes.
 */
export interface LakehouseTestDataStateBase {
  elementTestDataStates: LakehouseElementTestDataState[];
  selectedElementTestDataState: LakehouseElementTestDataState | undefined;
  setSelectedElementTestDataState(
    val: LakehouseElementTestDataState | undefined,
  ): void;
  availableElementsToAdd: PackageableElement[];
  showAddElementModal: boolean;
  setShowAddElementModal(val: boolean): void;
  addElement(path: string): void;
  deleteElement(state: LakehouseElementTestDataState): void;
  editorStore: EditorStore;
}
