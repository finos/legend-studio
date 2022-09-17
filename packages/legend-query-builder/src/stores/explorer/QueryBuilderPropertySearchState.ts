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
} from '../QueryBuilderConfig.js';
import {
  getQueryBuilderPropertyNodeData,
  getQueryBuilderSubTypeNodeData,
  type QueryBuilderExplorerTreeNodeData,
  QueryBuilderExplorerTreePropertyNodeData,
  QueryBuilderExplorerTreeSubTypeNodeData,
} from './QueryBuilderExplorerState.js';
import type { QueryBuilderState } from '../QueryBuilderState.js';
import { Fuse } from './CJS_Fuse.cjs';

export class QueryBuilderPropertySearchState {
  queryBuilderState: QueryBuilderState;
  // TODO: Check if we could clean this up as this seems quite complicated and its purpose is not clear to me
  // See https://github.com/finos/legend-studio/pull/1212
  allMappedPropertyNodes: QueryBuilderExplorerTreeNodeData[] = [];
  searchedMappedPropertyNodes: QueryBuilderExplorerTreeNodeData[] = [];
  isSearchPanelOpen = false;
  isSearchPanelHidden = false;
  isOverSearchLimit = false;
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
      searchEngine: observable,
      filteredPropertyNodes: computed,
      setSearchText: action,
      setSearchedMappedPropertyNodes: action,
      setIsSearchPanelOpen: action,
      setIsSearchPanelHidden: action,
      refreshPropertyState: action,
      setFilterByMultiple: action,
      toggleTypeFilter: action,
    });

    this.queryBuilderState = queryBuilderState;
    this.filterByMultiple = true;
    this.typeFilters = [
      QUERY_BUILDER_PROPERTY_SEARCH_TYPE.CLASS,
      QUERY_BUILDER_PROPERTY_SEARCH_TYPE.STRING,
      QUERY_BUILDER_PROPERTY_SEARCH_TYPE.BOOLEAN,
      QUERY_BUILDER_PROPERTY_SEARCH_TYPE.NUMBER,
      QUERY_BUILDER_PROPERTY_SEARCH_TYPE.DATE,
    ];

    this.searchEngine = new Fuse(this.allMappedPropertyNodes);
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
        const parentNode = this.allMappedPropertyNodes.find(
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

  get filteredPropertyNodes(): QueryBuilderExplorerTreeNodeData[] {
    return this.searchedMappedPropertyNodes.filter((p) => {
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
          this.allMappedPropertyNodes.push(node);
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
                this.allMappedPropertyNodes.push(propertyTreeNodeData);
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
              this.allMappedPropertyNodes.push(subTypeTreeNodeData);
            });
          }
        }
      }
      if (!currentLevelPropertyNodes.length) {
        currentLevelPropertyNodes = nextLevelPropertyNodes;
        nextLevelPropertyNodes = [];
        currentDepth++;
      }
    }
  }

  fetchMappedPropertyNodes(propSearchText: string, fetchAll?: boolean): void {
    const propertySearchText = propSearchText.toLowerCase();

    this.searchState.inProgress();
    this.searchEngine = new Fuse(this.allMappedPropertyNodes, {
      includeScore: true,
      shouldSort: true,
      minMatchCharLength: QUERY_BUILDER_PROPERTY_SEARCH_TEXT_MIN_LENGTH,
      ignoreLocation: true,
      threshold: 0.3,
      keys: [
        {
          name: 'id',
          weight: 4,
        },
        {
          name: 'label',
          weight: 1,
        },
      ],
    });

    const allSearchedMappedPropertyNodes = Array.from(
      this.searchEngine.search(propertySearchText).values(),
    ).map((result) => {
      const node = result.item as QueryBuilderExplorerTreePropertyNodeData;
      return new QueryBuilderExplorerTreePropertyNodeData(
        node.id,
        node.label,
        node.dndText,
        node.property,
        node.parentId,
        node.isPartOfDerivedPropertyBranch,
        node.mappingData,
      );
    });

    if (
      allSearchedMappedPropertyNodes.length >
      QUERY_BUILDER_PROPERTY_SEARCH_RESULTS_LIMIT
    ) {
      this.isOverSearchLimit = true;
      this.searchedMappedPropertyNodes = allSearchedMappedPropertyNodes.slice(
        0,
        QUERY_BUILDER_PROPERTY_SEARCH_RESULTS_LIMIT,
      );
    } else {
      this.isOverSearchLimit = false;
      this.searchedMappedPropertyNodes = allSearchedMappedPropertyNodes;
    }

    this.searchState.complete();
  }

  setIsSearchPanelOpen(val: boolean): void {
    this.isSearchPanelOpen = val;
  }

  setIsSearchPanelHidden(val: boolean): void {
    this.isSearchPanelHidden = val;
  }

  setSearchText(val: string): void {
    this.searchText = val;
  }

  setSearchedMappedPropertyNodes(
    val: QueryBuilderExplorerTreeNodeData[],
  ): void {
    this.searchedMappedPropertyNodes = val;
  }

  refreshPropertyState(): void {
    this.setSearchedMappedPropertyNodes([]);
  }
}
