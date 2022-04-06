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

import {
  observable,
  action,
  computed,
  flow,
  makeObservable,
  flowResult,
} from 'mobx';
import type { EditorStore } from '../../../EditorStore';
import {
  InstanceSetImplementationState,
  MappingElementState,
} from './MappingElementState';
import { PureInstanceSetImplementationState } from './PureInstanceSetImplementationState';
import { ElementEditorState } from '../../../editor-state/element-editor-state/ElementEditorState';
import {
  MAPPING_TEST_EDITOR_TAB_TYPE,
  MappingTestState,
  TEST_RESULT,
} from './MappingTestState';
import { createMockDataForMappingElementSource } from '../../../shared/MockDataUtil';
import {
  type GeneratorFn,
  assertErrorThrown,
  LogEvent,
  deleteEntry,
  generateEnumerableNameFromToken,
  IllegalStateError,
  isNonNullable,
  assertNonNullable,
  guaranteeNonNullable,
  guaranteeType,
  UnsupportedOperationError,
  assertTrue,
  addUniqueEntry,
} from '@finos/legend-shared';
import { MappingExecutionState } from './MappingExecutionState';
import {
  FlatDataInstanceSetImplementationState,
  RootFlatDataInstanceSetImplementationState,
} from './FlatDataInstanceSetImplementationState';
import type { TreeNodeData, TreeData } from '@finos/legend-art';
import { UnsupportedInstanceSetImplementationState } from './UnsupportedInstanceSetImplementationState';
import { RootRelationalInstanceSetImplementationState } from './relational/RelationalInstanceSetImplementationState';
import {
  type CompilationError,
  type PackageableElement,
  type AbstractFlatDataPropertyMapping,
  type InputData,
  type Type,
  getAllClassMappings,
  GRAPH_MANAGER_EVENT,
  PRIMITIVE_TYPE,
  fromElementPathToMappingElementId,
  extractSourceInformationCoordinates,
  getAllEnumerationMappings,
  Class,
  Enumeration,
  Mapping,
  EnumerationMapping,
  BASIC_SET_IMPLEMENTATION_TYPE,
  SetImplementation,
  PureInstanceSetImplementation,
  MappingTest,
  ExpectedOutputMappingTestAssert,
  ObjectInputData,
  ObjectInputType,
  FlatDataInstanceSetImplementation,
  InstanceSetImplementation,
  EmbeddedFlatDataPropertyMapping,
  FlatDataInputData,
  RootFlatDataRecordType,
  PackageableElementExplicitReference,
  OptionalPackageableElementExplicitReference,
  RootFlatDataRecordTypeExplicitReference,
  RootRelationalInstanceSetImplementation,
  EmbeddedRelationalInstanceSetImplementation,
  AggregationAwareSetImplementation,
  TableAlias,
  RelationalInputData,
  RelationalInputType,
  OperationSetImplementation,
  OperationType,
  AssociationImplementation,
  InferableMappingElementIdExplicitValue,
  InferableMappingElementRootExplicitValue,
} from '@finos/legend-graph';
import { LambdaEditorState } from '@finos/legend-application';
import type { DSLMapping_LegendStudioPlugin_Extension } from '../../../DSLMapping_LegendStudioPlugin_Extension';
import type { LegendStudioPlugin } from '../../../LegendStudioPlugin';
import {
  flatData_setSourceRootRecordType,
  pureInstanceSetImpl_setSrcClass,
} from '../../../graphModifier/GraphModifierHelper';
import {
  mapping_addClassMapping,
  mapping_addEnumerationMapping,
  mapping_addTest,
  mapping_deleteAssociationMapping,
  mapping_deleteClassMapping,
  mapping_deleteEnumerationMapping,
  mapping_deleteTest,
  setImpl_updateRootOnCreate,
  setImpl_updateRootOnDelete,
} from '../../../graphModifier/DSLMapping_GraphModifierHelpers';

export interface MappingExplorerTreeNodeData extends TreeNodeData {
  mappingElement: MappingElement;
}

export const generateMappingTestName = (mapping: Mapping): string => {
  const generatedName = generateEnumerableNameFromToken(
    mapping.tests.map((test) => test.name),
    'test',
  );
  assertTrue(
    !mapping.tests.find((test) => test.name === generatedName),
    `Can't auto-generate test name for value '${generatedName}'`,
  );
  return generatedName;
};

