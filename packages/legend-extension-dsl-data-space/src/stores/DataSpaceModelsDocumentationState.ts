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
import { type DataSpaceViewerState } from './DataSpaceViewerState.js';
import { type TreeData, type TreeNodeData } from '@finos/legend-art';
import {
  ActionState,
  filterByType,
  guaranteeNonNullable,
  FuzzySearchEngine,
  FuzzySearchAdvancedConfigState,
} from '@finos/legend-shared';
import {
  DataSpaceAssociationDocumentationEntry,
  DataSpaceClassDocumentationEntry,
  DataSpaceEnumerationDocumentationEntry,
  DataSpaceModelDocumentationEntry,
  type NormalizedDataSpaceDocumentationEntry,
} from '../graph-manager/action/analytics/DataSpaceAnalysis.js';
import { CORE_PURE_PATH, ELEMENT_PATH_DELIMITER } from '@finos/legend-graph';
import type { CommandRegistrar } from '@finos/legend-application';
import { DSL_DATA_SPACE_LEGEND_APPLICATION_COMMAND_KEY } from '../__lib__/DSL_DataSpace_LegendApplicationCommand.js';
import { DATA_SPACE_VIEWER_ACTIVITY_MODE } from './DataSpaceViewerNavigation.js';

export enum ModelsDocumentationFilterTreeNodeCheckType {
  CHECKED,
  UNCHECKED,
  PARTIALLY_CHECKED,
}

export abstract class ModelsDocumentationFilterTreeNodeData
  implements TreeNodeData
{
  readonly id: string;
  readonly label: string;
  readonly parentNode: ModelsDocumentationFilterTreeNodeData | undefined;
  isOpen = false;
  childrenIds: string[] = [];
  childrenNodes: ModelsDocumentationFilterTreeNodeData[] = [];
  // By default all nodes are checked
  checkType = ModelsDocumentationFilterTreeNodeCheckType.CHECKED;

  constructor(
    id: string,
    label: string,
    parentNode: ModelsDocumentationFilterTreeNodeData | undefined,
  ) {
    makeObservable(this, {
      isOpen: observable,
      checkType: observable,
      setIsOpen: action,
      setCheckType: action,
    });

    this.id = id;
    this.label = label;
    this.parentNode = parentNode;
  }

  setIsOpen(val: boolean): void {
    this.isOpen = val;
  }

  setCheckType(val: ModelsDocumentationFilterTreeNodeCheckType): void {
    this.checkType = val;
  }
}

export class ModelsDocumentationFilterTreeRootNodeData extends ModelsDocumentationFilterTreeNodeData {}

export class ModelsDocumentationFilterTreePackageNodeData extends ModelsDocumentationFilterTreeNodeData {
  declare parentNode: ModelsDocumentationFilterTreeNodeData;
  packagePath: string;

  constructor(
    id: string,
    label: string,
    parentNode: ModelsDocumentationFilterTreeNodeData,
    packagePath: string,
  ) {
    super(id, label, parentNode);
    this.packagePath = packagePath;
  }
}

export class ModelsDocumentationFilterTreeElementNodeData extends ModelsDocumentationFilterTreeNodeData {
  declare parentNode: ModelsDocumentationFilterTreeNodeData;
  elementPath: string;
  typePath: CORE_PURE_PATH | undefined;

  constructor(
    id: string,
    label: string,
    parentNode: ModelsDocumentationFilterTreeNodeData,
    elementPath: string,
    typePath: CORE_PURE_PATH | undefined,
  ) {
    super(id, label, parentNode);
    this.elementPath = elementPath;
    this.typePath = typePath;
  }
}

export class ModelsDocumentationFilterTreeTypeNodeData extends ModelsDocumentationFilterTreeNodeData {
  declare parentNode: ModelsDocumentationFilterTreeNodeData;
  typePath: CORE_PURE_PATH;

  constructor(
    id: string,
    label: string,
    parentNode: ModelsDocumentationFilterTreeNodeData,
    typePath: CORE_PURE_PATH,
  ) {
    super(id, label, parentNode);
    this.typePath = typePath;
  }
}

