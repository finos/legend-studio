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

import { observable, action, computed, flow, makeObservable } from 'mobx';
import { CORE_LOG_EVENT } from '../../../../utils/Logger';
import { PRIMITIVE_TYPE } from '../../../../models/MetaModelConst';
import type { EditorStore } from '../../../EditorStore';
import { MappingElementState } from './MappingElementState';
import { PureInstanceSetImplementationState } from './PureInstanceSetImplementationState';
import { ElementEditorState } from '../../../editor-state/element-editor-state/ElementEditorState';
import { MappingTestState, TEST_RESULT } from './MappingTestState';
import { createMockDataForMappingElementSource } from '../../../shared/MockDataUtil';
import { fromElementPathToMappingElementId } from '../../../../models/MetaModelUtility';
import {
  IllegalStateError,
  isNonNullable,
  assertNonNullable,
  guaranteeNonNullable,
  guaranteeType,
  UnsupportedOperationError,
  assertTrue,
  getClass,
  addUniqueEntry,
} from '@finos/legend-studio-shared';
import { MappingExecutionState } from './MappingExecutionState';
import {
  FlatDataInstanceSetImplementationState,
  RootFlatDataInstanceSetImplementationState,
  EmbeddedFlatDataInstanceSetImplementationState,
} from './FlatDataInstanceSetImplementationState';
import type { TreeNodeData, TreeData } from '@finos/legend-studio-components';
import { UnsupportedInstanceSetImplementationState } from './UnsupportedInstanceSetImplementationState';
import type { CompilationError } from '../../../../models/metamodels/pure/action/EngineError';
import { getElementCoordinates } from '../../../../models/metamodels/pure/action/EngineError';
import { Class } from '../../../../models/metamodels/pure/model/packageableElements/domain/Class';
import { Enumeration } from '../../../../models/metamodels/pure/model/packageableElements/domain/Enumeration';
import type {
  MappingElement,
  MappingElementSource,
} from '../../../../models/metamodels/pure/model/packageableElements/mapping/Mapping';
import {
  Mapping,
  MAPPING_ELEMENT_TYPE,
  getMappingElementType,
  getMappingElementTarget,
  getMappingElementSource,
} from '../../../../models/metamodels/pure/model/packageableElements/mapping/Mapping';
import { EnumerationMapping } from '../../../../models/metamodels/pure/model/packageableElements/mapping/EnumerationMapping';
import { SetImplementation } from '../../../../models/metamodels/pure/model/packageableElements/mapping/SetImplementation';
import { PureInstanceSetImplementation } from '../../../../models/metamodels/pure/model/packageableElements/store/modelToModel/mapping/PureInstanceSetImplementation';
import type { PackageableElement } from '../../../../models/metamodels/pure/model/packageableElements/PackageableElement';
import type { Type } from '../../../../models/metamodels/pure/model/packageableElements/domain/Type';
import { MappingTest } from '../../../../models/metamodels/pure/model/packageableElements/mapping/MappingTest';
import { ExpectedOutputMappingTestAssert } from '../../../../models/metamodels/pure/model/packageableElements/mapping/ExpectedOutputMappingTestAssert';
import {
  ObjectInputData,
  ObjectInputType,
} from '../../../../models/metamodels/pure/model/packageableElements/store/modelToModel/mapping/ObjectInputData';
import { FlatDataInstanceSetImplementation } from '../../../../models/metamodels/pure/model/packageableElements/store/flatData/mapping/FlatDataInstanceSetImplementation';
import type { InstanceSetImplementation } from '../../../../models/metamodels/pure/model/packageableElements/mapping/InstanceSetImplementation';
import { EmbeddedFlatDataPropertyMapping } from '../../../../models/metamodels/pure/model/packageableElements/store/flatData/mapping/EmbeddedFlatDataPropertyMapping';
import type { AbstractFlatDataPropertyMapping } from '../../../../models/metamodels/pure/model/packageableElements/store/flatData/mapping/AbstractFlatDataPropertyMapping';
import type { InputData } from '../../../../models/metamodels/pure/model/packageableElements/mapping/InputData';
import { FlatDataInputData } from '../../../../models/metamodels/pure/model/packageableElements/store/flatData/mapping/FlatDataInputData';
import { RootFlatDataRecordType } from '../../../../models/metamodels/pure/model/packageableElements/store/flatData/model/FlatDataDataType';
import {
  PackageableElementExplicitReference,
  OptionalPackageableElementExplicitReference,
} from '../../../../models/metamodels/pure/model/packageableElements/PackageableElementReference';
import { RootFlatDataRecordTypeExplicitReference } from '../../../../models/metamodels/pure/model/packageableElements/store/flatData/model/RootFlatDataRecordTypeReference';
import { RootRelationalInstanceSetImplementation } from '../../../../models/metamodels/pure/model/packageableElements/store/relational/mapping/RootRelationalInstanceSetImplementation';
import { EmbeddedRelationalInstanceSetImplementation } from '../../../../models/metamodels/pure/model/packageableElements/store/relational/mapping/EmbeddedRelationalInstanceSetImplementation';
import { AggregationAwareSetImplementation } from '../../../../models/metamodels/pure/model/packageableElements/mapping/aggregationAware/AggregationAwareSetImplementation';
import { RootRelationalInstanceSetImplementationState } from './relational/RelationalInstanceSetImplementationState';
import { Table } from '../../../../models/metamodels/pure/model/packageableElements/store/relational/model/Table';
import { View } from '../../../../models/metamodels/pure/model/packageableElements/store/relational/model/View';
import { TableAlias } from '../../../../models/metamodels/pure/model/packageableElements/store/relational/model/RelationalOperationElement';
import { TableExplicitReference } from '../../../../models/metamodels/pure/model/packageableElements/store/relational/model/TableReference';
import { ViewExplicitReference } from '../../../../models/metamodels/pure/model/packageableElements/store/relational/model/ViewReference';
import {
  RelationalInputData,
  RelationalInputType,
} from '../../../../models/metamodels/pure/model/packageableElements/store/relational/mapping/RelationalInputData';
import { OperationSetImplementation } from '../../../../models/metamodels/pure/model/packageableElements/mapping/OperationSetImplementation';

