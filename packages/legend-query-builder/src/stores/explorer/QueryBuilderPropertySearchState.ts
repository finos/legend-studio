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
} from '@finos/legend-graph';
import {
  ActionState,
  addUniqueEntry,
  deleteEntry,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import { makeAutoObservable, observable, computed, action } from 'mobx';
import {
  QUERY_BUILDER_PROPERTY_SEARCH_MAX_DEPTH,
  QUERY_BUILDER_PROPERTY_SEARCH_RESULTS_LIMIT,
  QUERY_BUILDER_PROPERTY_SEARCH_TYPE,
  QUERY_BUILDER_PROPERTY_SEARCH_TEXT_MIN_LENGTH,
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
import { Fuse } from '@finos/legend-art';
import { TextSearchAdvancedConfigState } from '@finos/legend-application';

export class QueryBuilderPropertySearchState {
  queryBuilderState: QueryBuilderState;
  // TODO: Check if we could clean this up as this seems quite complicated and its purpose is not clear to me
  // See https://github.com/finos/legend-studio/pull/1212
  mappedPropertyNodes: QueryBuilderExplorerTreeNodeData[] = [];
  searchedMappedPropertyNodes: QueryBuilderExplorerTreeNodeData[] = [];

  // search config
  textSearchState: TextSearchAdvancedConfigState;

  // search text
  isOverSearchLimit = false;
  isSearchPanelOpen = false;
  isSearchPanelHidden = false;
  searchText = '';
  searchState = ActionState.create().pass();
  searchEngine: Fuse<QueryBuilderExplorerTreeNodeData>;

  filterByMultiple: boolean;
  typeFilters: QUERY_BUILDER_PROPERTY_SEARCH_TYPE[];

  constructor(queryBuilderState: QueryBuilderState) {
    makeAutoObservable(this, {
      queryBuilderState: false,
      searchedMappedPropertyNodes: observable,
      isSearchPanelOpen: observable,
      isOverSearchLimit: observable,
      isSearchPanelHidden: observable,
      searchText: observable,
      textSearchState: observable,
      searchEngine: observable,
      filteredPropertyNodes: computed,
      setSearchText: action,
      setIsOverSearchLimit: action,
      setSearchedMappedPropertyNodes: action,
      setIsSearchPanelOpen: action,
      setIsSearchPanelHidden: action,
      resetPropertyState: action,
      setFilterByMultiple: action,
      toggleTypeFilter: action,
    });

    this.queryBuilderState = queryBuilderState;
    this.filterByMultiple = true;

    this.textSearchState = new TextSearchAdvancedConfigState(
      this.search.bind(this),
    );

    this.typeFilters = [
      QUERY_BUILDER_PROPERTY_SEARCH_TYPE.CLASS,
      QUERY_BUILDER_PROPERTY_SEARCH_TYPE.STRING,
      QUERY_BUILDER_PROPERTY_SEARCH_TYPE.BOOLEAN,
      QUERY_BUILDER_PROPERTY_SEARCH_TYPE.NUMBER,
      QUERY_BUILDER_PROPERTY_SEARCH_TYPE.DATE,
    ];

    this.searchEngine = new Fuse(this.mappedPropertyNodes);
  }

  toggleTypeFilter(val: QUERY_BUILDER_PROPERTY_SEARCH_TYPE): void {
    if (this.typeFilters.includes(val)) {
      deleteEntry(this.typeFilters, val);
    } else {
      addUniqueEntry(this.typeFilters, val);
    }
  }

  setFilterByMultiple(val: boolean): void {
    this.filterByMultiple = val;
  }

  getMultiplePropertyNodes(): QueryBuilderExplorerTreeNodeData[] {
    return this.searchedMappedPropertyNodes.filter((node) => {
      if (node instanceof QueryBuilderExplorerTreePropertyNodeData) {
        if (
          node.property.multiplicity.upperBound === undefined ||
          node.property.multiplicity.upperBound > 1
        ) {
          return true;
        }
        const parentNode = this.mappedPropertyNodes.find(
          (pn) => pn.id === node.parentId,
        );
        if (
          parentNode instanceof QueryBuilderExplorerTreePropertyNodeData &&
          (parentNode.property.multiplicity.upperBound === undefined ||
            parentNode.property.multiplicity.upperBound > 1)
        ) {
          return true;
        }
      }
      return false;
    });
  }

  classPropertyNodes(): QueryBuilderExplorerTreeNodeData[] {
    return this.searchedMappedPropertyNodes.filter((node) => {
      if (node.type instanceof Class) {
        return true;
      }
      return false;
    });
  }

  stringPropertyNodes(): QueryBuilderExplorerTreeNodeData[] {
    return this.searchedMappedPropertyNodes.filter((node) => {
      if (
        node.type instanceof PrimitiveType &&
        node.type.name === PRIMITIVE_TYPE.STRING
      ) {
        return true;
      }
      return false;
    });
  }

  numberPropertyNodes(): QueryBuilderExplorerTreeNodeData[] {
    return this.searchedMappedPropertyNodes.filter((node) => {
      if (
        node.type instanceof PrimitiveType &&
        (node.type.name === PRIMITIVE_TYPE.DECIMAL ||
          node.type.name === PRIMITIVE_TYPE.NUMBER ||
          node.type.name === PRIMITIVE_TYPE.INTEGER ||
          node.type.name === PRIMITIVE_TYPE.FLOAT)
      ) {
        return true;
      }
      return false;
    });
  }

  datePropertyNodes(): QueryBuilderExplorerTreeNodeData[] {
    return this.searchedMappedPropertyNodes.filter((node) => {
      if (
        node.type instanceof PrimitiveType &&
        (node.type.name === PRIMITIVE_TYPE.DATE ||
          node.type.name === PRIMITIVE_TYPE.DATETIME ||
          node.type.name === PRIMITIVE_TYPE.STRICTDATE ||
          node.type.name === PRIMITIVE_TYPE.STRICTTIME ||
          node.type.name === PRIMITIVE_TYPE.LATESTDATE)
      ) {
        return true;
      }
      return false;
    });
  }

  booleanPropertyNodes(): QueryBuilderExplorerTreeNodeData[] {
    return this.searchedMappedPropertyNodes.filter((node) => {
      if (
        node.type instanceof PrimitiveType &&
        node.type.name === PRIMITIVE_TYPE.BOOLEAN
      ) {
        return true;
      }
      return false;
    });
  }

  /**
   * takes in the searched mapped property and retrives the toggles
   * that the user selects about what they want to include and filters
   * out nodes if their type or multiplicity is not listed
   */
  get filteredPropertyNodes(): QueryBuilderExplorerTreeNodeData[] {
    const filteredTest = this.searchedMappedPropertyNodes.filter((p) => {
      if (
        !this.filterByMultiple &&
        this.getMultiplePropertyNodes().includes(p)
      ) {
        return false;
      }
      if (
        !this.typeFilters.includes(QUERY_BUILDER_PROPERTY_SEARCH_TYPE.CLASS) &&
        this.classPropertyNodes().includes(p)
      ) {
        return false;
      }
      if (
        !this.typeFilters.includes(QUERY_BUILDER_PROPERTY_SEARCH_TYPE.STRING) &&
        this.stringPropertyNodes().includes(p)
      ) {
        return false;
      }
      if (
        !this.typeFilters.includes(QUERY_BUILDER_PROPERTY_SEARCH_TYPE.NUMBER) &&
        this.numberPropertyNodes().includes(p)
      ) {
        return false;
      }
      if (
        !this.typeFilters.includes(
          QUERY_BUILDER_PROPERTY_SEARCH_TYPE.BOOLEAN,
        ) &&
        this.booleanPropertyNodes().includes(p)
      ) {
        return false;
      }
      if (
        !this.typeFilters.includes(QUERY_BUILDER_PROPERTY_SEARCH_TYPE.DATE) &&
        this.datePropertyNodes().includes(p)
      ) {
        return false;
      }
      return true;
    });
    return filteredTest;
  }

  fetchAllPropertyNodes(): void {
    const treeData = this.queryBuilderState.explorerState.nonNullableTreeData;
    let currentLevelPropertyNodes: QueryBuilderExplorerTreeNodeData[] = [];
    let nextLevelPropertyNodes: QueryBuilderExplorerTreeNodeData[] = [];
    Array.from(treeData.nodes.values())
      .slice(1)
      .forEach((node) => {
        if (node.mappingData.mapped && !node.isPartOfDerivedPropertyBranch) {
          currentLevelPropertyNodes.push(node);
          this.mappedPropertyNodes.push(node);
        }
      });
    let currentDepth = 1;
    const maxDepth = QUERY_BUILDER_PROPERTY_SEARCH_MAX_DEPTH;
    while (currentLevelPropertyNodes.length && currentDepth <= maxDepth) {
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

                this.mappedPropertyNodes.push(propertyTreeNodeData);
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
              this.mappedPropertyNodes.push(subTypeTreeNodeData);
            });
          }
        }
      }
      if (
        !currentLevelPropertyNodes.length &&
        this.mappedPropertyNodes.length <
          QUERY_BUILDER_PROPERTY_SEARCH_MAX_NODES
      ) {
        currentLevelPropertyNodes = nextLevelPropertyNodes;
        nextLevelPropertyNodes = [];
        currentDepth++;
      }
    }

    this.searchEngine = new Fuse(this.mappedPropertyNodes, {
      includeScore: true,
      shouldSort: true,
      minMatchCharLength: QUERY_BUILDER_PROPERTY_SEARCH_TEXT_MIN_LENGTH,
      ignoreLocation: true,
      threshold: 0.3,
      keys: [
        {
          name: 'id',
        },
        {
          name: 'label',
        },
        {
          name: 'taggedValues',
          getFn: (node: QueryBuilderExplorerTreeNodeData) =>
            (
              node as QueryBuilderExplorerTreePropertyNodeData
            ).property.taggedValues.map((taggedValue) => {
              const isDoc =
                taggedValue.tag.ownerReference.valueForSerialization?.includes(
                  CORE_PURE_PATH.PROFILE_DOC,
                );
              return isDoc ? taggedValue.value : '';
            }),
        },
      ],
      // extended search allows for exact word match through single quote
      // See https://fusejs.io/examples.html#extended-search
      useExtendedSearch: true,
    });
  }

  getPropertySearchNodes(
    propertySearchText: string,
  ): QueryBuilderExplorerTreeNodeData[] {
    return Array.from(
      this.searchEngine
        .search(propertySearchText, {
          limit: QUERY_BUILDER_PROPERTY_SEARCH_RESULTS_LIMIT + 1,
        })
        .values(),
    ).map((result) => result.item);
  }

  fetchMappedPropertyNodes(propSearchText: string): void {
    if (propSearchText.length < QUERY_BUILDER_PROPERTY_SEARCH_TEXT_MIN_LENGTH) {
      return;
    }

    const propertySearchText = this.textSearchState.getSearchText(
      propSearchText.toLowerCase(),
    );

    const allSearchedMappedPropertyNodes =
      this.getPropertySearchNodes(propertySearchText);

    if (
      allSearchedMappedPropertyNodes.length >
      QUERY_BUILDER_PROPERTY_SEARCH_RESULTS_LIMIT
    ) {
      this.setIsOverSearchLimit(true);
      this.setSearchedMappedPropertyNodes(
        allSearchedMappedPropertyNodes.slice(
          0,
          QUERY_BUILDER_PROPERTY_SEARCH_RESULTS_LIMIT,
        ),
      );
    } else {
      this.setIsOverSearchLimit(false);
      this.setSearchedMappedPropertyNodes(allSearchedMappedPropertyNodes);
    }
  }

  search(): void {
    this.searchState.inProgress();
    this.resetPropertyState();
    this.fetchMappedPropertyNodes(this.searchText);
    this.searchState.complete();
  }

  setIsSearchPanelOpen(val: boolean): void {
    this.isSearchPanelOpen = val;
  }

  setIsSearchPanelHidden(val: boolean): void {
    this.isSearchPanelHidden = val;
  }

  setIsOverSearchLimit(val: boolean): void {
    this.isOverSearchLimit = val;
  }

  setSearchText(val: string): void {
    this.searchText = val;
  }

  setSearchedMappedPropertyNodes(
    val: QueryBuilderExplorerTreeNodeData[],
  ): void {
    this.searchedMappedPropertyNodes = val;
  }

  resetPropertyState(): void {
    this.setSearchedMappedPropertyNodes([]);
  }
}
