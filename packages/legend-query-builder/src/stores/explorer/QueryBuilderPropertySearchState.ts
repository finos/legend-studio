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
  Class,
  getAllOwnClassProperties,
  getAllClassProperties,
  getAllClassDerivedProperties,
  PrimitiveType,
  PRIMITIVE_TYPE,
  CORE_PURE_PATH,
  PURE_DOC_TAG,
  Enumeration,
} from '@finos/legend-graph';
import {
  type FuzzySearchEngineSortFunctionArg,
  ActionState,
  FuzzySearchEngine,
  addUniqueEntry,
  deleteEntry,
  guaranteeNonNullable,
  isNonNullable,
} from '@finos/legend-shared';
import {
  observable,
  computed,
  action,
  makeObservable,
  runInAction,
} from 'mobx';
import {
  QUERY_BUILDER_PROPERTY_SEARCH_MAX_DEPTH,
  QUERY_BUILDER_PROPERTY_SEARCH_RESULTS_LIMIT,
  QUERY_BUILDER_PROPERTY_SEARCH_TYPE,
  QUERY_BUILDER_PROPERTY_SEARCH_MAX_NODES,
} from '../QueryBuilderConfig.js';
import {
  type QueryBuilderExplorerTreeNodeData,
  getQueryBuilderPropertyNodeData,
  getQueryBuilderSubTypeNodeData,
  QueryBuilderExplorerTreePropertyNodeData,
  QueryBuilderExplorerTreeSubTypeNodeData,
  cloneQueryBuilderExplorerTreeNodeData,
  QueryBuilderExplorerTreeRootNodeData,
} from './QueryBuilderExplorerState.js';
import type { QueryBuilderState } from '../QueryBuilderState.js';
import { QueryBuilderFuzzySearchAdvancedConfigState } from './QueryBuilderFuzzySearchAdvancedConfigState.js';
import {
  prettyPropertyNameForSubType,
  prettyPropertyNameFromNodeId,
} from '../../components/explorer/QueryBuilderPropertySearchPanel.js';

export class QueryBuilderPropertySearchState {
  queryBuilderState: QueryBuilderState;

  /**
   * When we initialize property search engine, we practically extend
   * the existing explorer by a few depth. As such, we create new explorer
   * nodes which are not part of the main explorer tree. Together with the
   * nodes already explored in the tree, these nodes are stored here to help
   * searching. Think of this as the knowledge base of property search
   *
   * NOTE: a big reason why we want to store these as explorer tree nodes
   * is that we could interact with the searched nodes, i.e. drag them to
   * various panels to create filter, fetch-structure, etc.
   */
  indexedExplorerTreeNodeMap: Map<string, QueryBuilderExplorerTreeNodeData> =
    new Map();

  // search
  searchEngine: FuzzySearchEngine<QueryBuilderExplorerTreeNodeData>;
  searchConfigurationState: QueryBuilderFuzzySearchAdvancedConfigState;
  initializationState = ActionState.create();
  searchState = ActionState.create();
  searchText = '';
  searchResults: QueryBuilderExplorerTreeNodeData[] = [];
  isOverSearchLimit = false;
  isSearchPanelOpen = false;
  isSearchPanelHidden = false;
  showSearchConfigurationMenu = false;

  // filter
  typeFilters = [
    QUERY_BUILDER_PROPERTY_SEARCH_TYPE.CLASS,
    QUERY_BUILDER_PROPERTY_SEARCH_TYPE.ENUMERATION,
    QUERY_BUILDER_PROPERTY_SEARCH_TYPE.STRING,
    QUERY_BUILDER_PROPERTY_SEARCH_TYPE.BOOLEAN,
    QUERY_BUILDER_PROPERTY_SEARCH_TYPE.NUMBER,
    QUERY_BUILDER_PROPERTY_SEARCH_TYPE.DATE,
  ];