export interface MappingElementTreeNodeData extends TreeNodeData {
  mappingElement: MappingElement;
}

const constructMappingElementNodeData = (
  mappingElement: MappingElement,
): MappingElementTreeNodeData => ({
  id: `${mappingElement.id.value}`,
  mappingElement: mappingElement,
  label: mappingElement.label.value,
});

const getMappingElementTreeNodeData = (
  mappingElement: MappingElement,
): MappingElementTreeNodeData => {
  const nodeData: MappingElementTreeNodeData =
    constructMappingElementNodeData(mappingElement);
  if (
    mappingElement instanceof FlatDataInstanceSetImplementation ||
    mappingElement instanceof EmbeddedFlatDataPropertyMapping
  ) {
    const embedded = mappingElement.propertyMappings.filter(
      (
        me: AbstractFlatDataPropertyMapping,
      ): me is EmbeddedFlatDataPropertyMapping =>
        me instanceof EmbeddedFlatDataPropertyMapping,
    );
    nodeData.childrenIds = embedded.map(
      (e) => `${nodeData.id}.${e.property.value.name}`,
    );
  }
  return nodeData;
};

const getMappingIdentitySortString = (
  me: MappingElement,
  type: PackageableElement,
): string => `${type.name}-${type.path}-${me.id.value}`;

const getMappingElementTreeData = (
  mapping: Mapping,
): TreeData<MappingElementTreeNodeData> => {
  const rootIds: string[] = [];
  const nodes = new Map<string, MappingElementTreeNodeData>();
  const rootMappingElements = mapping
    .getAllMappingElements()
    .sort((a, b) =>
      getMappingIdentitySortString(a, getMappingElementTarget(a)).localeCompare(
        getMappingIdentitySortString(b, getMappingElementTarget(b)),
      ),
    );
  rootMappingElements.forEach((mappingElement) => {
    const mappingElementTreeNodeData =
      getMappingElementTreeNodeData(mappingElement);
    addUniqueEntry(rootIds, mappingElementTreeNodeData.id);
    nodes.set(mappingElementTreeNodeData.id, mappingElementTreeNodeData);
  });
  return { rootIds, nodes };
};

const reprocessMappingElement = (
  mappingElement: MappingElement,
  treeNodes: Map<string, MappingElementTreeNodeData>,
  openNodes: string[],
): MappingElementTreeNodeData => {
  const nodeData: MappingElementTreeNodeData =
    constructMappingElementNodeData(mappingElement);
  if (
    mappingElement instanceof FlatDataInstanceSetImplementation ||
    mappingElement instanceof EmbeddedFlatDataPropertyMapping
  ) {
    const embedded = mappingElement.propertyMappings.filter(
      (
        me: AbstractFlatDataPropertyMapping,
      ): me is AbstractFlatDataPropertyMapping =>
        me instanceof EmbeddedFlatDataPropertyMapping,
    );
    nodeData.childrenIds = embedded.map(
      (e) => `${nodeData.id}.${e.property.value.name}`,
    );
    if (openNodes.includes(mappingElement.id.value)) {
      nodeData.isOpen = true;
      embedded.forEach((e) =>
        reprocessMappingElement(
          e as EmbeddedFlatDataPropertyMapping,
          treeNodes,
          openNodes,
        ),
      );
    }
  }
  treeNodes.set(nodeData.id, nodeData);
  return nodeData;
};