export enum MAPPING_ELEMENT_SOURCE_ID_LABEL {
  ENUMERATION_MAPPING = 'enumerationMapping',
  OPERATION_CLASS_MAPPING = 'operationClassMapping',
  PURE_INSTANCE_CLASS_MAPPING = 'pureInstanceClassMapping',
  FLAT_DATA_CLASS_MAPPING = 'flatDataClassMapping',
  RELATIONAL_CLASS_MAPPING = 'relationalClassMapping',
  AGGREGATION_AWARE_CLASS_MAPPING = 'aggregationAwareClassMapping',
}

export enum MAPPING_ELEMENT_TYPE {
  CLASS = 'CLASS',
  ENUMERATION = 'ENUMERATION',
  ASSOCIATION = 'ASSOCIATION',
}

export type MappingElement =
  | EnumerationMapping
  | SetImplementation
  | AssociationImplementation;

/* @MARKER: NEW CLASS MAPPING TYPE SUPPORT --- consider adding class mapping type handler here whenever support for a new one is added to the app */
export type MappingElementSource =
  | Type
  | Class
  | RootFlatDataRecordType
  | TableAlias;

/* @MARKER: NEW CLASS MAPPING TYPE SUPPORT --- consider adding class mapping type handler here whenever support for a new one is added to the app */
export const getMappingElementTarget = (
  mappingElement: MappingElement,
): PackageableElement => {
  if (mappingElement instanceof EnumerationMapping) {
    return mappingElement.enumeration.value;
  } else if (mappingElement instanceof AssociationImplementation) {
    return mappingElement.association.value;
  } else if (mappingElement instanceof EmbeddedFlatDataPropertyMapping) {
    return mappingElement.class.value;
  } else if (
    mappingElement instanceof EmbeddedRelationalInstanceSetImplementation
  ) {
    return mappingElement.class.value;
  } else if (mappingElement instanceof SetImplementation) {
    return mappingElement.class.value;
  }
  throw new UnsupportedOperationError(
    `Can't derive target of mapping element`,
    mappingElement,
  );
};

export const getMappingElementSource = (
  mappingElement: MappingElement,
  plugins: LegendStudioPlugin[],
): MappingElementSource | undefined => {
  if (mappingElement instanceof OperationSetImplementation) {
    // NOTE: we don't need to resolve operation union because at the end of the day, it uses other class mappings
    // in the mapping, so if we use this method on all class mappings of a mapping, we don't miss anything
    return undefined;
  } else if (mappingElement instanceof EnumerationMapping) {
    return mappingElement.sourceType.value;
  } else if (mappingElement instanceof AssociationImplementation) {
    throw new UnsupportedOperationError();
  } else if (mappingElement instanceof PureInstanceSetImplementation) {
    return mappingElement.srcClass.value;
  } else if (mappingElement instanceof FlatDataInstanceSetImplementation) {
    return mappingElement.sourceRootRecordType.value;
  } else if (mappingElement instanceof EmbeddedFlatDataPropertyMapping) {
    return getMappingElementSource(
      guaranteeType(
        mappingElement.rootInstanceSetImplementation,
        FlatDataInstanceSetImplementation,
      ),
      plugins,
    );
  } else if (
    mappingElement instanceof RootRelationalInstanceSetImplementation
  ) {
    return mappingElement.mainTableAlias;
  } else if (
    mappingElement instanceof EmbeddedRelationalInstanceSetImplementation
  ) {
    return mappingElement.rootInstanceSetImplementation.mainTableAlias;
  } else if (mappingElement instanceof AggregationAwareSetImplementation) {
    return getMappingElementSource(
      mappingElement.mainSetImplementation,
      plugins,
    );
  }
  const extraMappingElementSourceGetters = plugins.flatMap(
    (plugin) =>
      (
        plugin as DSLMapping_LegendStudioPlugin_Extension
      ).getExtraMappingElementSourceGetters?.() ?? [],
  );
  for (const sourceGetter of extraMappingElementSourceGetters) {
    const mappingElementSource = sourceGetter(mappingElement);
    if (mappingElementSource) {
      return mappingElementSource;
    }
  }

  throw new UnsupportedOperationError(
    `Can't derive source of mapping element: no compatible source available from plugins`,
    mappingElement,
  );
};

export const getMappingElementType = (
  mappingElement: MappingElement,
): MAPPING_ELEMENT_TYPE => {
  if (mappingElement instanceof EnumerationMapping) {
    return MAPPING_ELEMENT_TYPE.ENUMERATION;
  } else if (mappingElement instanceof AssociationImplementation) {
    return MAPPING_ELEMENT_TYPE.ASSOCIATION;
  } else if (mappingElement instanceof EmbeddedFlatDataPropertyMapping) {
    return MAPPING_ELEMENT_TYPE.CLASS;
  } else if (mappingElement instanceof SetImplementation) {
    return MAPPING_ELEMENT_TYPE.CLASS;
  }
  throw new UnsupportedOperationError(
    `Can't classify mapping element`,
    mappingElement,
  );
};

