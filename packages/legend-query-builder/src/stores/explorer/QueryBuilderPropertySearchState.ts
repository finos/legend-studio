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
} from '@finos/legend-graph';
import {
  ActionState,
  FuzzySearchEngine,
  addUniqueEntry,
  deleteEntry,
  guaranteeNonNullable,
  FuzzySearchAdvancedConfigState,
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
  getQueryBuilderPropertyNodeData,
  getQueryBuilderSubTypeNodeData,
  type QueryBuilderExplorerTreeNodeData,
  QueryBuilderExplorerTreePropertyNodeData,
  QueryBuilderExplorerTreeSubTypeNodeData,
} from './QueryBuilderExplorerState.js';
import type { QueryBuilderState } from '../QueryBuilderState.js';

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
  indexedExplorerTreeNodes: QueryBuilderExplorerTreeNodeData[] = [];

  // search
  searchEngine: FuzzySearchEngine<QueryBuilderExplorerTreeNodeData>;
  searchConfigurationState: FuzzySearchAdvancedConfigState;
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
    QUERY_BUILDER_PROPERTY_SEARCH_TYPE.STRING,
    QUERY_BUILDER_PROPERTY_SEARCH_TYPE.BOOLEAN,
    QUERY_BUILDER_PROPERTY_SEARCH_TYPE.NUMBER,
    QUERY_BUILDER_PROPERTY_SEARCH_TYPE.DATE,
  ];

  constructor(queryBuilderState: QueryBuilderState) {
    makeObservable(this, {
      indexedExplorerTreeNodes: observable,
      searchText: observable,
      searchResults: observable,
      isOverSearchLimit: observable,
      isSearchPanelOpen: observable,
      isSearchPanelHidden: observable,
      showSearchConfigurationMenu: observable,
      typeFilters: observable,
      filteredSearchResults: computed,
      search: action,
      resetSearch: action,
      setSearchText: action,
      setShowSearchConfigurationMenu: action,
      setIsSearchPanelOpen: action,
      setIsSearchPanelHidden: action,
      toggleFilterForType: action,
      initialize: action,
    });

    this.queryBuilderState = queryBuilderState;
    this.searchConfigurationState = new FuzzySearchAdvancedConfigState(
      (): void => this.search(),
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

  setSearchText(val: string): void {
    this.searchText = val;
  }

  resetSearch(): void {
    this.searchText = '';
    this.searchResults = [];
    this.searchState.complete();
  }

  toggleFilterForType(val: QUERY_BUILDER_PROPERTY_SEARCH_TYPE): void {
    if (this.typeFilters.includes(val)) {
      deleteEntry(this.typeFilters, val);
    } else {
      addUniqueEntry(this.typeFilters, val);
    }
  }

  search(): void {
    if (!this.searchText) {
      this.searchResults = [];
      return;
    }
    this.searchState.inProgress();

    // NOTE: performanced of fuzzy search is impacted by the number of indexed entries and the length
    // of the search pattern, so to a certain extent this could become laggy. If this becomes too inconvenient
    // for the users, we might need to use another fuzzy-search implementation, or have appropriate search
    // policy, e.g. limit length of search text, etc.
    //
    // See https://github.com/farzher/fuzzysort
    const rawSearchResults = this.searchEngine.search(
      this.searchConfigurationState.generateSearchText(
        this.searchText.toLowerCase(),
      ),
      {
        // NOTE: search for limit + 1 item so we can know if there are more search results
        limit: QUERY_BUILDER_PROPERTY_SEARCH_RESULTS_LIMIT + 1,
      },
    );
    const searchResults = Array.from(rawSearchResults.values()).map(
      (result) => result.item,
    );

    // check if the search results exceed the limit
    if (searchResults.length > QUERY_BUILDER_PROPERTY_SEARCH_RESULTS_LIMIT) {
      this.isOverSearchLimit = true;
      this.searchResults = searchResults.slice(
        0,
        QUERY_BUILDER_PROPERTY_SEARCH_RESULTS_LIMIT,
      );
    } else {
      this.isOverSearchLimit = false;
      this.searchResults = searchResults;
    }

    this.searchState.complete();
  }

  /**
   * From the current explorer tree, navigate breadth-first to find more mapped
   * property nodes, then index these property nodes for searching.
   *
   * NOTE: fortunately, since we restrict the depth and number of nodes in this navigation
   * this process is often not the performance bottleneck, else, we would need to make this
   * asynchronous and block the UI while waiting.
   */
  initialize(): void {
    this.indexedExplorerTreeNodes = [];

    let currentLevelPropertyNodes: QueryBuilderExplorerTreeNodeData[] = [];
    let nextLevelPropertyNodes: QueryBuilderExplorerTreeNodeData[] = [];

    Array.from(
      this.queryBuilderState.explorerState.nonNullableTreeData.nodes.values(),
    )
      .slice(1)
      .forEach((node) => {
        if (node.mappingData.mapped && !node.isPartOfDerivedPropertyBranch) {
          currentLevelPropertyNodes.push(node);
          this.indexedExplorerTreeNodes.push(node);
        }
      });

    // ensure we don't navigate more nodes than the limit so we could
    // keep the initialization/indexing time within acceptable range
    const NODE_LIMIT =
      this.indexedExplorerTreeNodes.length +
      QUERY_BUILDER_PROPERTY_SEARCH_MAX_NODES;
    const addNode = (node: QueryBuilderExplorerTreeNodeData): void =>
      runInAction(() => {
        if (this.indexedExplorerTreeNodes.length > NODE_LIMIT) {
          return;
        }
        this.indexedExplorerTreeNodes.push(node);
      });

    // limit the depth of navigation to keep the initialization/indexing
    // time within acceptable range
    let currentDepth = 1;
    while (
      currentLevelPropertyNodes.length &&
      currentDepth <= QUERY_BUILDER_PROPERTY_SEARCH_MAX_DEPTH
    ) {
      const node = currentLevelPropertyNodes.shift();
      if (node) {
        if (node.childrenIds.length) {
          if (
            (node instanceof QueryBuilderExplorerTreePropertyNodeData ||
              node instanceof QueryBuilderExplorerTreeSubTypeNodeData) &&
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
                propertyTreeNodeData?.mappingData.mapped &&
                !propertyTreeNodeData.isPartOfDerivedPropertyBranch
              ) {
                nextLevelPropertyNodes.push(propertyTreeNodeData);
                addNode(propertyTreeNodeData);
              }
            });
            node.type._subclasses.forEach((subclass) => {
              const subTypeTreeNodeData = getQueryBuilderSubTypeNodeData(
                subclass,
                node,
                guaranteeNonNullable(
                  this.queryBuilderState.explorerState
                    .mappingModelCoverageAnalysisResult,
                ),
              );
              nextLevelPropertyNodes.push(subTypeTreeNodeData);
              addNode(subTypeTreeNodeData);
            });
          }
        }
      }

      // when we done processing one depth, we will do check on the depth and the total
      // number of indexed nodes to figure out if we should proceed further
      if (
        !currentLevelPropertyNodes.length &&
        this.indexedExplorerTreeNodes.length < NODE_LIMIT
      ) {
        currentLevelPropertyNodes = nextLevelPropertyNodes;
        nextLevelPropertyNodes = [];
        currentDepth++;
      }
    }

    // indexing
    this.searchEngine = new FuzzySearchEngine(this.indexedExplorerTreeNodes, {
      includeScore: true,
      includeMatches: true,
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
      ],
      // extended search allows for exact word match through single quote
      // See https://fusejs.io/examples.html#extended-search
      useExtendedSearch: true,
    });
  }

  get filteredSearchResults(): QueryBuilderExplorerTreeNodeData[] {
    return this.searchResults.filter((node) => {
      if (this.typeFilters.includes(QUERY_BUILDER_PROPERTY_SEARCH_TYPE.CLASS)) {
        if (node.type instanceof Class) {
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
