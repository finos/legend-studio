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
import { guaranteeType, uuid } from '@finos/legend-shared';
import { computed, makeObservable, action } from 'mobx';
import type { EditorStore } from '../EditorStore.js';
import {
  GenerationSpecification,
  GenerationTreeNode,
  PackageableElementExplicitReference,
  type PackageableElement,
  type PackageableElementReference,
} from '@finos/legend-graph';
import {
  generationSpecification_addNode,
  generationSpecification_addNodeAt,
  generationSpecification_deleteGenerationNode,
  generationSpecification_moveNode,
  generationTreeNode_addGenerationElement,
  generationTreeNode_deleteGenerationElement,
} from '../../graph-modifier/DSL_Generation_GraphModifierHelper.js';

/**
 * A card being dragged from one stage to another, or out into a stage of its own.
 */
export interface GenerationSpecElementDragSource {
  node: GenerationTreeNode;
  elementRef: PackageableElementReference<PackageableElement>;
}

/**
 * An element being dragged in from the palette.
 */
export interface GenerationSpecPaletteElementDragSource {
  element: PackageableElement;
}

export const GENERATION_SPEC_ELEMENT_CARD_DND_TYPE =
  'GENERATION_SPEC_ELEMENT_CARD';
export const GENERATION_SPEC_PALETTE_ELEMENT_DND_TYPE =
  'GENERATION_SPEC_PALETTE_ELEMENT';
export const GENERATION_SPEC_PALETTE_FILE_GENERATION_DND_TYPE =
  'GENERATION_SPEC_PALETTE_FILE_GENERATION';

/**
 * Stable identity for a stage, so React keeps a lane's DOM across reorders. A node is identified by
 * the metamodel object it renders, never by its index or its id, since ids may collide.
 */
export class GenerationTreeNodeState {
  readonly uuid = uuid();
  readonly node: GenerationTreeNode;

  constructor(node: GenerationTreeNode) {
    this.node = node;
  }
}

export class GenerationSpecificationEditorState extends ElementEditorState {
  /**
   * Lane states are derived from the specification rather than copied, so a node added from
   * anywhere else (creating a model generation element, for one) shows up in an open editor, and a
   * reorder cannot drift from the order that gets saved.
   */
  private readonly nodeStateIndex = new Map<
    GenerationTreeNode,
    GenerationTreeNodeState
  >();

  constructor(editorStore: EditorStore, element: PackageableElement) {
    super(editorStore, element);

    makeObservable(this, {
      spec: computed,
      generationTreeNodeStates: computed,
      stageCount: computed,
      elementUsageIndex: computed,
      addElementToStage: action,
      addElementAsNewStage: action,
      moveElementToStage: action,
      moveElementToNewStage: action,
      deleteElement: action,
      moveStage: action,
      deleteGenerationTreeNode: action,
      addGenerationTreeNode: action,
    });
  }

  get spec(): GenerationSpecification {
    return guaranteeType(
      this.element,
      GenerationSpecification,
      'Element inside generation specification state must be a generation specification',
    );
  }

  get generationTreeNodeStates(): GenerationTreeNodeState[] {
    return this.spec.generationNodes.map((node) => {
      const existingState = this.nodeStateIndex.get(node);
      if (existingState) {
        return existingState;
      }
      const nodeState = new GenerationTreeNodeState(node);
      this.nodeStateIndex.set(node, nodeState);
      return nodeState;
    });
  }

  get stageCount(): number {
    return this.spec.generationNodes.length;
  }

  /**
   * How many stages each element appears in. The same element in two stages is legal - engine warns
   * and the first result wins - so the palette marks it rather than hiding it.
   */
  get elementUsageIndex(): Map<string, number> {
    const index = new Map<string, number>();
    this.spec.generationNodes.forEach((node) =>
      node.generationElements.forEach((elementRef) => {
        const path = elementRef.value.path;
        index.set(path, (index.get(path) ?? 0) + 1);
      }),
    );
    return index;
  }

  /**
   * An id for a stage the editor creates: the default derived from its elements, kept distinct from
   * the ids already in the specification.
   */
  private buildNodeId(
    elementRefs: PackageableElementReference<PackageableElement>[],
  ): string {
    const defaultId = GenerationTreeNode.buildDefaultId(elementRefs);
    const takenIds = new Set(this.spec.generationNodes.map((node) => node.id));
    if (!takenIds.has(defaultId)) {
      return defaultId;
    }
    let counter = 2;
    while (takenIds.has(`${defaultId} (${counter})`)) {
      counter++;
    }
    return `${defaultId} (${counter})`;
  }

