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

import { action, computed, makeObservable, observable } from 'mobx';
import {
  DataCubeQueryFilterGroupOperator,
  DataCubeQueryFilterOperator,
  type DataCubeOperationValue,
} from '../core/DataCubeQueryEngine.js';
import type {
  DataCubeQuerySnapshot,
  DataCubeQuerySnapshotColumn,
} from '../core/DataCubeQuerySnapshot.js';
import type { DataCubeQueryFilterOperation } from '../core/filter/DataCubeQueryFilterOperation.js';
import {
  getNonNullableEntry,
  guaranteeNonNullable,
  uuid,
} from '@finos/legend-shared';
import type { DataCubeEditorState } from './DataCubeEditorState.js';
import type { DataCubeState } from '../DataCubeState.js';
import type { DataCubeQueryEditorPanelState } from './DataCubeEditorPanelState.js';
import type { DataCubeConfiguration } from '../core/DataCubeConfiguration.js';

export abstract class DataCubeEditorFilterNode {
  uuid = uuid();
  parentNode: DataCubeEditorFilterConditionGroupNode | undefined;
  not = false;

  constructor(
    parentNode: DataCubeEditorFilterConditionGroupNode | undefined,
    not: boolean | undefined,
  ) {
    makeObservable(this, {
      parentNode: observable,
      not: observable,
      setNot: action,
    });

    this.parentNode = parentNode;
    this.not = Boolean(not);
  }

  setNot(not: boolean) {
    this.not = not;
  }
}

export class DataCubeEditorFilterConditionNode extends DataCubeEditorFilterNode {
  column: DataCubeQuerySnapshotColumn;
  operation: DataCubeQueryFilterOperation;
  value: DataCubeOperationValue | undefined;

  constructor(
    parentNode: DataCubeEditorFilterConditionGroupNode | undefined,
    column: DataCubeQuerySnapshotColumn,
    operation: DataCubeQueryFilterOperation,
    value: DataCubeOperationValue | undefined,
    not: boolean | undefined,
  ) {
    super(parentNode, not);

    makeObservable(this, {
      column: observable,
      setColumn: action,

      operation: observable,
      setOperation: action,

      value: observable.ref,
      setValue: action,
    });

    this.column = column;
    this.value = value;
    this.operation = operation;
  }

  setColumn(col: DataCubeQuerySnapshotColumn) {
    this.column = col;
  }

  setOperation(operation: DataCubeQueryFilterOperation) {
    this.operation = operation;
  }

  setValue(value: DataCubeOperationValue | undefined) {
    this.value = value;
  }
}

export class DataCubeEditorFilterConditionGroupNode extends DataCubeEditorFilterNode {
  children: DataCubeEditorFilterNode[] = [];
  operation = DataCubeQueryFilterGroupOperator.AND;

  constructor(
    parentNode: DataCubeEditorFilterConditionGroupNode | undefined,
    operation: DataCubeQueryFilterGroupOperator,
    not: boolean | undefined,
  ) {
    super(parentNode, not);

    makeObservable(this, {
      children: observable,
      setChildren: action,
      childrenIds: computed,

      operation: observable,
      setOperation: action,
    });

    this.operation = operation;
  }

  get childrenIds(): string[] {
    return this.children.map((child) => child.uuid);
  }

  setChildren(children: DataCubeEditorFilterNode[]) {
    this.children = children;
  }

  setOperation(operation: DataCubeQueryFilterGroupOperator) {
    this.operation = operation;
  }
}

type DataCubeFilterTree = {
  root?: DataCubeEditorFilterConditionGroupNode | undefined;
  nodes: Map<string, DataCubeEditorFilterNode>;
};

export class DataCubeEditorFilterPanelState
  implements DataCubeQueryEditorPanelState
{
  readonly dataCube!: DataCubeState;
  readonly editor!: DataCubeEditorState;
  readonly operations: DataCubeQueryFilterOperation[];

  tree: DataCubeFilterTree;

  constructor(editor: DataCubeEditorState) {
    makeObservable(this, {
      tree: observable.ref,
      initializeTree: action,
      refreshTree: action,
    });

    this.dataCube = editor.dataCube;
    this.editor = editor;
    this.operations = this.dataCube.engine.filterOperations;
    this.tree = {
      nodes: new Map<string, DataCubeEditorFilterNode>(),
    };
  }

  get columns() {
    // TODO: include leaf-extended columns
    return this.editor.columns.sourceColumns;
  }

  private getOperation(operator: string) {
    return guaranteeNonNullable(
      this.operations.find((op) => op.operator === operator),
    );
  }

  initializeTree() {
    if (this.tree.root === undefined && this.tree.nodes.size === 0) {
      const root = new DataCubeEditorFilterConditionGroupNode(
        undefined,
        DataCubeQueryFilterGroupOperator.AND,
        undefined,
      );
      this.tree.nodes.set(root.uuid, root);
      this.tree.root = root;
      if (this.editor.columnProperties.columns.length !== 0) {
        const columnConfig = getNonNullableEntry(
          this.editor.columnProperties.columns,
          0,
        );
        const column = {
          name: columnConfig.name,
          type: columnConfig.type,
        };
        const operation = this.getOperation(DataCubeQueryFilterOperator.EQUAL);
        const condition = new DataCubeEditorFilterConditionNode(
          root,
          column,
          operation,
          operation.generateDefaultValue(column),
          undefined,
        );
        root.children.push(condition);
        this.tree.nodes.set(condition.uuid, condition);
      }
      this.refreshTree();
    }
  }

  refreshTree() {
    this.tree = { ...this.tree };
  }

  applySnaphot(
    snapshot: DataCubeQuerySnapshot,
    configuration: DataCubeConfiguration,
  ): void {
    // throw new Error('Method not implemented.');
  }

  buildSnapshot(
    newSnapshot: DataCubeQuerySnapshot,
    baseSnapshot: DataCubeQuerySnapshot,
  ): void {
    // throw new Error('Method not implemented.');
  }
}