  constructor(queryBuilderState: QueryBuilderState) {
    makeObservable(this, {
      indexedExplorerTreeNodeMap: observable,
      searchText: observable,
      searchResults: observable,
      isOverSearchLimit: observable,
      isSearchPanelOpen: observable,
      isSearchPanelHidden: observable,
      showSearchConfigurationMenu: observable,
      typeFilters: observable,
      indexedExplorerTreeNodes: computed,
      filteredSearchResults: computed,
      search: action,
      resetSearch: action,
      setSearchResults: action,
      setIsOverSearchLimit: action,
      setSearchText: action,
      setShowSearchConfigurationMenu: action,
      setIsSearchPanelOpen: action,
      setIsSearchPanelHidden: action,
      toggleFilterForType: action,
      initialize: action,
    });

    this.queryBuilderState = queryBuilderState;
    this.searchConfigurationState =
      new QueryBuilderFuzzySearchAdvancedConfigState(
        async (): Promise<void> => this.search(),
        this.queryBuilderState.applicationStore.alertUnhandledError,
      );
    this.searchEngine = new FuzzySearchEngine(this.indexedExplorerTreeNodes);
  }

  setIsSearchPanelOpen(val: boolean): void {
    this.isSearchPanelOpen = val;
  }

  setIsSearchPanelHidden(val: boolean): void {
    this.isSearchPanelHidden = val;
  }

  setShowSearchConfigurationMenu(val: boolean): void {
    this.showSearchConfigurationMenu = val;
  }

  setSearchResults(val: QueryBuilderExplorerTreeNodeData[]): void {
    this.searchResults = val;
  }

  setIsOverSearchLimit(val: boolean): void {
    this.isOverSearchLimit = val;
  }

  setSearchText(val: string): void {
    this.searchText = val;
  }

  resetSearch(): void {
    this.searchText = '';
    this.searchResults = [];
    this.indexedExplorerTreeNodes.forEach((node) => {
      if (!(node instanceof QueryBuilderExplorerTreeRootNodeData)) {
        node.setIsOpen(false);
      }
    });
    this.searchState.complete();
  }

  toggleFilterForType(val: QUERY_BUILDER_PROPERTY_SEARCH_TYPE): void {
    if (this.typeFilters.includes(val)) {
      deleteEntry(this.typeFilters, val);
    } else {
      addUniqueEntry(this.typeFilters, val);
    }
  }

  async search(): Promise<void> {
    if (!this.searchText) {
      this.setSearchResults([]);
      return Promise.resolve();
    }

    this.searchState.inProgress();

    // Perform the search in a setTimeout so we can execute it asynchronously and
    // show the loading indicator while search is in progress.
    return new Promise((resolve) =>
      setTimeout(() => {
        // NOTE: performanced of fuzzy search is impacted by the number of indexed entries and the length
        // of the search pattern, so to a certain extent this could become laggy. If this becomes too inconvenient
        // for the users, we might need to use another fuzzy-search implementation, or have appropriate search
        // policy, e.g. limit length of search text, etc.
        //
        // See https://github.com/farzher/fuzzysort

        const classNodes: Map<string, QueryBuilderExplorerTreeNodeData> =
          new Map();

        const searchResults = Array.from(
          this.searchEngine
            .search(
              this.searchConfigurationState.generateSearchText(
                this.searchText.toLowerCase(),
              ),
              {
                // NOTE: search for limit + 1 item so we can know if there are more search results
                limit: QUERY_BUILDER_PROPERTY_SEARCH_RESULTS_LIMIT + 1,
              },
            )
            .values(),
        )
          .map((result) => result.item)
          .map((node) => {
            if (node.type instanceof Class) {
              classNodes.set(node.id, node);
            }
            return node;
          })
          .filter((node) => {
            // Filter out nodes if their parent class node is already in the results.
            if (
              (node instanceof QueryBuilderExplorerTreePropertyNodeData ||
                node instanceof QueryBuilderExplorerTreeSubTypeNodeData) &&
              classNodes.has(node.parentId)
            ) {
              return false;
            }
            return true;
          });

        // check if the search results exceed the limit
        if (
          searchResults.length > QUERY_BUILDER_PROPERTY_SEARCH_RESULTS_LIMIT
        ) {
          this.setIsOverSearchLimit(true);
          this.setSearchResults(
            searchResults.slice(0, QUERY_BUILDER_PROPERTY_SEARCH_RESULTS_LIMIT),
          );
        } else {
          this.setIsOverSearchLimit(false);
          this.setSearchResults(searchResults);
        }

        this.searchState.complete();
        resolve();
      }, 0),
    );
  }

