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

import { ElementEditorState } from './element-editor-state/ElementEditorState.js';
import {
  guaranteeType,
  uuid,
  addUniqueEntry,
  deleteEntry,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import { computed, observable, makeObservable, action } from 'mobx';
import type { EditorStore } from '../EditorStore.js';
import {
  GenerationSpecification,
  type GenerationTreeNode,
  type PackageableElement,
} from '@finos/legend-graph';
import {
  generationSpecification_addNode,
  generationSpecification_deleteGenerationNode,
} from '../../graph-modifier/DSL_Generation_GraphModifierHelper.js';

export interface GenerationSpecNodeDragSource {
  nodeState: GenerationTreeNodeState;
}

export type GenerationSpecNodeDropTarget = GenerationSpecNodeDragSource;
export class GenerationTreeNodeState {
  readonly uuid = uuid();
  node: GenerationTreeNode;

  constructor(node: GenerationTreeNode) {
    this.node = node;
  }
}

export class GenerationSpecificationEditorState extends ElementEditorState {
  isGenerating = false;
  generationTreeNodeStates: GenerationTreeNodeState[] = [];

  constructor(editorStore: EditorStore, element: PackageableElement) {
    super(editorStore, element);

    makeObservable(this, {
      isGenerating: observable,
      generationTreeNodeStates: observable,
      spec: computed,
      deleteGenerationTreeNode: action,
      addGenerationTreeNode: action,
      moveGenerationNode: action,
    });
    this.generationTreeNodeStates = this.spec.generationNodes.map(
      (node) => new GenerationTreeNodeState(node),
    );
  }

  get spec(): GenerationSpecification {
    return guaranteeType(
      this.element,
      GenerationSpecification,
      'Element inside generation specification state must be a generation specification',
    );
  }

  deleteGenerationTreeNode(node: GenerationTreeNode): void {
    generationSpecification_deleteGenerationNode(this.spec, node);
    const nodeState = this.generationTreeNodeStates.find(
      (g) => g.node === node,
    );
    if (nodeState) {
      deleteEntry(this.generationTreeNodeStates, nodeState);
    }
  }

  addGenerationTreeNode(node: GenerationTreeNode): void {
    generationSpecification_addNode(this.spec, node);
    addUniqueEntry(
      this.generationTreeNodeStates,
      new GenerationTreeNodeState(node),
    );
  }

  moveGenerationNode(dragIndex: number, hoverIndex: number): void {
    const dragColumn = guaranteeNonNullable(
      this.generationTreeNodeStates[dragIndex],
    );
    this.generationTreeNodeStates.splice(dragIndex, 1);
    this.generationTreeNodeStates.splice(hoverIndex, 0, dragColumn);
  }

  reprocess(
    newElement: PackageableElement,
    editorStore: EditorStore,
  ): ElementEditorState {
    return new GenerationSpecificationEditorState(editorStore, newElement);
  }
}