const trickleDownUncheckNodeChildren = (
  node: ModelsDocumentationFilterTreeNodeData,
): void => {
  node.setCheckType(ModelsDocumentationFilterTreeNodeCheckType.UNCHECKED);
  node.childrenNodes.forEach((childNode) =>
    trickleDownUncheckNodeChildren(childNode),
  );
};

const trickleUpUncheckNode = (
  node: ModelsDocumentationFilterTreeNodeData,
): void => {
  const parentNode = node.parentNode;
  if (!parentNode) {
    return;
  }
  if (
    parentNode.childrenNodes.some(
      (childNode) =>
        childNode.checkType ===
        ModelsDocumentationFilterTreeNodeCheckType.CHECKED,
    )
  ) {
    parentNode.setCheckType(
      ModelsDocumentationFilterTreeNodeCheckType.PARTIALLY_CHECKED,
    );
  } else {
    parentNode.setCheckType(
      ModelsDocumentationFilterTreeNodeCheckType.UNCHECKED,
    );
  }

  trickleUpUncheckNode(parentNode);
};

export const uncheckFilterTreeNode = (
  node: ModelsDocumentationFilterTreeNodeData,
): void => {
  trickleDownUncheckNodeChildren(node);
  trickleUpUncheckNode(node);
};

const trickleDownCheckNode = (
  node: ModelsDocumentationFilterTreeNodeData,
): void => {
  node.setCheckType(ModelsDocumentationFilterTreeNodeCheckType.CHECKED);
  node.childrenNodes.forEach((childNode) => trickleDownCheckNode(childNode));
};

const trickleUpCheckNode = (
  node: ModelsDocumentationFilterTreeNodeData,
): void => {
  const parentNode = node.parentNode;
  if (!parentNode) {
    return;
  }
  if (
    parentNode.childrenNodes.every(
      (childNode) =>
        childNode.checkType ===
        ModelsDocumentationFilterTreeNodeCheckType.CHECKED,
    )
  ) {
    parentNode.setCheckType(ModelsDocumentationFilterTreeNodeCheckType.CHECKED);
  } else {
    parentNode.setCheckType(
      ModelsDocumentationFilterTreeNodeCheckType.PARTIALLY_CHECKED,
    );
  }

  trickleUpCheckNode(parentNode);
};

export const checkFilterTreeNode = (
  node: ModelsDocumentationFilterTreeNodeData,
): void => {
  trickleDownCheckNode(node);
  trickleUpCheckNode(node);
};

export const uncheckAllFilterTree = (
  treeData: TreeData<ModelsDocumentationFilterTreeNodeData>,
): void => {
  treeData.nodes.forEach((node) =>
    node.setCheckType(ModelsDocumentationFilterTreeNodeCheckType.UNCHECKED),
  );
};

const buildTypeFilterTreeData =
  (): TreeData<ModelsDocumentationFilterTreeNodeData> => {
    const rootIds: string[] = [];
    const nodes = new Map<string, ModelsDocumentationFilterTreeNodeData>();

    // all node
    const allNode = new ModelsDocumentationFilterTreeRootNodeData(
      'all',
      'All Types',
      undefined,
    );
    rootIds.push(allNode.id);
    allNode.setIsOpen(true); // open the root node by default
    nodes.set(allNode.id, allNode);

    // type nodes
    const classNode = new ModelsDocumentationFilterTreeTypeNodeData(
      'class',
      'Class',
      allNode,
      CORE_PURE_PATH.CLASS,
    );
    allNode.childrenIds.push(classNode.id);
    nodes.set(classNode.id, classNode);

    const enumerationNode = new ModelsDocumentationFilterTreeTypeNodeData(
      'enumeration',
      'Enumeration',
      allNode,
      CORE_PURE_PATH.ENUMERATION,
    );
    allNode.childrenIds.push(enumerationNode.id);
    nodes.set(enumerationNode.id, enumerationNode);

    const associationNode = new ModelsDocumentationFilterTreeTypeNodeData(
      'association',
      'Association',
      allNode,
      CORE_PURE_PATH.ASSOCIATION,
    );
    allNode.childrenIds.push(associationNode.id);
    nodes.set(associationNode.id, associationNode);
    allNode.childrenNodes = [classNode, enumerationNode, associationNode];

    return {
      rootIds,
      nodes,
    };
  };