  /**
   * From the current explorer tree, navigate breadth-first to find more mapped
   * property nodes, then index these property nodes for searching.
   *
   * NOTE: fortunately, since we restrict the depth and number of nodes in this navigation
   * this process is often not the performance bottleneck, else, we would need to make this
   * asynchronous and block the UI while waiting.
   */
  async initialize(): Promise<void> {
    this.initializationState.inProgress();

    // Perform the initialization in a setTimeout so we can execute it asynchronously and
    // show the loading indicator while initialization is in progress.
    return new Promise((resolve) =>
      setTimeout(() => {
        const treeData =
          this.queryBuilderState.explorerState.nonNullableTreeData;
        const rootNodeMap = new Map(
          treeData.rootIds
            .map((rootId) => treeData.nodes.get(rootId))
            .filter(isNonNullable)
            .map((rootNode) => [rootNode.id, rootNode]),
        );
        this.indexedExplorerTreeNodeMap = new Map();

        let currentLevelPropertyNodes: QueryBuilderExplorerTreeNodeData[] = [];
        let nextLevelPropertyNodes: QueryBuilderExplorerTreeNodeData[] = [];

        // Get all the children of the root node(s)
        Array.from(
          treeData.rootIds
            .map((rootId) =>
              treeData.nodes
                .get(rootId)
                ?.childrenIds.map((childId) => treeData.nodes.get(childId)),
            )
            .flat()
            .filter(isNonNullable)
            .filter((node) =>
              node.mappingData.mapped &&
              this.searchConfigurationState.includeSubTypes
                ? true
                : node instanceof QueryBuilderExplorerTreePropertyNodeData,
            ),
        ).forEach((node) => {
          if (node.mappingData.mapped && !node.isPartOfDerivedPropertyBranch) {
            const clonedNode = cloneQueryBuilderExplorerTreeNodeData(node);
            currentLevelPropertyNodes.push(clonedNode);
            this.indexedExplorerTreeNodeMap.set(clonedNode.id, clonedNode);
          }
        });

        // ensure we don't navigate more nodes than the limit so we could
        // keep the initialization/indexing time within acceptable range
        const NODE_LIMIT =
          this.indexedExplorerTreeNodeMap.size +
          QUERY_BUILDER_PROPERTY_SEARCH_MAX_NODES;
        const addNode = (node: QueryBuilderExplorerTreeNodeData): void =>
          runInAction(() => {
            if (this.indexedExplorerTreeNodeMap.size > NODE_LIMIT) {
              return;
            }
            const clonedNode = cloneQueryBuilderExplorerTreeNodeData(node);
            this.indexedExplorerTreeNodeMap.set(clonedNode.id, clonedNode);
          });

        // helper function to check if a node has the same type as one of its
        // ancestor nodes. This allows us to avoid including circular dependencies
        // in the indexed nodes list.
        const nodeHasSameTypeAsAncestor = (
          node: QueryBuilderExplorerTreeNodeData,
        ): boolean => {
          if (
            node instanceof QueryBuilderExplorerTreePropertyNodeData ||
            node instanceof QueryBuilderExplorerTreeSubTypeNodeData
          ) {
            let ancestor =
              this.indexedExplorerTreeNodeMap.get(node.parentId) ??
              rootNodeMap.get(node.parentId);
            while (ancestor) {
              if (node.type === ancestor.type) {
                return true;
              }
              ancestor =
                ancestor instanceof QueryBuilderExplorerTreePropertyNodeData ||
                ancestor instanceof QueryBuilderExplorerTreeSubTypeNodeData
                  ? (this.indexedExplorerTreeNodeMap.get(ancestor.parentId) ??
                    rootNodeMap.get(ancestor.parentId))
                  : undefined;
            }
          }
          return false;
        };

        // limit the depth of navigation to keep the initialization/indexing
        // time within acceptable range
        let currentDepth = 1;
        while (
          currentLevelPropertyNodes.length &&
          currentDepth <= QUERY_BUILDER_PROPERTY_SEARCH_MAX_DEPTH
        ) {
          const node = currentLevelPropertyNodes.shift();
          if (
            node?.mappingData.mapped &&
            node.childrenIds.length &&
            (node instanceof QueryBuilderExplorerTreePropertyNodeData ||
              (this.searchConfigurationState.includeSubTypes &&
                node instanceof QueryBuilderExplorerTreeSubTypeNodeData)) &&
            node.type instanceof Class
          ) {
            (node instanceof QueryBuilderExplorerTreeSubTypeNodeData
              ? getAllOwnClassProperties(node.type)
              : getAllClassProperties(node.type).concat(
                  getAllClassDerivedProperties(node.type),
                )
            ).forEach((property) => {
              const propertyTreeNodeData = getQueryBuilderPropertyNodeData(
                property,
                node,
                guaranteeNonNullable(
                  this.queryBuilderState.explorerState
                    .mappingModelCoverageAnalysisResult,
                ),
              );
              if (
                propertyTreeNodeData &&
                propertyTreeNodeData.mappingData.mapped &&
                !propertyTreeNodeData.isPartOfDerivedPropertyBranch &&
                !nodeHasSameTypeAsAncestor(propertyTreeNodeData)
              ) {
                nextLevelPropertyNodes.push(propertyTreeNodeData);
                addNode(propertyTreeNodeData);
              }
            });
            if (this.searchConfigurationState.includeSubTypes) {
              node.type._subclasses.forEach((subclass) => {
                const subTypeTreeNodeData = getQueryBuilderSubTypeNodeData(
                  subclass,
                  node,
                  guaranteeNonNullable(
                    this.queryBuilderState.explorerState
                      .mappingModelCoverageAnalysisResult,
                  ),
                );
                if (
                  subTypeTreeNodeData.mappingData.mapped &&
                  !nodeHasSameTypeAsAncestor(subTypeTreeNodeData)
                ) {
                  nextLevelPropertyNodes.push(subTypeTreeNodeData);
                  addNode(subTypeTreeNodeData);
                }
              });
            }
          }

          // when we done processing one depth, we will do check on the depth and the total
          // number of indexed nodes to figure out if we should proceed further
          if (
            !currentLevelPropertyNodes.length &&
            this.indexedExplorerTreeNodeMap.size < NODE_LIMIT
          ) {
            currentLevelPropertyNodes = nextLevelPropertyNodes;
            nextLevelPropertyNodes = [];
            currentDepth++;
          }
        }

        // indexing
        this.searchEngine = new FuzzySearchEngine(
          this.indexedExplorerTreeNodes,
          {
            includeScore: true,
            shouldSort: true,
            // Ignore location when computing the search score
            // See https://fusejs.io/concepts/scoring-theory.html
            ignoreLocation: true,
            // This specifies the point the search gives up
            // `0.0` means exact match where `1.0` would match anything
            // We set a relatively low threshold to filter out irrelevant results
            threshold: 0.2,
            keys: [
              {
                name: 'label',
                weight: 4,
              },
              {
                name: 'path',
                weight: 2,
                getFn: (node) => {
                  const parentNode =
                    node instanceof QueryBuilderExplorerTreePropertyNodeData ||
                    node instanceof QueryBuilderExplorerTreeSubTypeNodeData
                      ? this.indexedExplorerTreeNodeMap.get(node.parentId)
                      : undefined;

                  const fullPath = parentNode
                    ? parentNode instanceof
                      QueryBuilderExplorerTreeSubTypeNodeData
                      ? prettyPropertyNameForSubType(node.id)
                      : prettyPropertyNameFromNodeId(node.id)
                    : '';

                  return fullPath;
                },
              },
              ...(this.searchConfigurationState.includeDocumentation
                ? [
                    {
                      name: 'taggedValues',
                      weight: 2,
                      // aggregate the property documentation, do not account for class documentation
                      getFn: (node: QueryBuilderExplorerTreeNodeData) =>
                        node instanceof QueryBuilderExplorerTreePropertyNodeData
                          ? node.property.taggedValues
                              .filter(
                                (taggedValue) =>
                                  taggedValue.tag.ownerReference.value.path ===
                                    CORE_PURE_PATH.PROFILE_DOC &&
                                  taggedValue.tag.value.value === PURE_DOC_TAG,
                              )
                              .map((taggedValue) => taggedValue.value)
                              .join('\n')
                          : '',
                    },
                  ]
                : []),
            ],
            sortFn: (
              a: FuzzySearchEngineSortFunctionArg,
              b: FuzzySearchEngineSortFunctionArg,
            ) => {
              // If 2 items have similar scores, we should prefer the one that is
              // less deeply nested.
              const similarScores = Math.abs(a.score - b.score) <= 0.1;
              if (similarScores) {
                const aPathLength: number | undefined =
                  a.item[0] && Object.hasOwn(a.item[0], 'v')
                    ? (
                        a.item[0] as {
                          v: string;
                        }
                      ).v.split('/').length
                    : undefined;
                const bPathLength: number | undefined =
                  b.item[0] && Object.hasOwn(b.item[0], 'v')
                    ? (
                        b.item[0] as {
                          v: string;
                        }
                      ).v.split('/').length
                    : undefined;
                if (aPathLength !== undefined && bPathLength !== undefined) {
                  return aPathLength - bPathLength;
                }
              }
              return a.score - b.score;
            },
            // extended search allows for exact word match through single quote
            // See https://fusejs.io/examples.html#extended-search
            useExtendedSearch: true,
          },
        );

        this.initializationState.complete();
        resolve();
      }, 0),
    );
  }

