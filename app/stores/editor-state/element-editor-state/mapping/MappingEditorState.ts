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

import { observable, action, computed, flow } from 'mobx';
import { Log, LOG_EVENT } from 'Utilities/Logger';
import { PRIMITIVE_TYPE } from 'MetaModelConst';
import { EditorStore } from 'Stores/EditorStore';
import { MappingElementState } from './MappingElementState';
import { PureInstanceSetImplementationState } from './PureInstanceSetImplementationState';
import { ElementEditorState } from 'Stores/editor-state/element-editor-state/ElementEditorState';
import { MappingTestState, TEST_RESULT } from './MappingTestState';
import { createMockDataForMappingElementSource } from 'Utilities/MockDataUtil';
import { isInstanceSetImplementation } from 'Utilities/GraphUtil';
import { fromElementPathToMappingElementId } from 'MetaModelUtility';
import { IllegalStateError, isNonNullable, assertNonNullable, guaranteeNonNullable, guaranteeType, UnsupportedOperationError, assertTrue, addUniqueEntry } from 'Utilities/GeneralUtil';
import { MappingExecutionState } from './MappingExecutionState';
import { TreeNodeData, TreeData } from 'Utilities/TreeUtil';
import { getElementCoordinates, CompilationError } from 'EXEC/ExecutionServerError';
import { Class } from 'MM/model/packageableElements/domain/Class';
import { Enumeration } from 'MM/model/packageableElements/domain/Enumeration';
import { Mapping, MappingElement, MAPPING_ELEMENT_TYPE, getMappingElementType, getMappingElementTarget, getMappingElementSource, MappingElementSource } from 'MM/model/packageableElements/mapping/Mapping';
import { EnumerationMapping } from 'MM/model/packageableElements/mapping/EnumerationMapping';
import { SetImplementation } from 'MM/model/packageableElements/mapping/SetImplementation';
import { PureInstanceSetImplementation } from 'MM/model/packageableElements/store/modelToModel/mapping/PureInstanceSetImplementation';
import { PackageableElement } from 'MM/model/packageableElements/PackageableElement';
import { Type } from 'MM/model/packageableElements/domain/Type';
import { MappingTest } from 'MM/model/packageableElements/mapping/MappingTest';
import { ExpectedOutputMappingTestAssert } from 'MM/model/packageableElements/mapping/ExpectedOutputMappingTestAssert';
import { ObjectInputData, OBJECT_INPUT_TYPE } from 'MM/model/packageableElements/store/modelToModel/mapping/ObjectInputData';
import { InstanceSetImplementation } from 'MM/model/packageableElements/mapping/InstanceSetImplementation';
import { InputData } from 'MM/model/packageableElements/mapping/InputData';
import { PackageableElementExplicitReference, OptionalPackageableElementExplicitReference } from 'MM/model/packageableElements/PackageableElementReference';

export interface MappingElementTreeNodeData extends TreeNodeData {
  mappingElement: MappingElement;
}

const constructMappingElementNodeData = (mappingElement: MappingElement): MappingElementTreeNodeData => ({
  id: `${mappingElement.id.value}`,
  mappingElement: mappingElement,
  label: mappingElement.label.value
});

const getMappingElementTreeNodeData = (mappingElement: MappingElement): MappingElementTreeNodeData => {
  const nodeData: MappingElementTreeNodeData = constructMappingElementNodeData(mappingElement);
  return nodeData;
};

const getMappingIdentitySortString = (me: MappingElement, type: PackageableElement): string => `${type.name}-${type.path}-${me.id.value}`;

const getMappingElementTreeData = (mapping: Mapping): TreeData<MappingElementTreeNodeData> => {
  const rootIds: string[] = [];
  const nodes = new Map<string, MappingElementTreeNodeData>();
  const rootMappingElements = mapping.getAllMappingElements().sort((a, b) => getMappingIdentitySortString(a, getMappingElementTarget(a)).localeCompare(getMappingIdentitySortString(b, getMappingElementTarget(b))));
  rootMappingElements.forEach(mappingElement => {
    const mappingElementTreeNodeData = getMappingElementTreeNodeData(mappingElement);
    addUniqueEntry(rootIds, mappingElementTreeNodeData.id);
    nodes.set(mappingElementTreeNodeData.id, mappingElementTreeNodeData);
  });
  return { rootIds, nodes };
};