const buildPackageFilterTreeData = (
  modelDocEntries: DataSpaceModelDocumentationEntry[],
): TreeData<ModelsDocumentationFilterTreeNodeData> => {
  const rootIds: string[] = [];
  const nodes = new Map<string, ModelsDocumentationFilterTreeNodeData>();

  // all node
  const allNode = new ModelsDocumentationFilterTreeRootNodeData(
    'all',
    'All Packages',
    undefined,
  );
  rootIds.push(allNode.id);
  allNode.setIsOpen(true); // open the root node by default
  nodes.set(allNode.id, allNode);

  modelDocEntries.forEach((entry) => {
    const path = entry.path;
    const chunks = path.split(ELEMENT_PATH_DELIMITER);
    let currentParentNode = allNode;
    for (let i = 0; i < chunks.length; i++) {
      const chunk = guaranteeNonNullable(chunks[i]);
      const elementPath = `${
        currentParentNode === allNode
          ? ''
          : `${currentParentNode.id}${ELEMENT_PATH_DELIMITER}`
      }${chunk}`;
      const nodeId = elementPath;
      let node = nodes.get(nodeId);
      if (!node) {
        if (i === chunks.length - 1) {
          node = new ModelsDocumentationFilterTreeElementNodeData(
            nodeId,
            chunk,
            currentParentNode,
            elementPath,
            entry instanceof DataSpaceClassDocumentationEntry
              ? CORE_PURE_PATH.CLASS
              : entry instanceof DataSpaceEnumerationDocumentationEntry
                ? CORE_PURE_PATH.ENUMERATION
                : entry instanceof DataSpaceAssociationDocumentationEntry
                  ? CORE_PURE_PATH.ASSOCIATION
                  : undefined,
          );
        } else {
          node = new ModelsDocumentationFilterTreePackageNodeData(
            nodeId,
            chunk,
            currentParentNode,
            elementPath,
          );
        }
        nodes.set(nodeId, node);
        currentParentNode.childrenIds.push(nodeId);
        currentParentNode.childrenNodes.push(node);
      }
      currentParentNode = node;
    }
  });

  return {
    rootIds,
    nodes,
  };
};