  get indexedExplorerTreeNodes(): QueryBuilderExplorerTreeNodeData[] {
    return Array.from(this.indexedExplorerTreeNodeMap.values());
  }

  get filteredSearchResults(): QueryBuilderExplorerTreeNodeData[] {
    return this.searchResults.filter((node) => {
      if (!this.searchConfigurationState.includeOneMany) {
        // Check if node or any ancestors are one-many nodes.
        let currNode: QueryBuilderExplorerTreeNodeData | undefined = node;
        while (currNode) {
          if (
            (currNode instanceof QueryBuilderExplorerTreeSubTypeNodeData &&
              (currNode.multiplicity.upperBound === undefined ||
                currNode.multiplicity.upperBound > 1)) ||
            (currNode instanceof QueryBuilderExplorerTreePropertyNodeData &&
              (currNode.property.multiplicity.upperBound === undefined ||
                currNode.property.multiplicity.upperBound > 1))
          ) {
            return false;
          }
          currNode =
            currNode instanceof QueryBuilderExplorerTreePropertyNodeData ||
            currNode instanceof QueryBuilderExplorerTreeSubTypeNodeData
              ? this.indexedExplorerTreeNodeMap.get(currNode.parentId)
              : undefined;
        }
      }
      if (this.typeFilters.includes(QUERY_BUILDER_PROPERTY_SEARCH_TYPE.CLASS)) {
        if (node.type instanceof Class) {
          return true;
        }
      }
      if (
        this.typeFilters.includes(
          QUERY_BUILDER_PROPERTY_SEARCH_TYPE.ENUMERATION,
        )
      ) {
        if (node.type instanceof Enumeration) {
          return true;
        }
      }
      if (
        this.typeFilters.includes(QUERY_BUILDER_PROPERTY_SEARCH_TYPE.STRING)
      ) {
        if (node.type === PrimitiveType.STRING) {
          return true;
        }
      }
      if (
        this.typeFilters.includes(QUERY_BUILDER_PROPERTY_SEARCH_TYPE.NUMBER)
      ) {
        if (
          node.type instanceof PrimitiveType &&
          (
            [
              PRIMITIVE_TYPE.NUMBER,
              PRIMITIVE_TYPE.DECIMAL,
              PRIMITIVE_TYPE.INTEGER,
              PRIMITIVE_TYPE.FLOAT,
            ] as string[]
          ).includes(node.type.name)
        ) {
          return true;
        }
      }
      if (
        this.typeFilters.includes(QUERY_BUILDER_PROPERTY_SEARCH_TYPE.BOOLEAN)
      ) {
        if (node.type === PrimitiveType.BOOLEAN) {
          return true;
        }
      }
      if (this.typeFilters.includes(QUERY_BUILDER_PROPERTY_SEARCH_TYPE.DATE)) {
        if (
          node.type instanceof PrimitiveType &&
          (
            [
              PRIMITIVE_TYPE.DATE,
              PRIMITIVE_TYPE.DATETIME,
              PRIMITIVE_TYPE.STRICTDATE,
              PRIMITIVE_TYPE.STRICTTIME,
              PRIMITIVE_TYPE.LATESTDATE,
            ] as string[]
          ).includes(node.type.name)
        ) {
          return true;
        }
      }
      return false;
    });
  }
}