const reprocessMappingElementNodes = (
  mapping: Mapping,
  openNodes: string[],
): TreeData<MappingElementTreeNodeData> => {
  const rootIds: string[] = [];
  const nodes = new Map<string, MappingElementTreeNodeData>();
  const rootMappingElements = mapping
    .getAllMappingElements()
    .sort((a, b) =>
      getMappingIdentitySortString(a, getMappingElementTarget(a)).localeCompare(
        getMappingIdentitySortString(b, getMappingElementTarget(b)),
      ),
    );
  rootMappingElements.forEach((mappingElement) => {
    const mappingElementTreeNodeData = reprocessMappingElement(
      mappingElement,
      nodes,
      openNodes,
    );
    addUniqueEntry(rootIds, mappingElementTreeNodeData.id);
  });
  return { rootIds, nodes };
};

export interface MappingElementSpec {
  showTarget: boolean;
  // whether or not to open the new mapping element tab as an adjacent tab, this behavior is similar to Chrome
  openInAdjacentTab: boolean;
  target?: PackageableElement;
  postSubmitAction?: (newMappingElement: MappingElement | undefined) => void;
}

export type MappingEditorTabState = MappingElementState | MappingTestState;

export class MappingEditorState extends ElementEditorState {
  currentTabState?: MappingEditorTabState;
  openedTabStates: MappingEditorTabState[] = [];
  mappingTestStates: MappingTestState[] = [];
  executionResult?: Record<PropertyKey, unknown>;
  newMappingElementSpec?: MappingElementSpec;
  selectedTypeLabel?: Type;
  executionState: MappingExecutionState;
  isRunningAllTests = false;
  allTestRunTime = 0;
  mappingElementsTreeData: TreeData<MappingElementTreeNodeData>;

  constructor(editorStore: EditorStore, element: PackageableElement) {
    super(editorStore, element);

    makeObservable(this, {
      currentTabState: observable,
      openedTabStates: observable,
      mappingTestStates: observable,
      executionResult: observable.ref,
      newMappingElementSpec: observable,
      selectedTypeLabel: observable,
      executionState: observable,
      isRunningAllTests: observable,
      allTestRunTime: observable,
      mappingElementsTreeData: observable.ref,
      mapping: computed,
      testSuiteResult: computed,
      setSelectedTypeLabel: action,
      setNewMappingElementSpec: action,
      setMappingElementTreeNodeData: action,
      openTabFor: action,
      openMappingElement: action,
      closeAllTabs: action,
      createMappingElement: action,
      reprocessMappingElementTree: action,
      mappingElementsWithSimilarTarget: computed,
      reprocess: action,
    });

    this.editorStore = editorStore;
    this.executionState = new MappingExecutionState(editorStore, this);
    this.mappingTestStates = this.mapping.tests.map(
      (test) => new MappingTestState(editorStore, test, this),
    );
    this.mappingElementsTreeData = getMappingElementTreeData(this.mapping);
  }

  get mapping(): Mapping {
    return guaranteeType(
      this.element,
      Mapping,
      'Element inside mapping editor state must be a mapping',
    );
  }

  get testSuiteResult(): TEST_RESULT {
    const numberOfTestPassed = this.mappingTestStates.filter(
      (testState) => testState.result === TEST_RESULT.PASSED,
    ).length;
    const numberOfTestFailed = this.mappingTestStates.filter(
      (testState) =>
        testState.result === TEST_RESULT.FAILED ||
        testState.result === TEST_RESULT.ERROR,
    ).length;
    return numberOfTestFailed
      ? TEST_RESULT.FAILED
      : numberOfTestPassed
      ? TEST_RESULT.PASSED
      : TEST_RESULT.NONE;
  }

  setSelectedTypeLabel(type: Type | undefined): void {
    this.selectedTypeLabel = type === this.selectedTypeLabel ? undefined : type;
  }
  setNewMappingElementSpec(spec: MappingElementSpec | undefined): void {
    this.newMappingElementSpec = spec;
  }
  setMappingElementTreeNodeData(
    data: TreeData<MappingElementTreeNodeData>,
  ): void {
    this.mappingElementsTreeData = data;
  }

  openTabFor(tabData: MappingElement | MappingTest | undefined): void {
    if (tabData === undefined) {
      this.currentTabState = undefined;
    } else if (tabData instanceof MappingTest) {
      this.currentTabState = this.openedTabStates.find(
        (tabState) =>
          tabState instanceof MappingTestState && tabState.test === tabData,
      );
    } else if (
      tabData instanceof SetImplementation ||
      tabData instanceof EnumerationMapping
    ) {
      this.currentTabState = this.openedTabStates.find(
        (tabState) =>
          tabState instanceof MappingElementState &&
          tabState.mappingElement === tabData,
      );
    } else {
      throw new UnsupportedOperationError(
        `Can't open mapping editor tab for mapping element of type '${
          getClass(tabData).name
        }'`,
      );
    }
  }