const reprocessMappingElement = (mappingElement: MappingElement, treeNodes: Map<string, MappingElementTreeNodeData>, openNodes: string[]): MappingElementTreeNodeData => {
  const nodeData: MappingElementTreeNodeData = constructMappingElementNodeData(mappingElement);
  treeNodes.set(nodeData.id, nodeData);
  return nodeData;
};

const reprocessMappingElementNodes = (mapping: Mapping, openNodes: string[]): TreeData<MappingElementTreeNodeData> => {
  const rootIds: string[] = [];
  const nodes = new Map<string, MappingElementTreeNodeData>();
  const rootMappingElements = mapping.getAllMappingElements().sort((a, b) => getMappingIdentitySortString(a, getMappingElementTarget(a)).localeCompare(getMappingIdentitySortString(b, getMappingElementTarget(b))));
  rootMappingElements.forEach(mappingElement => {
    const mappingElementTreeNodeData = reprocessMappingElement(mappingElement, nodes, openNodes);
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
  @observable currentTabState?: MappingEditorTabState;
  @observable openedTabStates: MappingEditorTabState[] = [];
  @observable mappingTestStates: MappingTestState[] = [];
  @observable.ref executionResult?: Record<PropertyKey, unknown>;
  @observable newMappingElementSpec?: MappingElementSpec;
  @observable selectedTypeLabel?: Type;
  @observable executionState: MappingExecutionState;
  @observable isRunningAllTests = false;
  @observable allTestRunTime = 0;
  @observable.ref mappingElementsTreeData: TreeData<MappingElementTreeNodeData>;

  constructor(editorStore: EditorStore, element: PackageableElement) {
    super(editorStore, element);
    this.editorStore = editorStore;
    this.executionState = new MappingExecutionState(editorStore, this);
    this.mappingTestStates = this.mapping.tests.map(test => new MappingTestState(editorStore, test, this));
    this.mappingElementsTreeData = getMappingElementTreeData(this.mapping);
  }

  /**
   * We have this method here so we can call `element` as `mapping` inside of `MappingEditorState`
   * Also we make this @computed in reponse to change in `element` so we naturally sync between `mapping` and `element`
   * If we have `mapping: Mapping = this.element as Mapping`, we will get bugs when we try to change `element` because `mobx`
   * only tracks `element` in that assignment, not `mapping`. See `reprocess` in `ElementEditorState` for example.
   * NOTE: We can also do type narrowing like what we do in `MappingElementState`
   */
  @computed get mapping(): Mapping { return guaranteeType(this.element, Mapping, 'Element inside mapping editor state must be a mapping') }

  @computed get testSuiteResult(): TEST_RESULT {
    const numberOfTestPassed = this.mappingTestStates.filter(testState => testState.result === TEST_RESULT.PASSED).length;
    const numberOfTestFailed = this.mappingTestStates.filter(testState => testState.result === TEST_RESULT.FAILED || testState.result === TEST_RESULT.ERROR).length;
    return numberOfTestFailed ? TEST_RESULT.FAILED : numberOfTestPassed ? TEST_RESULT.PASSED : TEST_RESULT.NONE;
  }

  @action setSelectedTypeLabel(type: Type | undefined): void { this.selectedTypeLabel = type === this.selectedTypeLabel ? undefined : type }
  @action setNewMappingElementSpec(spec: MappingElementSpec | undefined): void { this.newMappingElementSpec = spec }
  @action setMappingElementTreeNodeData(data: TreeData<MappingElementTreeNodeData>): void { this.mappingElementsTreeData = data }

  @action openTabFor(tabData: MappingElement | MappingTest | undefined): void {
    if (tabData === undefined) {
      this.currentTabState = undefined;
    } else if (tabData instanceof MappingTest) {
      this.currentTabState = this.openedTabStates.find(tabState => tabState instanceof MappingTestState && tabState.test === tabData);
    } else if (tabData instanceof SetImplementation || tabData instanceof EnumerationMapping) {
      this.currentTabState = this.openedTabStates.find(tabState => tabState instanceof MappingElementState && tabState.mappingElement === tabData);
    }
  }

  openTest = flow(function* (this: MappingEditorState, test: MappingTest) {
    const testState = this.mappingTestStates.find(mappingTestState => mappingTestState.test === test);
    assertNonNullable(testState, `Mapping test state must already been created for test '${test.name}'`);
    if (!this.openedTabStates.find(tabState => tabState instanceof MappingTestState && tabState.test === test)) {
      addUniqueEntry(this.openedTabStates, testState);
    }
    this.openTabFor(test);
    yield testState.openTest(true);
  })

  @action openMappingElement(mappingElement: MappingElement, openInAdjacentTab: boolean): void {
    // If the next mapping element to be opened is not opened yet, we will find the right place to put it in the tab bar
    if (!this.openedTabStates.find(tabState => tabState instanceof MappingElementState && tabState.mappingElement === mappingElement)) {
      const newMappingElementState = guaranteeNonNullable(this.createMappingElementState(mappingElement));
      if (openInAdjacentTab) {
        const currentMappingElementIndex = this.openedTabStates.findIndex(tabState => tabState === this.currentTabState);
        if (currentMappingElementIndex !== -1) {
          this.openedTabStates.splice(currentMappingElementIndex + 1, 0, newMappingElementState);
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

  openTab = flow(function* (this: MappingEditorState, tabState: MappingEditorTabState) {
    if (tabState !== this.currentTabState) {
      if (tabState instanceof MappingTestState) {
        yield this.openTest(tabState.test);
      } else if (tabState instanceof MappingElementState) {
        this.openMappingElement(tabState.mappingElement, false);
      }
    }
  })

  closeTab = flow(function* (this: MappingEditorState, tabState: MappingEditorTabState) {
    const tabIndex = this.openedTabStates.findIndex(ts => ts === tabState);
    assertTrue(tabIndex !== -1, `Mapping editor tab should be currently opened`);
    this.openedTabStates.splice(tabIndex, 1);
    // if current tab is closed, we need further processing
    if (this.currentTabState === tabState) {
      if (this.openedTabStates.length) {
        const openIndex = tabIndex - 1;
        const tabStateToOpen = openIndex >= 0 ? this.openedTabStates[openIndex] : this.openedTabStates.length ? this.openedTabStates[0] : undefined;
        if (tabStateToOpen) {
          yield this.openTab(tabStateToOpen);
        } else {
          this.currentTabState = undefined;
        }
      } else {
        this.currentTabState = undefined;
      }
    }
  })

  closeAllOtherTabs = flow(function* (this: MappingEditorState, tabState: MappingEditorTabState) {
    assertNonNullable(this.openedTabStates.find(ts => ts === tabState), `Mapping editor tab should be currently opened`);
    this.openedTabStates = [tabState];
    yield this.openTab(tabState);
  })

  @action closeAllTabs(): void {
    this.currentTabState = undefined;
    this.openedTabStates = [];
  }

  /* @MARKER: NEW CLASS MAPPING TYPE SUPPORT --- consider adding class mapping type handler here whenever support for a new one is added to the app */
  changeClassMappingSourceDriver = flow(function* (this: MappingEditorState, setImplementation: InstanceSetImplementation, newSource: MappingElementSource | undefined) {
    const currentSource = getMappingElementSource(setImplementation);
    if (currentSource !== newSource) {
      if (setImplementation instanceof PureInstanceSetImplementation && (newSource instanceof Class || newSource === undefined)) {
        setImplementation.setSrcClass(newSource);
      } else {
        // here we require a change of set implementation as the source type does not match the what the current class mapping supports
        let newSetImp: InstanceSetImplementation;
        if (newSource instanceof Class || newSource === undefined) {
          newSetImp = new PureInstanceSetImplementation(setImplementation.id, this.mapping, setImplementation.class, setImplementation.root, OptionalPackageableElementExplicitReference.create(newSource));
        } else {
          throw new UnsupportedOperationError(`Unsupported class mapping source type '${newSource.constructor.name}'`);
        }
        yield this.replaceOpenedInstanceSetImplmentation(setImplementation, newSetImp);
      }
    }
  })

  deleteMappingElement = flow(function* (this: MappingEditorState, mappingElement: MappingElement) {
    yield this.mapping.deleteMappingElement(mappingElement);
    yield this.closeMappingElementTabState(mappingElement);
    this.reprocessMappingElementTree();
  })

  replaceOpenedInstanceSetImplmentation = flow(function* (this: MappingEditorState, setImplementation: InstanceSetImplementation, newSetImp: InstanceSetImplementation) {
    // repalce in mapping
    const idx = guaranteeNonNullable(this.mapping.classMappings.findIndex(classMapping => classMapping === setImplementation), `Class mapping with ID '${setImplementation.id.value}' not found in mapping '${this.mapping.path}'`);
    this.mapping.classMappings[idx] = newSetImp;
    // replace in opened tab state
    const setImplStateIdx = guaranteeNonNullable(this.openedTabStates.findIndex(tabState => tabState instanceof MappingElementState && tabState.mappingElement === setImplementation), `no mapping state found for class mapping with ID '${setImplementation.id.value}'`);
    const newMappingElementState = guaranteeNonNullable(this.createMappingElementState(newSetImp));
    this.openedTabStates[setImplStateIdx] = newMappingElementState;
    this.currentTabState = newMappingElementState;
    // close all children
    yield this.closeMappingElementTabState(setImplementation);
    this.reprocessMappingElementTree(true);
  })

  private closeMappingElementTabState = flow(function* (this: MappingEditorState, mappingElement: MappingElement) {
    let mappingElementsToClose = [mappingElement];
    if (isInstanceSetImplementation(mappingElement)) {
      const embeddedChildren = mappingElement.getEmbeddedSetImplmentations();
      mappingElementsToClose = mappingElementsToClose.concat(embeddedChildren);
    }
    const matchMappingElementState = (tabState: MappingEditorTabState | undefined): boolean => tabState instanceof MappingElementState && mappingElementsToClose.includes(tabState.mappingElement);
    if (this.currentTabState && matchMappingElementState(this.currentTabState)) {
      yield this.closeTab(this.currentTabState);
    }
    this.openedTabStates = this.openedTabStates.filter(tabState => !matchMappingElementState(tabState));
  })

  deleteMappingTest = flow(function* (this: MappingEditorState, test: MappingTest) {
    const matchMappingTestState = (tabState: MappingEditorTabState | undefined): boolean => tabState instanceof MappingTestState && tabState.test === test;
    this.mapping.deleteTest(test);
    if (this.currentTabState && matchMappingTestState(this.currentTabState)) {
      yield this.closeTab(this.currentTabState);
    }
    this.openedTabStates = this.openedTabStates.filter(tabState => !matchMappingTestState(tabState));
    this.mappingTestStates = this.mappingTestStates.filter(tabState => !matchMappingTestState(tabState));
  })

  /**
   * This will determine if we need to show the new mapping element modal or not
   */
  @action createMappingElement(spec: MappingElementSpec): void {
    if (spec.target) {
      const suggestedId = fromElementPathToMappingElementId(spec.target.path);
      const mappingIds = this.mapping.getAllMappingElements().map(mElement => mElement.id.value);
      const showId = mappingIds.includes(suggestedId);
      const showClasMappingType = spec.target instanceof Class;
      const showNewMappingModal = [showId, spec.showTarget, showClasMappingType].some(Boolean);
      if (showNewMappingModal) {
        this.setNewMappingElementSpec(spec);
      } else {
        let newMapppingElement: MappingElement | undefined = undefined;
        if (spec.target instanceof Enumeration) {
          // We default to a source type of String when creating a new enumeration mapping
          newMapppingElement = this.mapping.createEnumerationMapping(suggestedId, spec.target, this.editorStore.graphState.graph.getPrimitiveType(PRIMITIVE_TYPE.STRING));
        }
        // NOTE: we don't support association now, nor do we support this for class
        // since class requires a step to choose the class mapping type
        if (newMapppingElement) { this.openMappingElement(newMapppingElement, true) }
        if (spec.postSubmitAction) { spec.postSubmitAction(newMapppingElement) }
      }
    } else {
      this.setNewMappingElementSpec(spec);
    }
  }

  /* @MARKER: NEW CLASS MAPPING TYPE SUPPORT --- consider adding class mapping type handler here whenever support for a new one is added to the app */
  private createMappingElementState(mappingElement: MappingElement | undefined): MappingElementState | undefined {
    if (!mappingElement) { return undefined }
    if (mappingElement instanceof PureInstanceSetImplementation) {
      return new PureInstanceSetImplementationState(this.editorStore, mappingElement);
    }
    return new MappingElementState(this.editorStore, mappingElement);
  }

  onNodeExpand = (node: MappingElementTreeNodeData): void => {
    const treeData = this.mappingElementsTreeData;
    if (node.childrenIds?.length) {
      node.isOpen = !node.isOpen;
    }
    this.setMappingElementTreeNodeData({ ...treeData });
  };

  onNodeSelect = (node: MappingElementTreeNodeData): void => {
    this.onNodeExpand(node);
    this.openMappingElement(node.mappingElement, false);
  };

  getMappingElementTreeChildNodes = (node: MappingElementTreeNodeData): MappingElementTreeNodeData[] => {
    if (!node.childrenIds) {
      return [];
    }
    const childrenNodes = node.childrenIds
      .map(id => this.mappingElementsTreeData.nodes.get(id))
      .filter(isNonNullable)
      .sort((a, b) => a.label.localeCompare(b.label));
    return childrenNodes;
  };

  @action reprocessMappingElementTree(openNodeFoCurrentTab = false): void {
    const openedTreeNodeIds = Array.from(this.mappingElementsTreeData.nodes.values()).filter(node => node.isOpen).map(node => node.id);
    this.setMappingElementTreeNodeData(reprocessMappingElementNodes(this.mapping, openedTreeNodeIds));
  }

  addTest = flow(function* (this: MappingEditorState, test: MappingTest) {
    this.mappingTestStates.push(new MappingTestState(this.editorStore, test, this));
    this.mapping.addTest(test);
    yield this.openTest(test);
  })

  /**
   * This method is used to check if a target is being mapped multiple times, so we can make
   * decision on things like whether we enforce the user to provide an ID for those mapping elements.
   */
  @computed get mappingElementsWithSimilarTarget(): MappingElement[] {
    if (this.currentTabState instanceof MappingElementState) {
      const mappingElement = this.currentTabState.mappingElement;
      switch (getMappingElementType(mappingElement)) {
        case MAPPING_ELEMENT_TYPE.CLASS: return this.mapping.classMappings.filter(cm => cm.class.value === (mappingElement as SetImplementation).class.value);
        case MAPPING_ELEMENT_TYPE.ENUMERATION: return this.mapping.enumerationMappings.filter(em => em.enumeration.value === (mappingElement as EnumerationMapping).enumeration.value);
        case MAPPING_ELEMENT_TYPE.ASSOCIATION: // NOTE: we might not even support Association Mapping
        default: return [];
      }
    }
    return [];
  }

  /* @MARKER: NEW CLASS MAPPING TYPE SUPPORT --- consider adding class mapping type handler here whenever support for a new one is added to the app */
  revealCompilationError(compilationError: CompilationError): boolean {
    let revealed = false;
    try {
      if (compilationError.sourceInformation) {
        const errorElementCoordinates = getElementCoordinates(compilationError.sourceInformation);
        if (errorElementCoordinates) {
          const sourceId = compilationError.sourceInformation.sourceId;
          assertTrue(errorElementCoordinates.coordinates.length > 4);
          const [mappingType, mappingId, propertyName, targetPropertyId] = errorElementCoordinates.coordinates;
          const newMappingElement = this.mapping.getMappingElementByTypeAndId(mappingType, mappingId);
          // NOTE: Unfortunately this is not too straight-forward at the moment because we maintain a separate state
          // that wraps around property mapping, this is deliberate as we don't want to mix UI state in metamodel classes
          // in the future if this gets bigger, we might need to move this out to `MappingElementState`
          if (newMappingElement instanceof PureInstanceSetImplementation
          ) {
            const propertyMapping = newMappingElement.findPropertyMapping(propertyName, targetPropertyId);
            if (propertyMapping) {
              if (!(this.currentTabState instanceof MappingElementState) || newMappingElement !== this.currentTabState.mappingElement) {
                this.openMappingElement(newMappingElement, false);
              }
              if (this.currentTabState instanceof PureInstanceSetImplementationState
              ) {
                const propertyMappingState = this.currentTabState.propertyMappingStates.find(propertyMappingState => propertyMappingState.propertyMapping.lambdaId === sourceId);
                if (propertyMappingState) {
                  propertyMappingState.setCompilationError(compilationError);
                  revealed = true;
                }
              } else {
                throw new IllegalStateError('Expected to have current mapping editor state to be of consistent type with current mapping element');
              }
            }
          }
        }
      }
    } catch (error) {
      Log.warn(LOG_EVENT.COMPILATION_PROBLEM, `Can't locate error, redirecting to text mode`, error);
    }
    return revealed;
  }

  @action reprocess(newElement: Mapping, editorStore: EditorStore): MappingEditorState {
    const mappingEditorState = new MappingEditorState(editorStore, newElement);
    mappingEditorState.openedTabStates = this.openedTabStates
      .map(tabState => {
        if (tabState instanceof MappingTestState) {
          return mappingEditorState.mappingTestStates.find(testState => testState.test.name === tabState.test.name);
        }
        const mappingElement = mappingEditorState.mapping.getMappingElementByTypeAndId(getMappingElementType(tabState.mappingElement), tabState.mappingElement.id.value);
        return this.createMappingElementState(mappingElement);
      })
      .filter(isNonNullable);
    const currentTabData = this.currentTabState
      ? this.currentTabState instanceof MappingTestState
        ? mappingEditorState.mappingTestStates.find(testState => this.currentTabState instanceof MappingTestState && testState.test.name === this.currentTabState.test.name)?.test
        : mappingEditorState.mapping.getMappingElementByTypeAndId(getMappingElementType(this.currentTabState.mappingElement), this.currentTabState.mappingElement.id.value)
      : undefined;
    mappingEditorState.openTabFor(currentTabData);
    return mappingEditorState;
  }

  runTests = flow(function* (this: MappingEditorState) {
    const startTime = Date.now();
    this.isRunningAllTests = true;
    this.mappingTestStates.forEach(testState => testState.resetTestRunStatus());
    yield Promise.all(this.mappingTestStates.map((testState: MappingTestState) => {
      // run non-skip tests, and reset all skipped tests
      if (!testState.isSkipped) { return testState.runTest() }
      testState.resetTestRunStatus();
      return undefined;
    }));
    this.isRunningAllTests = false;
    this.allTestRunTime = Date.now() - startTime;
  });

  createNewTest = flow(function* (this: MappingEditorState, targetClass: Class) {
    // TODO? should we auto-select everything?
    const query = this.editorStore.graphState.graphManager.HACKY_createGetAllLambda(targetClass);
    // smartly choose the first source in the list of possible sources by default
    const possibleSources = this.mapping.getAllMappingElements()
      .filter(mappingElement => getMappingElementTarget(mappingElement) === targetClass)
      .map(mappingElement => getMappingElementSource(mappingElement));
    const source = possibleSources.length ? possibleSources[0] : undefined;
    let inputData: InputData;
    if (source === undefined || source instanceof Class) {
      inputData = new ObjectInputData(PackageableElementExplicitReference.create(source ?? Class.createStub()), OBJECT_INPUT_TYPE.JSON, source ? createMockDataForMappingElementSource(source) : '{}');
    } else {
      throw new UnsupportedOperationError();
    }
    const newTest = new MappingTest(this.mapping.generateTestName(), query, [inputData], new ExpectedOutputMappingTestAssert('{}'));
    this.mapping.addTest(newTest);
    // open the test
    this.mappingTestStates.push(new MappingTestState(this.editorStore, newTest, this));
    yield this.openTest(newTest);
  })
}
