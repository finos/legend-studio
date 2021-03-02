/**
 * Copyright 2020 Goldman Sachs
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

import type { Entity } from '../../../../models/sdlc/models/entity/Entity';
import { EditorStoreProvider } from '../../../../stores/EditorStore';
import { graphFetchData } from './RawGraphFetchTreeTestData';
import {
  unitTest,
  guaranteeNonNullable,
  isNonNullable,
} from '@finos/legend-studio-shared';
import type { RawGraphFetchTreeData } from '../../../../stores/shared/RawGraphFetchTreeUtil';
import {
  getRawGraphFetchTreeData,
  selectMappedGraphFetchProperties,
} from '../../../../stores/shared/RawGraphFetchTreeUtil';
import { renderWithAppContext } from '../../../ComponentTestUtils';
import { RawGraphFetchTreeExplorer } from '../../../editor/aux-panel/RawGraphFetchTreeExplorer';
import { getTestEditorStore } from '../../../../stores/StoreTestUtils';
import { RawPropertyGraphFetchTree } from '../../../../models/metamodels/pure/model/rawValueSpecification/RawGraphFetchTree';

const editorStore = getTestEditorStore();

beforeAll(async () => {
  await editorStore.graphState.graphManager.buildGraph(
    editorStore.graphState.graph,
    graphFetchData as Entity[],
  );
});

test(unitTest('Graph fetch tree explorer and mapped properties'), () => {
  const graph = editorStore.graphState.graph;
  const mapping = graph.getMapping('demo::MyMapping');
  const newPersonClass = graph.getClass('demo::other::NPerson');
  const dummyUpdate = (data: RawGraphFetchTreeData): void => {
    /* do nothing */
  };
  // new person
  const personTree = getRawGraphFetchTreeData(
    editorStore,
    newPersonClass,
    mapping,
  );
  expect(personTree.rootIds).toHaveLength(1);
  const personNode = guaranteeNonNullable(
    personTree.nodes.get(personTree.rootIds[0]),
  );
  expect(personNode.childrenIds).toHaveLength(4);
  const personChildrenNodes = personNode.childrenIds
    .map((id) => personTree.nodes.get(id))
    .filter(isNonNullable);
  personChildrenNodes.forEach((node) => expect(node.isChecked).toBe(false));
  const personMappedProperties = ['fullName', 'name1', 'name3'];
  selectMappedGraphFetchProperties(personTree, personNode);
  personChildrenNodes.forEach((node) => {
    if (
      node.graphFetchTreeNode instanceof RawPropertyGraphFetchTree &&
      personMappedProperties.includes(
        node.graphFetchTreeNode.property.value.name,
      )
    ) {
      expect(node.isChecked).toBe(true);
    } else {
      expect(node.isChecked).toBe(false);
    }
  });
  const personTreeApp = renderWithAppContext(
    // NOTE: when we don't need to use `useEditorStore` in the graph fetch tree explorer,
    // we don't need to use the store provider anymore
    <EditorStoreProvider>
      <RawGraphFetchTreeExplorer
        treeData={personTree}
        updateTreeData={dummyUpdate}
        isReadOnly={false}
        parentMapping={mapping}
      />
    </EditorStoreProvider>,
  );
  personMappedProperties.forEach((p) => personTreeApp.getByText(p));
  // TODO add more checks on app
  // new firm
  const newFirmClass = graph.getClass('demo::other::NFirm');
  const newFirmTree = getRawGraphFetchTreeData(
    editorStore,
    newFirmClass,
    mapping,
  );
  const firmMappedProperties = ['name', 'incType', 'nEmployees'];
  expect(newFirmTree.rootIds).toHaveLength(1);
  const firmNode = guaranteeNonNullable(
    newFirmTree.nodes.get(newFirmTree.rootIds[0]),
  );
  const firmChildrenNodes = firmNode.childrenIds
    .map((id) => newFirmTree.nodes.get(id))
    .filter(isNonNullable);
  firmChildrenNodes.forEach((node) => expect(node.isChecked).toBe(false));
  selectMappedGraphFetchProperties(newFirmTree, firmNode);
  firmChildrenNodes.forEach((node) => {
    if (
      node.graphFetchTreeNode instanceof RawPropertyGraphFetchTree &&
      firmMappedProperties.includes(node.graphFetchTreeNode.property.value.name)
    ) {
      expect(node.isChecked).toBe(true);
    } else {
      expect(node.isChecked).toBe(false);
    }
  });
  const firmTreeApp = renderWithAppContext(
    // NOTE: when we don't need to use `useEditorStore` in the graph fetch tree explorer,
    // we don't need to use the store provider anymore
    <EditorStoreProvider>
      <RawGraphFetchTreeExplorer
        treeData={newFirmTree}
        updateTreeData={dummyUpdate}
        isReadOnly={false}
        parentMapping={mapping}
      />
    </EditorStoreProvider>,
  );
  firmMappedProperties.forEach((property) => firmTreeApp.getByText(property));
  // TODO add more checks on app
});