  openTest = flow(function* (this: MappingEditorState, test: MappingTest) {
    const testState = this.mappingTestStates.find(
      (mappingTestState) => mappingTestState.test === test,
    );
    assertNonNullable(
      testState,
      `Mapping test state must already been created for test '${test.name}'`,
    );
    if (
      !this.openedTabStates.find(
        (tabState) =>
          tabState instanceof MappingTestState && tabState.test === test,
      )
    ) {
      addUniqueEntry(this.openedTabStates, testState);
    }
    this.openTabFor(test);
    yield testState.openTest(true);
  });

  openMappingElement(
    mappingElement: MappingElement,
    openInAdjacentTab: boolean,
  ): void {
    // If the next mapping element to be opened is not opened yet, we will find the right place to put it in the tab bar
    if (
      !this.openedTabStates.find(
        (tabState) =>
          tabState instanceof MappingElementState &&
          tabState.mappingElement === mappingElement,
      )
    ) {
      const newMappingElementState = guaranteeNonNullable(
        this.createMappingElementState(mappingElement),
      );
      if (openInAdjacentTab) {
        const currentMappingElementIndex = this.openedTabStates.findIndex(
          (tabState) => tabState === this.currentTabState,
        );
        if (currentMappingElementIndex !== -1) {
          this.openedTabStates.splice(
            currentMappingElementIndex + 1,
            0,
            newMappingElementState,
          );
        } else {
          throw new IllegalStateError(`Can't find current mapping editor tab`);
        }
      } else {
        this.openedTabStates.push(newMappingElementState);
      }
    }
    // Set current mapping element, i.e. switch to new tab
    this.openTabFor(mappingElement);
    this.reprocessMappingElementTree(true);
  }

  openTab = flow(function* (
    this: MappingEditorState,
    tabState: MappingEditorTabState,
  ) {
    if (tabState !== this.currentTabState) {
      if (tabState instanceof MappingTestState) {
        yield this.openTest(tabState.test);
      } else if (tabState instanceof MappingElementState) {
        this.openMappingElement(tabState.mappingElement, false);
      }
    }
  });

  closeTab = flow(function* (
    this: MappingEditorState,
    tabState: MappingEditorTabState,
  ) {
    const tabIndex = this.openedTabStates.findIndex((ts) => ts === tabState);
    assertTrue(
      tabIndex !== -1,
      `Mapping editor tab should be currently opened`,
    );
    this.openedTabStates.splice(tabIndex, 1);
    // if current tab is closed, we need further processing
    if (this.currentTabState === tabState) {
      if (this.openedTabStates.length) {
        const openIndex = tabIndex - 1;
        const tabStateToOpen =
          openIndex >= 0
            ? this.openedTabStates[openIndex]
            : this.openedTabStates.length
            ? this.openedTabStates[0]
            : undefined;
        if (tabStateToOpen) {
          yield this.openTab(tabStateToOpen);
        } else {
          this.currentTabState = undefined;
        }
      } else {
        this.currentTabState = undefined;
      }
    }
  });

  closeAllOtherTabs = flow(function* (
    this: MappingEditorState,
    tabState: MappingEditorTabState,
  ) {
    assertNonNullable(
      this.openedTabStates.find((ts) => ts === tabState),
      `Mapping editor tab should be currently opened`,
    );
    this.openedTabStates = [tabState];
    yield this.openTab(tabState);
  });

  closeAllTabs(): void {
    this.currentTabState = undefined;
    this.openedTabStates = [];
  }