export class DataSpaceViewerModelsDocumentationState
  implements CommandRegistrar
{
  readonly dataSpaceViewerState: DataSpaceViewerState;

  showHumanizedForm = true;

  // search text
  private searchInput?: HTMLInputElement | undefined;
  private readonly searchEngine: FuzzySearchEngine<NormalizedDataSpaceDocumentationEntry>;
  searchConfigurationState: FuzzySearchAdvancedConfigState;
  readonly searchState = ActionState.create();
  searchText: string;
  searchResults: NormalizedDataSpaceDocumentationEntry[] = [];
  showSearchConfigurationMenu = false;

  // filter
  showFilterPanel = true;
  typeFilterTreeData: TreeData<ModelsDocumentationFilterTreeNodeData>;
  packageFilterTreeData: TreeData<ModelsDocumentationFilterTreeNodeData>;
  filterTypes: string[] = [];
  filterPaths: string[] = [];

  constructor(dataSpaceViewerState: DataSpaceViewerState) {
    makeObservable(this, {
      showHumanizedForm: observable,
      searchText: observable,
      // NOTE: we use `observable.struct` for these to avoid unnecessary re-rendering of the grid
      searchResults: observable.struct,
      filterTypes: observable.struct,
      filterPaths: observable.struct,
      showSearchConfigurationMenu: observable,
      showFilterPanel: observable,
      typeFilterTreeData: observable.ref,
      packageFilterTreeData: observable.ref,
      filteredSearchResults: computed,
      isTypeFilterCustomized: computed,
      isPackageFilterCustomized: computed,
      isFilterCustomized: computed,
      setShowHumanizedForm: action,
      setSearchText: action,
      resetSearch: action,
      search: action,
      setShowSearchConfigurationMenu: action,
      setShowFilterPanel: action,
      resetTypeFilterTreeData: action,
      resetPackageFilterTreeData: action,
      updateTypeFilter: action,
      updatePackageFilter: action,
      resetTypeFilter: action,
      resetPackageFilter: action,
      resetAllFilters: action,
    });

    this.dataSpaceViewerState = dataSpaceViewerState;
    this.searchEngine = new FuzzySearchEngine(
      this.dataSpaceViewerState.dataSpaceAnalysisResult.elementDocs,
      {
        includeScore: true,
        // NOTE: we must not sort/change the order in the grid since
        // we want to ensure the element row is on top
        shouldSort: false,
        // Ignore location when computing the search score
        // See https://fusejs.io/concepts/scoring-theory.html
        ignoreLocation: true,
        // This specifies the point the search gives up
        // `0.0` means exact match where `1.0` would match anything
        // We set a relatively low threshold to filter out irrelevant results
        threshold: 0.2,
        keys: [
          {
            name: 'text',
            weight: 3,
          },
          {
            name: 'humanizedText',
            weight: 3,
          },
          {
            name: 'elementEntry.name',
            weight: 3,
          },
          {
            name: 'elementEntry.humanizedName',
            weight: 3,
          },
          {
            name: 'entry.name',
            weight: 2,
          },
          {
            name: 'entry.humanizedName',
            weight: 2,
          },
          {
            name: 'documentation',
            weight: 4,
          },
        ],
        // extended search allows for exact word match through single quote
        // See https://fusejs.io/examples.html#extended-search
        useExtendedSearch: true,
      },
    );
    this.searchConfigurationState = new FuzzySearchAdvancedConfigState(
      (): void => this.search(),
    );
    this.searchText = '';
    this.searchResults =
      this.dataSpaceViewerState.dataSpaceAnalysisResult.elementDocs;

    this.typeFilterTreeData = buildTypeFilterTreeData();
    this.packageFilterTreeData = buildPackageFilterTreeData(
      this.dataSpaceViewerState.dataSpaceAnalysisResult.elementDocs
        .map((entry) => entry.entry)
        .filter(filterByType(DataSpaceModelDocumentationEntry)),
    );
    this.updateTypeFilter();
    this.updatePackageFilter();
  }

  get filteredSearchResults(): NormalizedDataSpaceDocumentationEntry[] {
    return (
      this.searchResults
        // filter by types
        .filter(
          (result) =>
            (this.filterTypes.includes(CORE_PURE_PATH.CLASS) &&
              result.elementEntry instanceof
                DataSpaceClassDocumentationEntry) ||
            (this.filterTypes.includes(CORE_PURE_PATH.ENUMERATION) &&
              result.elementEntry instanceof
                DataSpaceEnumerationDocumentationEntry) ||
            (this.filterTypes.includes(CORE_PURE_PATH.ASSOCIATION) &&
              result.elementEntry instanceof
                DataSpaceAssociationDocumentationEntry),
        )
        // filter by paths
        .filter((result) => this.filterPaths.includes(result.elementEntry.path))
    );
  }

  get isTypeFilterCustomized(): boolean {
    return Array.from(this.typeFilterTreeData.nodes.values()).some(
      (node) =>
        node.checkType === ModelsDocumentationFilterTreeNodeCheckType.UNCHECKED,
    );
  }

  get isPackageFilterCustomized(): boolean {
    return Array.from(this.packageFilterTreeData.nodes.values()).some(
      (node) =>
        node.checkType === ModelsDocumentationFilterTreeNodeCheckType.UNCHECKED,
    );
  }

  get isFilterCustomized(): boolean {
    return this.isTypeFilterCustomized || this.isPackageFilterCustomized;
  }

  setShowHumanizedForm(val: boolean): void {
    this.showHumanizedForm = val;
  }

  setSearchText(val: string): void {
    this.searchText = val;
  }

  resetSearch(): void {
    this.searchText = '';
    this.searchResults =
      this.dataSpaceViewerState.dataSpaceAnalysisResult.elementDocs;
    this.searchState.complete();
  }

  search(): void {
    if (!this.searchText) {
      this.searchResults =
        this.dataSpaceViewerState.dataSpaceAnalysisResult.elementDocs;
      return;
    }
    this.searchState.inProgress();
    this.searchResults = Array.from(
      this.searchEngine
        .search(
          this.searchConfigurationState.generateSearchText(this.searchText),
        )
        .values(),
    ).map((result) => result.item);

    this.searchState.complete();
  }

  setShowSearchConfigurationMenu(val: boolean): void {
    this.showSearchConfigurationMenu = val;
  }

  setShowFilterPanel(val: boolean): void {
    this.showFilterPanel = val;
  }

  resetTypeFilterTreeData(): void {
    this.typeFilterTreeData = { ...this.typeFilterTreeData };
  }

  resetPackageFilterTreeData(): void {
    this.packageFilterTreeData = { ...this.packageFilterTreeData };
  }

  updateTypeFilter(): void {
    const types: string[] = [];
    this.typeFilterTreeData.nodes.forEach((node) => {
      if (
        node instanceof ModelsDocumentationFilterTreeTypeNodeData &&
        node.checkType === ModelsDocumentationFilterTreeNodeCheckType.CHECKED
      ) {
        types.push(node.typePath);
      }
    });
    // NOTE: sort to avoid unnecessary re-computation of filtered search results
    this.filterTypes = types.toSorted((a, b) => a.localeCompare(b));
  }

  updatePackageFilter(): void {
    const elementPaths: string[] = [];
    this.packageFilterTreeData.nodes.forEach((node) => {
      if (
        node instanceof ModelsDocumentationFilterTreeElementNodeData &&
        node.checkType === ModelsDocumentationFilterTreeNodeCheckType.CHECKED
      ) {
        elementPaths.push(node.elementPath);
      }
    });
    // NOTE: sort to avoid unnecessary re-computation of filtered search results
    this.filterPaths = elementPaths.toSorted((a, b) => a.localeCompare(b));
  }

  resetTypeFilter(): void {
    this.typeFilterTreeData.nodes.forEach((node) =>
      node.setCheckType(ModelsDocumentationFilterTreeNodeCheckType.CHECKED),
    );
    this.updateTypeFilter();
    this.resetTypeFilterTreeData();
  }

  resetPackageFilter(): void {
    this.packageFilterTreeData.nodes.forEach((node) =>
      node.setCheckType(ModelsDocumentationFilterTreeNodeCheckType.CHECKED),
    );
    this.updatePackageFilter();
    this.resetPackageFilterTreeData();
  }

  resetAllFilters(): void {
    this.resetTypeFilter();
    this.resetPackageFilter();
  }

  hasClassDocumentation(classPath: string): boolean {
    return this.dataSpaceViewerState.dataSpaceAnalysisResult.elementDocs.some(
      (entry) => entry.elementEntry.path === classPath,
    );
  }

  viewClassDocumentation(classPath: string): void {
    if (this.hasClassDocumentation(classPath)) {
      const classNode = this.packageFilterTreeData.nodes.get(classPath);
      if (classNode) {
        uncheckAllFilterTree(this.packageFilterTreeData);
        trickleDownCheckNode(classNode);
        trickleUpCheckNode(classNode);
        classNode.setCheckType(
          ModelsDocumentationFilterTreeNodeCheckType.CHECKED,
        );
        this.resetSearch();
        this.updatePackageFilter();
      }
    }
  }

  setSearchInput(el: HTMLInputElement | undefined): void {
    this.searchInput = el;
  }

  focusSearchInput(): void {
    this.searchInput?.focus();
  }

  selectSearchInput(): void {
    this.searchInput?.select();
  }

  registerCommands(): void {
    const DEFAULT_TRIGGER = (): boolean =>
      this.dataSpaceViewerState.currentActivity ===
      DATA_SPACE_VIEWER_ACTIVITY_MODE.MODELS_DOCUMENTATION;
    this.dataSpaceViewerState.applicationStore.commandService.registerCommand({
      key: DSL_DATA_SPACE_LEGEND_APPLICATION_COMMAND_KEY.SEARCH_DOCUMENTATION,
      trigger: DEFAULT_TRIGGER,
      action: () => this.focusSearchInput(),
    });
  }

  deregisterCommands(): void {
    [
      DSL_DATA_SPACE_LEGEND_APPLICATION_COMMAND_KEY.SEARCH_DOCUMENTATION,
    ].forEach((commandKey) =>
      this.dataSpaceViewerState.applicationStore.commandService.deregisterCommand(
        commandKey,
      ),
    );
  }
}