export const createClassMapping = (
  mapping: Mapping,
  id: string,
  _class: Class,
  setImpType: BASIC_SET_IMPLEMENTATION_TYPE,
): SetImplementation | undefined => {
  let setImp: SetImplementation;
  // NOTE: by default when we create a new instance set implementation, we will create PURE instance set implementation
  // we don't let users choose the various instance set implementation type as that require proper source
  // e.g. flat data class mapping requires stubbing the source
  switch (setImpType) {
    case BASIC_SET_IMPLEMENTATION_TYPE.OPERATION:
      setImp = new OperationSetImplementation(
        InferableMappingElementIdExplicitValue.create(id, _class.path),
        mapping,
        PackageableElementExplicitReference.create(_class),
        InferableMappingElementRootExplicitValue.create(false),
        OperationType.STORE_UNION,
      );
      break;
    case BASIC_SET_IMPLEMENTATION_TYPE.INSTANCE:
      setImp = new PureInstanceSetImplementation(
        InferableMappingElementIdExplicitValue.create(id, _class.path),
        mapping,
        PackageableElementExplicitReference.create(_class),
        InferableMappingElementRootExplicitValue.create(false),
        OptionalPackageableElementExplicitReference.create<Class>(undefined),
      );
      break;
    default:
      return undefined;
  }
  setImpl_updateRootOnCreate(setImp);
  mapping_addClassMapping(mapping, setImp);
  return setImp;
};

export const createEnumerationMapping = (
  mapping: Mapping,
  id: string,
  enumeration: Enumeration,
  sourceType: Type,
): EnumerationMapping => {
  const enumMapping = new EnumerationMapping(
    InferableMappingElementIdExplicitValue.create(id, enumeration.path),
    PackageableElementExplicitReference.create(enumeration),
    mapping,
    OptionalPackageableElementExplicitReference.create(sourceType),
  );
  mapping_addEnumerationMapping(mapping, enumMapping);
  return enumMapping;
};

// We use get `own` Class mapping as embedded set implementations can only be within the
// current class mapping i.e current mapping.
const getEmbeddedSetImplmentations = (
  mapping: Mapping,
): InstanceSetImplementation[] =>
  mapping.allOwnClassMappings
    .filter(
      (setImpl): setImpl is InstanceSetImplementation =>
        setImpl instanceof InstanceSetImplementation,
    )
    .map((setImpl) => setImpl.getEmbeddedSetImplmentations())
    .flat();

/* @MARKER: NEW CLASS MAPPING TYPE SUPPORT --- consider adding class mapping type handler here whenever support for a new one is added to the app */
const getMappingElementByTypeAndId = (
  mapping: Mapping,
  type: string,
  id: string,
): MappingElement | undefined => {
  // NOTE: ID must be unique across all mapping elements of the same type
  switch (type) {
    case MAPPING_ELEMENT_TYPE.CLASS:
    case MAPPING_ELEMENT_SOURCE_ID_LABEL.OPERATION_CLASS_MAPPING:
    case MAPPING_ELEMENT_SOURCE_ID_LABEL.AGGREGATION_AWARE_CLASS_MAPPING:
    case MAPPING_ELEMENT_SOURCE_ID_LABEL.PURE_INSTANCE_CLASS_MAPPING:
      return mapping.allOwnClassMappings.find(
        (classMapping) => classMapping.id.value === id,
      );
    case MAPPING_ELEMENT_SOURCE_ID_LABEL.FLAT_DATA_CLASS_MAPPING:
      return (
        getAllClassMappings(mapping).find(
          (classMapping) => classMapping.id.value === id,
        ) ??
        getEmbeddedSetImplmentations(mapping)
          .filter(
            (
              a: InstanceSetImplementation,
            ): a is EmbeddedFlatDataPropertyMapping =>
              a instanceof EmbeddedFlatDataPropertyMapping,
          )
          .find((me) => me.id.value === id)
      );
    case MAPPING_ELEMENT_SOURCE_ID_LABEL.RELATIONAL_CLASS_MAPPING:
      return (
        getAllClassMappings(mapping).find(
          (classMapping) => classMapping.id.value === id,
        ) ??
        getEmbeddedSetImplmentations(mapping)
          .filter(
            (
              a: InstanceSetImplementation,
            ): a is EmbeddedRelationalInstanceSetImplementation =>
              a instanceof EmbeddedRelationalInstanceSetImplementation,
          )
          .find((me) => me.id.value === id)
      );
    case MAPPING_ELEMENT_TYPE.ASSOCIATION:
      return mapping.associationMappings.find(
        (associationMapping) => associationMapping.id.value === id,
      );
    case MAPPING_ELEMENT_TYPE.ENUMERATION:
      return getAllEnumerationMappings(mapping).find(
        (enumerationMapping) => enumerationMapping.id.value === id,
      );
    default:
      return undefined;
  }
};