  /* @MARKER: NEW CLASS MAPPING TYPE SUPPORT --- consider adding class mapping type handler here whenever support for a new one is added to the app */
  changeClassMappingSourceDriver = flow(function* (
    this: MappingEditorState,
    setImplementation: InstanceSetImplementation,
    newSource: MappingElementSource | undefined,
  ) {
    const currentSource = getMappingElementSource(setImplementation);
    if (currentSource !== newSource) {
      if (
        setImplementation instanceof PureInstanceSetImplementation &&
        (newSource instanceof Class || newSource === undefined)
      ) {
        setImplementation.setSrcClass(newSource);
      } else if (
        setImplementation instanceof FlatDataInstanceSetImplementation &&
        newSource instanceof RootFlatDataRecordType &&
        !setImplementation.getEmbeddedSetImplmentations().length
      ) {
        setImplementation.setSourceRootRecordType(newSource);
      } else {
        // here we require a change of set implementation as the source type does not match the what the current class mapping supports
        let newSetImp: InstanceSetImplementation;
        if (newSource instanceof RootFlatDataRecordType) {
          newSetImp = new FlatDataInstanceSetImplementation(
            setImplementation.id,
            this.mapping,
            PackageableElementExplicitReference.create(
              setImplementation.class.value,
            ),
            setImplementation.root,
            RootFlatDataRecordTypeExplicitReference.create(newSource),
          );
        } else if (newSource instanceof Class || newSource === undefined) {
          newSetImp = new PureInstanceSetImplementation(
            setImplementation.id,
            this.mapping,
            setImplementation.class,
            setImplementation.root,
            OptionalPackageableElementExplicitReference.create(newSource),
          );
        } else if (newSource instanceof Table || newSource instanceof View) {
          const newRootRelationalInstanceSetImplementation =
            new RootRelationalInstanceSetImplementation(
              setImplementation.id,
              this.mapping,
              setImplementation.class,
              setImplementation.root,
            );
          const mainTableAlias = new TableAlias();
          mainTableAlias.relation =
            newSource instanceof Table
              ? TableExplicitReference.create(newSource)
              : ViewExplicitReference.create(newSource);
          mainTableAlias.name = mainTableAlias.relation.value.name;
          newRootRelationalInstanceSetImplementation.mainTableAlias =
            mainTableAlias;
          newSetImp = newRootRelationalInstanceSetImplementation;
        } else {
          throw new UnsupportedOperationError(
            `Can't use class mapping source of type '${
              getClass(newSource).name
            }'`,
          );
        }

        // replace the instance set implementation in mapping
        const idx = guaranteeNonNullable(
          this.mapping.classMappings.findIndex(
            (classMapping) => classMapping === setImplementation,
          ),
          `Can't find class mapping with ID '${setImplementation.id.value}' in mapping '${this.mapping.path}'`,
        );
        this.mapping.classMappings[idx] = newSetImp;

        // replace the instance set implementation in opened tab state
        const setImplStateIdx = guaranteeNonNullable(
          this.openedTabStates.findIndex(
            (tabState) =>
              tabState instanceof MappingElementState &&
              tabState.mappingElement === setImplementation,
          ),
          `Can't find any mapping state for class mapping with ID '${setImplementation.id.value}'`,
        );
        const newMappingElementState = guaranteeNonNullable(
          this.createMappingElementState(newSetImp),
        );
        this.openedTabStates[setImplStateIdx] = newMappingElementState;
        this.currentTabState = newMappingElementState;

        // close all children
        yield this.closeMappingElementTabState(setImplementation);
        this.reprocessMappingElementTree(true);
      }
    }
  });

  deleteMappingElement = flow(function* (
    this: MappingEditorState,
    mappingElement: MappingElement,
  ) {
    yield this.mapping.deleteMappingElement(mappingElement);
    yield this.closeMappingElementTabState(mappingElement);
    this.reprocessMappingElementTree();
  });

  private closeMappingElementTabState = flow(function* (
    this: MappingEditorState,
    mappingElement: MappingElement,
  ) {
    let mappingElementsToClose = [mappingElement];
    if (
      this.editorStore.graphState.isInstanceSetImplementation(mappingElement)
    ) {
      const embeddedChildren = mappingElement.getEmbeddedSetImplmentations();
      mappingElementsToClose = mappingElementsToClose.concat(embeddedChildren);
    }
    const matchMappingElementState = (
      tabState: MappingEditorTabState | undefined,
    ): boolean =>
      tabState instanceof MappingElementState &&
      mappingElementsToClose.includes(tabState.mappingElement);
    if (
      this.currentTabState &&
      matchMappingElementState(this.currentTabState)
    ) {
      yield this.closeTab(this.currentTabState);
    }
    this.openedTabStates = this.openedTabStates.filter(
      (tabState) => !matchMappingElementState(tabState),
    );
  });

  deleteMappingTest = flow(function* (
    this: MappingEditorState,
    test: MappingTest,
  ) {
    const matchMappingTestState = (
      tabState: MappingEditorTabState | undefined,
    ): boolean =>
      tabState instanceof MappingTestState && tabState.test === test;
    this.mapping.deleteTest(test);
    if (this.currentTabState && matchMappingTestState(this.currentTabState)) {
      yield this.closeTab(this.currentTabState);
    }
    this.openedTabStates = this.openedTabStates.filter(
      (tabState) => !matchMappingTestState(tabState),
    );
    this.mappingTestStates = this.mappingTestStates.filter(
      (tabState) => !matchMappingTestState(tabState),
    );
  });

