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
  ConceptType,
} from '../server/models/ConceptTree.js';
import { action, flow, flowResult, makeObservable, observable } from 'mobx';
import type { EditorStore } from './EditorStore.js';
import { FileCoordinate } from '../server/models/File.js';
import type { ConceptActivity } from '../server/models/Initialization.js';
import {
  ActionState,
  assertErrorThrown,
  assertTrue,
  assertType,
  guaranteeNonNullable,
  type GeneratorFn,
} from '@finos/legend-shared';
import type { TreeData } from '@finos/legend-art';
import {
  FIND_USAGE_FUNCTION_PATH,
  PackageableElementUsage,
  type Usage,
} from '../server/models/Usage.js';
import type { ChildPackageableElementInfo } from '../server/models/MovePackageableElements.js';
import {
  ELEMENT_PATH_DELIMITER,
  extractPackagePathFromPath,
} from '@finos/legend-graph';

export class ConceptTreeState extends TreeState<ConceptTreeNode, ConceptNode> {
  readonly loadConceptActivity = ActionState.create();

  statusText?: string | undefined;
  nodeForRenameConcept?: ConceptTreeNode | undefined;

  constructor(editorStore: EditorStore) {
    super(editorStore);

    makeObservable(this, {
      statusText: observable,
      nodeForRenameConcept: observable,
      setStatusText: action,
      setNodeForRenameConcept: action,
      pullConceptsActivity: action,
      pollConceptsActivity: flow,
    });
  }

  setStatusText(value: string | undefined): void {
    this.statusText = value;
  }

  setNodeForRenameConcept(value: ConceptTreeNode | undefined): void {
    this.nodeForRenameConcept = value;
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
        parent: node,
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

  async renameConcept(node: ConceptTreeNode, newName: string): Promise<void> {
    const attr = node.data.li_attr;
    const oldName = attr.pureName ?? attr.pureId;
    let usages: Usage[] = [];
    try {
      this.editorStore.applicationStore.setBlockingAlert({
        message: 'Finding concept usages...',
        showLoading: true,
      });
      switch (attr.pureType) {
        case ConceptType.PROPERTY:
        case ConceptType.QUALIFIED_PROPERTY: {
          assertType(attr, PropertyConceptAttribute);
          usages = await this.editorStore.findConceptUsages(
            FIND_USAGE_FUNCTION_PATH.PROPERTY,
            [`'${attr.classPath}'`, `'${attr.pureId}'`],
          );
          break;
        }
        case ConceptType.PACKAGE: {
          const newPackage =
            extractPackagePathFromPath(oldName)
              ?.concat(ELEMENT_PATH_DELIMITER)
              .concat(newName) ?? newName;

          let elementsUsage: PackageableElementUsage[] = [];
          let childElementsInfo: ChildPackageableElementInfo[] = [];
          try {
            childElementsInfo =
              await this.editorStore.client.getChildPackageableElements(
                oldName,
              );
            elementsUsage = (
              await this.editorStore.client.getPackageableElementsUsage(
                childElementsInfo.map((info) => info.pureId),
              )
            ).map((usage) => deserialize(PackageableElementUsage, usage));
          } catch {
            this.editorStore.applicationStore.notifyError(
              `Can't find usage for child packageable elements`,
            );
            return;
          }
          this.editorStore.applicationStore.setBlockingAlert(undefined);
          const inputs = [];
          assertTrue(
            elementsUsage.length === childElementsInfo.length,
            `Can't find matching usages for child packageable elements`,
          );
          for (let i = 0; i < elementsUsage.length; ++i) {
            const elementInfo = guaranteeNonNullable(childElementsInfo[i]);
            const sourcePackage = guaranteeNonNullable(
              extractPackagePathFromPath(elementInfo.pureId),
            );
            const destinationPackage = newPackage.concat(
              sourcePackage.substring(
                sourcePackage.indexOf(oldName) + oldName.length,
              ),
            );
            inputs.push({
              pureName: elementInfo.pureName,
              pureType: elementInfo.pureType,
              sourcePackage,
              destinationPackage,
              usages: guaranteeNonNullable(elementsUsage[i]).second,
            });
          }
          await flowResult(this.editorStore.movePackageableElements(inputs));
          return;
        }

        default: {
          usages = await this.editorStore.findConceptUsages(
            FIND_USAGE_FUNCTION_PATH.ELEMENT,
            [`'${attr.pureId}'`],
          );
          break;
        }
      }
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.notifyError(error);
      return;
    } finally {
      this.editorStore.applicationStore.setBlockingAlert(undefined);
    }
    await flowResult(
      this.editorStore.renameConcept(oldName, newName, attr.pureType, usages),
    );
  }
}