  nodeHoldsElement(
    node: GenerationTreeNode,
    element: PackageableElement,
  ): boolean {
    return node.generationElements.some(
      (elementRef) => elementRef.value.path === element.path,
    );
  }

  /**
   * Two elements of one stage generate against the same graph, so two of them writing the same
   * output is a hard failure rather than engine's warning: the same element cannot join a stage twice.
   */
  addElementToStage(
    node: GenerationTreeNode,
    element: PackageableElement,
  ): void {
    if (this.nodeHoldsElement(node, element)) {
      this.editorStore.applicationStore.notificationService.notifyWarning(
        `'${element.path}' is already in this stage`,
      );
      return;
    }
    generationTreeNode_addGenerationElement(node, element);
  }

  addElementAsNewStage(element: PackageableElement, index?: number): void {
    const elementRefs = [PackageableElementExplicitReference.create(element)];
    const node = GenerationTreeNode.createGroup(
      elementRefs,
      this.buildNodeId(elementRefs),
    );
    if (index === undefined) {
      generationSpecification_addNode(this.spec, node);
    } else {
      generationSpecification_addNodeAt(this.spec, node, index);
    }
  }

  moveElementToStage(
    sourceNode: GenerationTreeNode,
    elementRef: PackageableElementReference<PackageableElement>,
    targetNode: GenerationTreeNode,
  ): void {
    if (sourceNode === targetNode) {
      return;
    }
    if (this.nodeHoldsElement(targetNode, elementRef.value)) {
      this.editorStore.applicationStore.notificationService.notifyWarning(
        `'${elementRef.value.path}' is already in that stage`,
      );
      return;
    }
    this.removeElement(sourceNode, elementRef);
    generationTreeNode_addGenerationElement(targetNode, elementRef.value);
  }

  /**
   * Puts an element in a stage of its own. Without an index that stage goes directly after the one
   * the element came from, so it still runs before anything that used to follow it.
   */
  moveElementToNewStage(
    sourceNode: GenerationTreeNode,
    elementRef: PackageableElementReference<PackageableElement>,
    index?: number,
  ): void {
    const sourceIndex = this.spec.generationNodes.indexOf(sourceNode);
    const sourceStageDissolves = sourceNode.generationElements.length === 1;
    let insertIndex = index ?? sourceIndex + 1;
    if (
      sourceStageDissolves &&
      (insertIndex === sourceIndex || insertIndex === sourceIndex + 1)
    ) {
      // the element is alone in its stage and the new stage would land where it already is
      return;
    }
    this.removeElement(sourceNode, elementRef);
    if (sourceStageDissolves && insertIndex > sourceIndex) {
      // the stage it came from went with it, so everything after it shifted up by one
      insertIndex--;
    }
    const elementRefs = [elementRef];
    generationSpecification_addNodeAt(
      this.spec,
      GenerationTreeNode.createGroup(
        elementRefs,
        this.buildNodeId(elementRefs),
      ),
      insertIndex,
    );
  }

  deleteElement(
    node: GenerationTreeNode,
    elementRef: PackageableElementReference<PackageableElement>,
  ): void {
    this.removeElement(node, elementRef);
  }

  /**
   * A stage exists only while something is in it: the last card leaving dissolves the stage and its
   * divider, which is also how two stages get merged. The grammar cannot write an empty node.
   */
  private removeElement(
    node: GenerationTreeNode,
    elementRef: PackageableElementReference<PackageableElement>,
  ): void {
    this.editorStore.graphState.graphGenerationState.clearModelGenerationFailure(
      node,
      elementRef,
    );
    generationTreeNode_deleteGenerationElement(node, elementRef);
    if (!node.generationElements.length) {
      this.deleteGenerationTreeNode(node);
    }
  }

  moveStage(fromIndex: number, toIndex: number): void {
    generationSpecification_moveNode(this.spec, fromIndex, toIndex);
  }

  deleteGenerationTreeNode(node: GenerationTreeNode): void {
    generationSpecification_deleteGenerationNode(this.spec, node);
    this.nodeStateIndex.delete(node);
  }

  addGenerationTreeNode(node: GenerationTreeNode): void {
    generationSpecification_addNode(this.spec, node);
  }

  reprocess(
    newElement: PackageableElement,
    editorStore: EditorStore,
  ): ElementEditorState {
    return new GenerationSpecificationEditorState(editorStore, newElement);
  }
}