  /**
   * This will determine if we need to show the new mapping element modal or not
   */
  createMappingElement(spec: MappingElementSpec): void {
    if (spec.target) {
      const suggestedId = fromElementPathToMappingElementId(spec.target.path);
      const mappingIds = this.mapping
        .getAllMappingElements()
        .map((mElement) => mElement.id.value);
      const showId = mappingIds.includes(suggestedId);
      const showClasMappingType = spec.target instanceof Class;
      const showNewMappingModal = [
        showId,
        spec.showTarget,
        showClasMappingType,
      ].some(Boolean);
      if (showNewMappingModal) {
        this.setNewMappingElementSpec(spec);
      } else {
        let newMapppingElement: MappingElement | undefined = undefined;
        if (spec.target instanceof Enumeration) {
          // We default to a source type of String when creating a new enumeration mapping
          newMapppingElement = this.mapping.createEnumerationMapping(
            suggestedId,
            spec.target,
            this.editorStore.graphState.graph.getPrimitiveType(
              PRIMITIVE_TYPE.STRING,
            ),
          );
        }
        // NOTE: we don't support association now, nor do we support this for class
        // since class requires a step to choose the class mapping type
        if (newMapppingElement) {
          this.openMappingElement(newMapppingElement, true);
        }
        if (spec.postSubmitAction) {
          spec.postSubmitAction(newMapppingElement);
        }
      }
    } else {
      this.setNewMappingElementSpec(spec);
    }
  }

  /* @MARKER: NEW CLASS MAPPING TYPE SUPPORT --- consider adding class mapping type handler here whenever support for a new one is added to the app */
  private createMappingElementState(
    mappingElement: MappingElement | undefined,
  ): MappingElementState | undefined {
    if (!mappingElement) {
      return undefined;
    }
    if (mappingElement instanceof PureInstanceSetImplementation) {
      return new PureInstanceSetImplementationState(
        this.editorStore,
        mappingElement,
      );
    } else if (mappingElement instanceof FlatDataInstanceSetImplementation) {
      return new RootFlatDataInstanceSetImplementationState(
        this.editorStore,
        mappingElement,
      );
    } else if (mappingElement instanceof EmbeddedFlatDataPropertyMapping) {
      return new EmbeddedFlatDataInstanceSetImplementationState(
        this.editorStore,
        mappingElement,
      );
    } else if (
      mappingElement instanceof RootRelationalInstanceSetImplementation
    ) {
      return new RootRelationalInstanceSetImplementationState(
        this.editorStore,
        mappingElement,
      );
    } else if (
      mappingElement instanceof EmbeddedRelationalInstanceSetImplementation ||
      mappingElement instanceof AggregationAwareSetImplementation
    ) {
      return new UnsupportedInstanceSetImplementationState(
        this.editorStore,
        mappingElement,
      );
    }
    return new MappingElementState(this.editorStore, mappingElement);
  }

  onNodeExpand = (node: MappingElementTreeNodeData): void => {
    const mappingElement = node.mappingElement;
    const treeData = this.mappingElementsTreeData;
    if (node.childrenIds?.length) {
      node.isOpen = !node.isOpen;
      if (
        mappingElement instanceof FlatDataInstanceSetImplementation ||
        mappingElement instanceof EmbeddedFlatDataPropertyMapping
      ) {
        mappingElement.propertyMappings
          .filter(
            (
              me: AbstractFlatDataPropertyMapping,
            ): me is EmbeddedFlatDataPropertyMapping =>
              me instanceof EmbeddedFlatDataPropertyMapping,
          )
          .forEach((embeddedPM) => {
            const embeddedPropertyNode =
              getMappingElementTreeNodeData(embeddedPM);
            treeData.nodes.set(embeddedPropertyNode.id, embeddedPropertyNode);
          });
      }
    }
    this.setMappingElementTreeNodeData({ ...treeData });
  };

  onNodeSelect = (node: MappingElementTreeNodeData): void => {
    this.onNodeExpand(node);
    this.openMappingElement(node.mappingElement, false);
  };

  getMappingElementTreeChildNodes = (
    node: MappingElementTreeNodeData,
  ): MappingElementTreeNodeData[] => {
    if (!node.childrenIds) {
      return [];
    }
    const childrenNodes = node.childrenIds
      .map((id) => this.mappingElementsTreeData.nodes.get(id))
      .filter(isNonNullable)
      .sort((a, b) => a.label.localeCompare(b.label));
    return childrenNodes;
  };

