/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React from 'react';
import 'jest-extended';
import { ApplicationStore } from 'Stores/ApplicationStore';
import { EditorStore } from 'Stores/EditorStore';
import { Entity } from 'SDLC/entity/Entity';
import { graphFetchData } from './GraphFetchTreeData';
import { createBrowserHistory } from 'history';
import { unit } from 'Utilities/TestUtil';
import { getGraphFetchTreeData, GraphFetchTreeData, selectMappedGraphFetchProperties } from 'Utilities/GraphFetchTreeUtil';
import { renderWithAppContext } from 'Components/__tests__/ComponentTestUtil';
import { GraphFetchTreeExplorer } from 'Components/editor/aux-panel/GraphFetchTreeExplorer';
import { guaranteeNonNullable, isNonNullable } from 'Utilities/GeneralUtil';
import { PropertyGraphFetchTree } from 'MM/model/valueSpecification/raw/graph/GraphFetchTree';
const applicationStore = new ApplicationStore(createBrowserHistory());
const editorStore = new EditorStore(applicationStore);

beforeAll(async () => {
  await editorStore.graphState.graphManager.build(editorStore.graphState.graph, graphFetchData as Entity[]);
});

test(unit('Graph fetch tree explorer and mapped properties'), () => {
  const graph = editorStore.graphState.graph;
  const mapping = graph.getMapping('demo::MyMapping');
  const newPersonClass = graph.getClass('demo::other::NPerson');
  const dummyUpdate = (data: GraphFetchTreeData): void => { // empty
  };
  // new person
  const personTree = getGraphFetchTreeData(newPersonClass);
  expect(personTree.rootIds).toHaveLength(1);
  const personNode = guaranteeNonNullable(personTree.nodes.get(personTree.rootIds[0]));
  expect(personNode.childrenIds).toHaveLength(4);
  const personChildrenNodes = personNode?.childrenIds?.map(c => personTree.nodes.get(c)).filter(isNonNullable) ?? [];
  personChildrenNodes.forEach(n => expect(n.isChecked).toBeFalse());
  const personMappedProperties = ['fullName', 'name1', 'name3'];
  selectMappedGraphFetchProperties(personTree, personNode, mapping);
  personChildrenNodes.forEach(n => {
    if (n.graphFetchTreeNode instanceof PropertyGraphFetchTree && personMappedProperties.includes(n.graphFetchTreeNode.property.value.name)) {
      expect(n.isChecked).toBeTrue();
    } else {
      expect(n.isChecked).toBeFalse();
    }
  });
  const personTreeApp = renderWithAppContext(<GraphFetchTreeExplorer
    treeData={personTree}
    updateTreeData={dummyUpdate}
    isReadOnly={false}
    parentMapping={mapping} />);
  personMappedProperties.forEach(p => personTreeApp.getByText(p));
  // TODO add more checks on app
  // new firm
  const newFirmClass = graph.getClass('demo::other::NFirm');
  const newFirmTree = getGraphFetchTreeData(newFirmClass);
  const firmMappedProperties = ['name', 'incType'];
  expect(newFirmTree.rootIds).toHaveLength(1);
  const firmNode = guaranteeNonNullable(newFirmTree.nodes.get(newFirmTree.rootIds[0]));
  const firmChildrrenNodes = firmNode?.childrenIds?.map(c => newFirmTree.nodes.get(c)).filter(isNonNullable) ?? [];
  firmChildrrenNodes.forEach(n => expect(n.isChecked).toBeFalse());
  selectMappedGraphFetchProperties(newFirmTree, firmNode, mapping);
  firmChildrrenNodes.forEach(n => {
    if (n.graphFetchTreeNode instanceof PropertyGraphFetchTree && firmMappedProperties.includes(n.graphFetchTreeNode.property.value.name)) {
      expect(n.isChecked).toBeTrue();
    } else {
      expect(n.isChecked).toBeFalse();
    }
  });
  const firrmTreeApp = renderWithAppContext(<GraphFetchTreeExplorer
    treeData={newFirmTree}
    updateTreeData={dummyUpdate}
    isReadOnly={false}
    parentMapping={mapping} />);
  firmMappedProperties.forEach(p => firrmTreeApp.getByText(p));
  // TODO add more checks on app
});
