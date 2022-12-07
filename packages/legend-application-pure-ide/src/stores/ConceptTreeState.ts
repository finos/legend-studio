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

import { deserialize } from 'serializr';
import { TreeState } from './TreeState.js';
import {
  type ConceptTreeNode,
  ElementConceptAttribute,
  PropertyConceptAttribute,
  ConceptNode,
} from '../server/models/ConceptTree.js';
import { action, flow, flowResult, makeObservable, observable } from 'mobx';
import type { EditorStore } from './EditorStore.js';
import { FileCoordinate } from '../server/models/PureFile.js';
import type { ConceptActivity } from '../server/models/Initialization.js';
import { ActionState, type GeneratorFn } from '@finos/legend-shared';
import type { TreeData } from '@finos/legend-art';

export class ConceptTreeState extends TreeState<ConceptTreeNode, ConceptNode> {
  readonly loadConceptActivity = ActionState.create();
  statusText?: string | undefined;

  constructor(editorStore: EditorStore) {
    super(editorStore);

    makeObservable(this, {
      statusText: observable,
      setStatusText: action,
      pullConceptsActivity: action,
      pollConceptsActivity: flow,
    });
  }

  setStatusText(value: string | undefined): void {
    this.statusText = value;
  }

  async getRootNodes(): Promise<ConceptNode[]> {
    await flowResult(this.pollConceptsActivity());
    return (await this.editorStore.client.getConceptChildren()).map((node) =>
      deserialize(ConceptNode, node),
    );
  }

  buildTreeData(rootNodes: ConceptNode[]): TreeData<ConceptTreeNode> {
    const rootIds: string[] = [];
    const nodes = new Map<string, ConceptTreeNode>();
    rootNodes.forEach((node) => {
      const id = node.li_attr.id;
      rootIds.push(id);
      nodes.set(id, {
        data: node,
        id,
        label: node.text,
        isLoading: false,
      });
    });
    return { rootIds, nodes };
  }

  async getChildNodes(node: ConceptTreeNode): Promise<ConceptNode[]> {
    return (
      await this.editorStore.client.getConceptChildren(node.data.li_attr.pureId)
    ).map((child) => deserialize(ConceptNode, child));
  }

  processChildNodes(node: ConceptTreeNode, childNodes: ConceptNode[]): void {
    const treeData = this.getTreeData();
    const childrenIds: string[] = [];
    childNodes.forEach((childNode) => {
      const id = childNode.li_attr.id;
      childrenIds.push(id);
      treeData.nodes.set(id, {
        data: childNode,
        id,
        label: childNode.text,
        isLoading: false,
      });
    });
    node.childrenIds = childrenIds;
  }

  *openNode(node: ConceptTreeNode): GeneratorFn<void> {
    if (
      node.data.li_attr instanceof PropertyConceptAttribute ||
      node.data.li_attr instanceof ElementConceptAttribute
    ) {
      if (node.data.li_attr.pureType === 'Diagram') {
        yield flowResult(
          this.editorStore.loadDiagram(
            node.data.li_attr.file,
            node.data.li_attr.pureId,
            Number.parseInt(node.data.li_attr.line, 10),
            Number.parseInt(node.data.li_attr.column, 10),
          ),
        );
      } else {
        yield flowResult(
          this.editorStore.loadFile(
            node.data.li_attr.file,
            new FileCoordinate(
              node.data.li_attr.file,
              Number.parseInt(node.data.li_attr.line, 10),
              Number.parseInt(node.data.li_attr.column, 10),
            ),
          ),
        );
      }
    }
  }

  *pollConceptsActivity(): GeneratorFn<void> {
    if (!this.loadConceptActivity.isInInitialState) {
      return;
    }
    this.loadConceptActivity.inProgress();
    this.setStatusText('Loading concepts activity...');
    try {
      yield this.pullConceptsActivity();
    } finally {
      this.setStatusText(undefined);
      this.loadConceptActivity.reset();
    }
  }

  async pullConceptsActivity(): Promise<void> {
    const result =
      (await this.editorStore.client.getConceptActivity()) as unknown as ConceptActivity;
    if (result.text) {
      this.setStatusText(`Preparing - ${result.text}`);
    }
    if (result.initializing) {
      return new Promise((resolve, reject) =>
        setTimeout(() => {
          try {
            resolve(this.pullConceptsActivity());
          } catch (error) {
            reject(error);
          }
        }, 1000),
      );
    }
    return Promise.resolve();
  }
}