  reprocessMappingElementTree(openNodeFoCurrentTab = false): void {
    const openedTreeNodeIds = Array.from(
      this.mappingElementsTreeData.nodes.values(),
    )
      .filter((node) => node.isOpen)
      .map((node) => node.id);
    this.setMappingElementTreeNodeData(
      reprocessMappingElementNodes(this.mapping, openedTreeNodeIds),
    );
    if (openNodeFoCurrentTab) {
      // FIXME: we should follow the example of project explorer where we maintain the currentlySelectedNode
      // instead of adaptively show the `selectedNode` based on current tab state. This is bad
      // this.setMappingElementTreeNodeData(openNode(openElement, this.mappingElementsTreeData));
      // const openNode = (element: EmbeddedFlatDataPropertyMapping, treeData: TreeData<MappingElementTreeNodeData>): MappingElementTreeNodeData => {
      // if (element instanceof EmbeddedFlatDataPropertyMapping) {
      //   let currentElement: InstanceSetImplementation | undefined = element;
      //   while (currentElement instanceof EmbeddedFlatDataPropertyMapping) {
      //     const node: MappingElementTreeNodeData = treeData.nodes.get(currentElement.id) ?? addNode(currentElement, treeData);
      //     node.isOpen = true;
      //     currentElement = currentElement.owner as InstanceSetImplementation;
      //   }
      //   // create children if not created
      //   element.propertyMappings.filter((me: AbstractFlatDataPropertyMapping): me is EmbeddedFlatDataPropertyMapping => me instanceof EmbeddedFlatDataPropertyMapping)
      //     .forEach(el => treeData.nodes.get(el.id) ?? addNode(el, treeData));
      // }
      // return treeData;
      // const addNode = (element: EmbeddedFlatDataPropertyMapping, treeData: TreeData<MappingElementTreeNodeData>): MappingElementTreeNodeData => {
      //   const newNode = getMappingElementTreeNodeData(element);
      //   treeData.nodes.set(newNode.id, newNode);
      //   if (element.owner instanceof FlatDataInstanceSetImplementation || element.owner instanceof EmbeddedFlatDataPropertyMapping) {
      //     const baseNode = treeData.nodes.get(element.owner.id);
      //     if (baseNode) {
      //       baseNode.isOpen = true;
      //     }
      //   } else {
      //     const parentNode = treeData.nodes.get(element.owner.id);
      //     if (parentNode) {
      //       parentNode.childrenIds = parentNode.childrenIds ? Array.from((new Set(parentNode.childrenIds)).add(newNode.id)) : [newNode.id];
      //     }
      //   }
      //   return newNode;
      // };
    }
  }

  addTest = flow(function* (this: MappingEditorState, test: MappingTest) {
    this.mappingTestStates.push(
      new MappingTestState(this.editorStore, test, this),
    );
    this.mapping.addTest(test);
    yield this.openTest(test);
  });

  /**
   * This method is used to check if a target is being mapped multiple times, so we can make
   * decision on things like whether we enforce the user to provide an ID for those mapping elements.
   */
  get mappingElementsWithSimilarTarget(): MappingElement[] {
    if (this.currentTabState instanceof MappingElementState) {
      const mappingElement = this.currentTabState.mappingElement;
      switch (getMappingElementType(mappingElement)) {
        case MAPPING_ELEMENT_TYPE.CLASS:
          return this.mapping.classMappings.filter(
            (cm) =>
              cm.class.value ===
              (mappingElement as SetImplementation).class.value,
          );
        case MAPPING_ELEMENT_TYPE.ENUMERATION:
          return this.mapping.enumerationMappings.filter(
            (em) =>
              em.enumeration.value ===
              (mappingElement as EnumerationMapping).enumeration.value,
          );
        case MAPPING_ELEMENT_TYPE.ASSOCIATION: // NOTE: we might not even support Association Mapping
        default:
          return [];
      }
    }
    return [];
  }

  /* @MARKER: NEW CLASS MAPPING TYPE SUPPORT --- consider adding class mapping type handler here whenever support for a new one is added to the app */
  revealCompilationError(compilationError: CompilationError): boolean {
    let revealed = false;
    try {
      if (compilationError.sourceInformation) {
        const errorElementCoordinates = getElementCoordinates(
          compilationError.sourceInformation,
        );
        if (errorElementCoordinates) {
          const sourceId = compilationError.sourceInformation.sourceId;
          assertTrue(errorElementCoordinates.coordinates.length > 4);
          const [mappingType, mappingId, propertyName, targetPropertyId] =
            errorElementCoordinates.coordinates;
          const newMappingElement = this.mapping.getMappingElementByTypeAndId(
            mappingType,
            mappingId,
          );
          // NOTE: Unfortunately this is quite convoluted at the moment that is because we maintain a separate state
          // that wraps around property mapping, this is deliberate as we don't want to mix UI state in metamodel classes
          // in the future if this gets bigger, we might need to move this out to `MappingElementState`
          if (
            newMappingElement instanceof PureInstanceSetImplementation ||
            newMappingElement instanceof FlatDataInstanceSetImplementation ||
            newMappingElement instanceof EmbeddedFlatDataPropertyMapping
          ) {
            const propertyMapping = newMappingElement.findPropertyMapping(
              propertyName,
              targetPropertyId,
            );
            if (propertyMapping) {
              if (
                !(this.currentTabState instanceof MappingElementState) ||
                newMappingElement !== this.currentTabState.mappingElement
              ) {
                this.openMappingElement(newMappingElement, false);
              }
              if (
                this.currentTabState instanceof
                  PureInstanceSetImplementationState ||
                this.currentTabState instanceof
                  FlatDataInstanceSetImplementationState
              ) {
                const propertyMappingState =
                  this.currentTabState.propertyMappingStates.find(
                    (state) => state.propertyMapping.lambdaId === sourceId,
                  );
                if (propertyMappingState) {
                  propertyMappingState.setCompilationError(compilationError);
                  revealed = true;
                }
              } else {
                throw new IllegalStateError(
                  'Expected to have current mapping editor state to be of consistent type with current mapping element',
                );
              }
            }
          }
        }
      }
    } catch (error: unknown) {
      this.editorStore.applicationStore.logger.warn(
        CORE_LOG_EVENT.COMPILATION_PROBLEM,
        `Can't locate error, redirecting to text mode`,
        error,
      );
    }
    return revealed;
  }