// TODO?: We need to consider whther to keep this method or not, because in the future we might
// need to treat class mappings, enumeration mappings, and association mappings fairly differently
// TODO: account for mapping includes?
export const getAllMappingElements = (mapping: Mapping): MappingElement[] => [
  ...mapping.classMappings,
  ...mapping.associationMappings,
  ...mapping.enumerationMappings,
];

const constructMappingElementNodeData = (
  mappingElement: MappingElement,
): MappingExplorerTreeNodeData => ({
  id: `${mappingElement.id.value}`,
  mappingElement: mappingElement,
  label: mappingElement.label.value,
});

const getMappingElementTreeNodeData = (
  mappingElement: MappingElement,
): MappingExplorerTreeNodeData => {
  const nodeData: MappingExplorerTreeNodeData =
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
): TreeData<MappingExplorerTreeNodeData> => {
  const rootIds: string[] = [];
  const nodes = new Map<string, MappingExplorerTreeNodeData>();
  const rootMappingElements = getAllMappingElements(mapping).sort((a, b) =>
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
  treeNodes: Map<string, MappingExplorerTreeNodeData>,
  openNodes: string[],
): MappingExplorerTreeNodeData => {
  const nodeData: MappingExplorerTreeNodeData =
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
): TreeData<MappingExplorerTreeNodeData> => {
  const rootIds: string[] = [];
  const nodes = new Map<string, MappingExplorerTreeNodeData>();
  const rootMappingElements = getAllMappingElements(mapping).sort((a, b) =>
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
  target?: PackageableElement | undefined;
  postSubmitAction?: (newMappingElement: MappingElement | undefined) => void;
}

export type MappingEditorTabState =
  | MappingElementState
  | MappingTestState
  | MappingExecutionState;

export class MappingEditorState extends ElementEditorState {
  currentTabState?: MappingEditorTabState | undefined;
  openedTabStates: MappingEditorTabState[] = [];

  mappingExplorerTreeData: TreeData<MappingExplorerTreeNodeData>;
  newMappingElementSpec?: MappingElementSpec | undefined;

  mappingTestStates: MappingTestState[] = [];
  isRunningAllTests = false;
  allTestRunTime = 0;

  constructor(editorStore: EditorStore, element: PackageableElement) {
    super(editorStore, element);

    makeObservable<MappingEditorState, 'closeMappingElementTabState'>(this, {
      currentTabState: observable,
      openedTabStates: observable,
      mappingTestStates: observable,
      newMappingElementSpec: observable,
      isRunningAllTests: observable,
      allTestRunTime: observable,
      mappingExplorerTreeData: observable.ref,
      mapping: computed,
      testSuiteResult: computed,
      hasCompilationError: computed,
      setNewMappingElementSpec: action,
      setMappingExplorerTreeNodeData: action,
      openMappingElement: action,
      closeAllTabs: action,
      createMappingElement: action,
      reprocessMappingExplorerTree: action,
      mappingElementsWithSimilarTarget: computed,
      reprocess: action,
      openTab: flow,
      closeTab: flow,
      closeAllOtherTabs: flow,
      openTest: flow,
      buildExecution: flow,
      addTest: flow,
      deleteTest: flow,
      createNewTest: flow,
      runTests: flow,
      changeClassMappingSourceDriver: flow,
      closeMappingElementTabState: flow,
      deleteMappingElement: flow,
    });

    this.editorStore = editorStore;
    this.mappingTestStates = this.mapping.tests.map(
      (test) => new MappingTestState(editorStore, test, this),
    );
    this.mappingExplorerTreeData = getMappingElementTreeData(this.mapping);
  }

  get mapping(): Mapping {
    return guaranteeType(
      this.element,
      Mapping,
      'Element inside mapping editor state must be a mapping',
    );
  }

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

  setNewMappingElementSpec(spec: MappingElementSpec | undefined): void {
    this.newMappingElementSpec = spec;
  }

  // -------------------------------------- Tabs ---------------------------------------

  *openTab(tabState: MappingEditorTabState): GeneratorFn<void> {
    if (tabState !== this.currentTabState) {
      if (tabState instanceof MappingTestState) {
        yield flowResult(this.openTest(tabState.test));
      } else if (tabState instanceof MappingElementState) {
        this.openMappingElement(tabState.mappingElement, false);
      } else if (tabState instanceof MappingExecutionState) {
        this.currentTabState = tabState;
      }
    }
  }

  *closeTab(tabState: MappingEditorTabState): GeneratorFn<void> {
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
          yield flowResult(this.openTab(tabStateToOpen));
        } else {
          this.currentTabState = undefined;
        }
      } else {
        this.currentTabState = undefined;
      }
    }
  }

  *closeAllOtherTabs(tabState: MappingEditorTabState): GeneratorFn<void> {
    assertNonNullable(
      this.openedTabStates.find((ts) => ts === tabState),
      `Mapping editor tab should be currently opened`,
    );
    this.openedTabStates = [tabState];
    yield flowResult(this.openTab(tabState));
  }

  closeAllTabs(): void {
    this.currentTabState = undefined;
    this.openedTabStates = [];
  }

  // -------------------------------------- Explorer Tree ---------------------------------------

  setMappingExplorerTreeNodeData(
    data: TreeData<MappingExplorerTreeNodeData>,
  ): void {
    this.mappingExplorerTreeData = data;
  }

  onMappingExplorerTreeNodeExpand = (
    node: MappingExplorerTreeNodeData,
  ): void => {
    const mappingElement = node.mappingElement;
    const treeData = this.mappingExplorerTreeData;
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
    this.setMappingExplorerTreeNodeData({ ...treeData });
  };

  onMappingExplorerTreeNodeSelect = (
    node: MappingExplorerTreeNodeData,
  ): void => {
    this.onMappingExplorerTreeNodeExpand(node);
    this.openMappingElement(node.mappingElement, false);
  };

  getMappingExplorerTreeChildNodes = (
    node: MappingExplorerTreeNodeData,
  ): MappingExplorerTreeNodeData[] => {
    if (!node.childrenIds) {
      return [];
    }
    const childrenNodes = node.childrenIds
      .map((id) => this.mappingExplorerTreeData.nodes.get(id))
      .filter(isNonNullable)
      .sort((a, b) => a.label.localeCompare(b.label));
    return childrenNodes;
  };

  reprocessMappingExplorerTree(openNodeFoCurrentTab = false): void {
    const openedTreeNodeIds = Array.from(
      this.mappingExplorerTreeData.nodes.values(),
    )
      .filter((node) => node.isOpen)
      .map((node) => node.id);
    this.setMappingExplorerTreeNodeData(
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

  // -------------------------------------- Mapping Element ---------------------------------------

  openMappingElement(
    mappingElement: MappingElement,
    openInAdjacentTab: boolean,
  ): void {
    if (mappingElement instanceof AssociationImplementation) {
      this.editorStore.applicationStore.notifyUnsupportedFeature(
        'Association mapping editor',
      );
      return;
    }
    // Open mapping element from included mapping in another mapping editor tab
    if (mappingElement.parent !== this.element) {
      this.editorStore.openElement(mappingElement.parent);
    }
    const currentMappingEditorState =
      this.editorStore.getCurrentEditorState(MappingEditorState);
    // If the next mapping element to be opened is not opened yet, we will find the right place to put it in the tab bar
    if (
      !currentMappingEditorState.openedTabStates.find(
        (tabState) =>
          tabState instanceof MappingElementState &&
          tabState.mappingElement === mappingElement,
      )
    ) {
      const newMappingElementState = guaranteeNonNullable(
        currentMappingEditorState.createMappingElementState(mappingElement),
      );
      if (openInAdjacentTab) {
        const currentMappingElementIndex = this.openedTabStates.findIndex(
          (tabState) => tabState === this.currentTabState,
        );
        if (currentMappingElementIndex !== -1) {
          currentMappingEditorState.openedTabStates.splice(
            currentMappingElementIndex + 1,
            0,
            newMappingElementState,
          );
        } else {
          throw new IllegalStateError(`Can't find current mapping editor tab`);
        }
      } else {
        currentMappingEditorState.openedTabStates.push(newMappingElementState);
      }
    }
    // Set current mapping element, i.e. switch to new tab
    currentMappingEditorState.currentTabState =
      currentMappingEditorState.openedTabStates.find(
        (tabState) =>
          tabState instanceof MappingElementState &&
          tabState.mappingElement === mappingElement,
      );
    currentMappingEditorState.reprocessMappingExplorerTree(true);
  }

  /* @MARKER: NEW CLASS MAPPING TYPE SUPPORT --- consider adding class mapping type handler here whenever support for a new one is added to the app */
  *changeClassMappingSourceDriver(
    setImplementation: InstanceSetImplementation,
    newSource: MappingElementSource | undefined,
  ): GeneratorFn<void> {
    const currentSource = getMappingElementSource(
      setImplementation,
      this.editorStore.pluginManager.getStudioPlugins(),
    );
    if (currentSource !== newSource) {
      if (
        setImplementation instanceof PureInstanceSetImplementation &&
        (newSource instanceof Class || newSource === undefined)
      ) {
        pureInstanceSetImpl_setSrcClass(setImplementation, newSource);
      } else if (
        setImplementation instanceof FlatDataInstanceSetImplementation &&
        newSource instanceof RootFlatDataRecordType &&
        !setImplementation.getEmbeddedSetImplmentations().length
      ) {
        flatData_setSourceRootRecordType(setImplementation, newSource);
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
        } else if (newSource instanceof TableAlias) {
          const newRootRelationalInstanceSetImplementation =
            new RootRelationalInstanceSetImplementation(
              setImplementation.id,
              this.mapping,
              setImplementation.class,
              setImplementation.root,
            );
          newRootRelationalInstanceSetImplementation.mainTableAlias = newSource;
          newSetImp = newRootRelationalInstanceSetImplementation;
        } else {
          throw new UnsupportedOperationError(
            `Can't use the specified class mapping source`,
            newSource,
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
        yield flowResult(this.closeMappingElementTabState(setImplementation));
        this.reprocessMappingExplorerTree(true);
      }
    }
  }

  private *closeMappingElementTabState(
    mappingElement: MappingElement,
  ): GeneratorFn<void> {
    let mappingElementsToClose = [mappingElement];
    if (
      this.editorStore.graphManagerState.isInstanceSetImplementation(
        mappingElement,
      )
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
      yield flowResult(this.closeTab(this.currentTabState));
    }
    this.openedTabStates = this.openedTabStates.filter(
      (tabState) => !matchMappingElementState(tabState),
    );
  }

  *deleteMappingElement(mappingElement: MappingElement): GeneratorFn<void> {
    /* @MARKER: NEW CLASS MAPPING TYPE SUPPORT --- consider adding class mapping type handler here whenever support for a new one is added to the app */
    if (mappingElement instanceof EnumerationMapping) {
      mapping_deleteEnumerationMapping(this.mapping, mappingElement);
    } else if (mappingElement instanceof AssociationImplementation) {
      mapping_deleteAssociationMapping(this.mapping, mappingElement);
    } else if (mappingElement instanceof EmbeddedFlatDataPropertyMapping) {
      deleteEntry(mappingElement.owner.propertyMappings, mappingElement);
    } else if (
      mappingElement instanceof EmbeddedRelationalInstanceSetImplementation
    ) {
      deleteEntry(mappingElement.owner.propertyMappings, mappingElement);
    } else if (mappingElement instanceof SetImplementation) {
      mapping_deleteClassMapping(this.mapping, mappingElement);
    }
    if (mappingElement instanceof SetImplementation) {
      setImpl_updateRootOnDelete(mappingElement);
    }
    yield flowResult(this.closeMappingElementTabState(mappingElement));
    this.reprocessMappingExplorerTree();
  }

  /**
   * This will determine if we need to show the new mapping element modal or not
   */
  createMappingElement(spec: MappingElementSpec): void {
    if (spec.target) {
      const suggestedId = fromElementPathToMappingElementId(spec.target.path);
      const mappingIds = getAllMappingElements(this.mapping).map(
        (mElement) => mElement.id.value,
      );
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
        let newMappingElement: MappingElement | undefined = undefined;
        if (spec.target instanceof Enumeration) {
          // We default to a source type of String when creating a new enumeration mapping
          newMappingElement = createEnumerationMapping(
            this.mapping,
            suggestedId,
            spec.target,
            this.editorStore.graphManagerState.graph.getPrimitiveType(
              PRIMITIVE_TYPE.STRING,
            ),
          );
        }
        // NOTE: we don't support association now, nor do we support this for class
        // since class requires a step to choose the class mapping type
        if (newMappingElement) {
          this.openMappingElement(newMappingElement, true);
        }
        if (spec.postSubmitAction) {
          spec.postSubmitAction(newMappingElement);
        }
      }
    } else {
      this.setNewMappingElementSpec(spec);
    }
  }

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
      throw new UnsupportedOperationError(
        `Can't create mapping element state for emebdded property mapping`,
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
    const extraMappingElementStateCreators = this.editorStore.pluginManager
      .getStudioPlugins()
      .flatMap(
        (plugin) =>
          (
            plugin as DSLMapping_LegendStudioPlugin_Extension
          ).getExtraMappingElementStateCreators?.() ?? [],
      );
    for (const elementStateCreator of extraMappingElementStateCreators) {
      const mappingElementState = elementStateCreator(
        mappingElement,
        this.editorStore,
      );
      if (mappingElementState) {
        return mappingElementState;
      }
    }
    return new MappingElementState(this.editorStore, mappingElement);
  }

  // -------------------------------------- Compilation ---------------------------------------

  reprocess(newElement: Mapping, editorStore: EditorStore): MappingEditorState {
    const mappingEditorState = new MappingEditorState(editorStore, newElement);

    // process tabs
    mappingEditorState.openedTabStates = this.openedTabStates
      .map((tabState) => {
        if (tabState instanceof MappingElementState) {
          const mappingElement = getMappingElementByTypeAndId(
            mappingEditorState.mapping,
            getMappingElementType(tabState.mappingElement),
            tabState.mappingElement.id.value,
          );
          return this.createMappingElementState(mappingElement);
        } else if (tabState instanceof MappingTestState) {
          return mappingEditorState.mappingTestStates.find(
            (testState) => testState.test.name === tabState.test.name,
          );
        } else if (tabState instanceof MappingExecutionState) {
          // TODO?: re-consider if we would want to reprocess mapping execution tabs or not
          return undefined;
        }
        // TODO?: re-consider if we would want to reprocess mapping execution tabs or not
        return undefined;
      })
      .filter(isNonNullable);

    // process currently opened tab
    if (this.currentTabState instanceof MappingElementState) {
      const currentlyOpenedMappingElement = getMappingElementByTypeAndId(
        mappingEditorState.mapping,
        getMappingElementType(this.currentTabState.mappingElement),
        this.currentTabState.mappingElement.id.value,
      );
      mappingEditorState.currentTabState = this.openedTabStates.find(
        (tabState) =>
          tabState instanceof MappingElementState &&
          tabState.mappingElement === currentlyOpenedMappingElement,
      );
    } else if (this.currentTabState instanceof MappingTestState) {
      const currentlyOpenedMappingTest =
        mappingEditorState.mappingTestStates.find(
          (testState) =>
            this.currentTabState instanceof MappingTestState &&
            testState.test.name === this.currentTabState.test.name,
        )?.test;
      mappingEditorState.currentTabState = this.openedTabStates.find(
        (tabState) =>
          tabState instanceof MappingTestState &&
          tabState.test === currentlyOpenedMappingTest,
      );
    } else {
      // TODO?: re-consider if we would want to reprocess mapping execution tab or not
      mappingEditorState.currentTabState = undefined;
    }

    return mappingEditorState;
  }

  /* @MARKER: NEW CLASS MAPPING TYPE SUPPORT --- consider adding class mapping type handler here whenever support for a new one is added to the app */
  override revealCompilationError(compilationError: CompilationError): boolean {
    let revealed = false;
    try {
      if (compilationError.sourceInformation) {
        const errorCoordinates = extractSourceInformationCoordinates(
          compilationError.sourceInformation,
        );
        if (errorCoordinates) {
          const sourceId = compilationError.sourceInformation.sourceId;
          assertTrue(errorCoordinates.length >= 5);
          const [, mappingType, mappingId, propertyName, targetPropertyId] =
            errorCoordinates;
          const newMappingElement = getMappingElementByTypeAndId(
            this.mapping,
            guaranteeNonNullable(
              mappingType,
              `Can't reveal compilation error: mapping type is missing`,
            ),
            guaranteeNonNullable(
              mappingId,
              `Can't reveal compilation error: mapping ID is missing`,
            ),
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
              guaranteeNonNullable(
                propertyName,
                `Can't reveal compilation error: mapping property name is missing`,
              ),
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
                const propertyMappingState: LambdaEditorState | undefined = (
                  this.currentTabState.propertyMappingStates as unknown[]
                )
                  .filter(
                    (state): state is LambdaEditorState =>
                      state instanceof LambdaEditorState,
                  )
                  .find((state) => state.lambdaId === sourceId);
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
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.log.warn(
        LogEvent.create(GRAPH_MANAGER_EVENT.COMPILATION_FAILURE),
        `Can't locate error, redirecting to text mode`,
        error,
      );
    }
    return revealed;
  }

  override get hasCompilationError(): boolean {
    return this.openedTabStates
      .filter(
        (tabState): tabState is InstanceSetImplementationState =>
          tabState instanceof InstanceSetImplementationState,
      )
      .some((tabState) =>
        tabState.propertyMappingStates.some((pmState) =>
          Boolean(pmState.compilationError),
        ),
      );
  }

  override clearCompilationError(): void {
    this.openedTabStates
      .filter(
        (tabState): tabState is InstanceSetImplementationState =>
          tabState instanceof InstanceSetImplementationState,
      )
      .forEach((tabState) => {
        tabState.propertyMappingStates.forEach((pmState) =>
          pmState.setCompilationError(undefined),
        );
      });
  }

  // -------------------------------------- Execution ---------------------------------------

  *buildExecution(setImpl: SetImplementation): GeneratorFn<void> {
    const executionStateName = generateEnumerableNameFromToken(
      this.openedTabStates
        .filter(
          (tabState): tabState is MappingExecutionState =>
            tabState instanceof MappingExecutionState,
        )
        .map((tabState) => tabState.name),
      'execution',
    );
    assertTrue(
      !this.openedTabStates
        .filter(
          (tabState): tabState is MappingExecutionState =>
            tabState instanceof MappingExecutionState,
        )
        .find((tabState) => tabState.name === executionStateName),
      `Can't auto-generate execution name for value '${executionStateName}'`,
    );
    const executionState = new MappingExecutionState(
      this.editorStore,
      this,
      executionStateName,
    );
    yield flowResult(executionState.buildQueryWithClassMapping(setImpl));
    addUniqueEntry(this.openedTabStates, executionState);
    this.currentTabState = executionState;
  }

  // -------------------------------------- Test ---------------------------------------

  *openTest(
    test: MappingTest,
    openTab?: MAPPING_TEST_EDITOR_TAB_TYPE,
  ): GeneratorFn<void> {
    const isOpened = Boolean(
      this.openedTabStates.find(
        (tabState) =>
          tabState instanceof MappingTestState && tabState.test === test,
      ),
    );
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
    this.currentTabState = this.openedTabStates.find(
      (tabState) =>
        tabState instanceof MappingTestState && tabState.test === test,
    );
    yield flowResult(
      testState.onTestStateOpen(
        openTab ??
          // This is for user's convenience.
          // If the test is already opened, respect is currently opened tab
          // otherwise, if the test has a result, switch to show the result tab
          (!isOpened && testState.result !== TEST_RESULT.NONE
            ? MAPPING_TEST_EDITOR_TAB_TYPE.RESULT
            : undefined),
      ),
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

  *runTests(): GeneratorFn<void> {
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
  }

  *addTest(test: MappingTest): GeneratorFn<void> {
    this.mappingTestStates.push(
      new MappingTestState(this.editorStore, test, this),
    );
    mapping_addTest(this.mapping, test);
    yield flowResult(this.openTest(test));
  }

  *deleteTest(test: MappingTest): GeneratorFn<void> {
    const matchMappingTestState = (
      tabState: MappingEditorTabState | undefined,
    ): boolean =>
      tabState instanceof MappingTestState && tabState.test === test;
    mapping_deleteTest(this.mapping, test);
    if (this.currentTabState && matchMappingTestState(this.currentTabState)) {
      yield flowResult(this.closeTab(this.currentTabState));
    }
    this.openedTabStates = this.openedTabStates.filter(
      (tabState) => !matchMappingTestState(tabState),
    );
    this.mappingTestStates = this.mappingTestStates.filter(
      (tabState) => !matchMappingTestState(tabState),
    );
  }

  *createNewTest(setImplementation: SetImplementation): GeneratorFn<void> {
    const query =
      this.editorStore.graphManagerState.graphManager.HACKY_createGetAllLambda(
        setImplementation.class.value,
      );
    const source = getMappingElementSource(
      setImplementation,
      this.editorStore.pluginManager.getStudioPlugins(),
    );
    if (setImplementation instanceof OperationSetImplementation) {
      this.editorStore.applicationStore.notifyWarning(
        `Can't auto-generate input data for operation class mapping. Please pick a concrete class mapping instead`,
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
    } else if (source instanceof TableAlias) {
      inputData = new RelationalInputData(
        PackageableElementExplicitReference.create(
          source.relation.ownerReference.value,
        ),
        createMockDataForMappingElementSource(source, this.editorStore),
        RelationalInputType.SQL,
      );
    } else {
      throw new UnsupportedOperationError(
        `Can't create new mapping test input data with the specified source`,
        source,
      );
    }
    const newTest = new MappingTest(
      generateMappingTestName(this.mapping),
      query,
      [inputData],
      new ExpectedOutputMappingTestAssert('{}'),
    );
    mapping_addTest(this.mapping, newTest);
    // open the test
    this.mappingTestStates.push(
      new MappingTestState(this.editorStore, newTest, this),
    );
    yield flowResult(this.openTest(newTest));
  }
}