  reprocess(newElement: Mapping, editorStore: EditorStore): MappingEditorState {
    const mappingEditorState = new MappingEditorState(editorStore, newElement);
    mappingEditorState.openedTabStates = this.openedTabStates
      .map((tabState) => {
        if (tabState instanceof MappingTestState) {
          return mappingEditorState.mappingTestStates.find(
            (testState) => testState.test.name === tabState.test.name,
          );
        }
        const mappingElement =
          mappingEditorState.mapping.getMappingElementByTypeAndId(
            getMappingElementType(tabState.mappingElement),
            tabState.mappingElement.id.value,
          );
        return this.createMappingElementState(mappingElement);
      })
      .filter(isNonNullable);
    const currentTabData = this.currentTabState
      ? this.currentTabState instanceof MappingTestState
        ? mappingEditorState.mappingTestStates.find(
            (testState) =>
              this.currentTabState instanceof MappingTestState &&
              testState.test.name === this.currentTabState.test.name,
          )?.test
        : mappingEditorState.mapping.getMappingElementByTypeAndId(
            getMappingElementType(this.currentTabState.mappingElement),
            this.currentTabState.mappingElement.id.value,
          )
      : undefined;
    mappingEditorState.openTabFor(currentTabData);
    return mappingEditorState;
  }

  runTests = flow(function* (this: MappingEditorState) {
    const startTime = Date.now();
    this.isRunningAllTests = true;
    this.mappingTestStates.forEach((testState) =>
      testState.resetTestRunStatus(),
    );
    yield Promise.all(
      this.mappingTestStates.map((testState: MappingTestState) => {
        // run non-skip tests, and reset all skipped tests
        if (!testState.isSkipped) {
          return testState.runTest();
        }
        testState.resetTestRunStatus();
        return undefined;
      }),
    );
    this.isRunningAllTests = false;
    this.allTestRunTime = Date.now() - startTime;
  });

  createNewTest = flow(function* (
    this: MappingEditorState,
    setImplementation: SetImplementation,
  ) {
    const query =
      this.editorStore.graphState.graphManager.HACKY_createGetAllLambda(
        setImplementation.class.value,
      );
    const source = getMappingElementSource(setImplementation);
    if (setImplementation instanceof OperationSetImplementation) {
      this.editorStore.applicationStore.notifyWarning(
        `Can't auto-generate input data for operation class mapping. Please pick a concrete class mapping instead.`,
      );
    }
    let inputData: InputData;
    if (source === undefined || source instanceof Class) {
      inputData = new ObjectInputData(
        PackageableElementExplicitReference.create(
          source ?? Class.createStub(),
        ),
        ObjectInputType.JSON,
        source
          ? createMockDataForMappingElementSource(source, this.editorStore)
          : '{}',
      );
    } else if (source instanceof RootFlatDataRecordType) {
      inputData = new FlatDataInputData(
        PackageableElementExplicitReference.create(source.owner.owner),
        createMockDataForMappingElementSource(source, this.editorStore),
      );
    } else if (source instanceof Table || source instanceof View) {
      inputData = new RelationalInputData(
        PackageableElementExplicitReference.create(source.schema.owner),
        createMockDataForMappingElementSource(source, this.editorStore),
        RelationalInputType.SQL,
      );
    } else {
      throw new UnsupportedOperationError(
        `Can't create new mapping test input data with source of type '${
          getClass(source).name
        }'`,
      );
    }
    const newTest = new MappingTest(
      this.mapping.generateTestName(),
      query,
      [inputData],
      new ExpectedOutputMappingTestAssert('{}'),
    );
    this.mapping.addTest(newTest);
    // open the test
    this.mappingTestStates.push(
      new MappingTestState(this.editorStore, newTest, this),
    );
    yield this.openTest(newTest);
  });
}
