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
import { guaranteeNonNullable } from '@finos/legend-shared';
import { makeAutoObservable, observable, computed, action } from 'mobx';
import {
  getQueryBuilderPropertyNodeData,
  getQueryBuilderSubTypeNodeData,
  type QueryBuilderExplorerTreeNodeData,
  QueryBuilderExplorerTreePropertyNodeData,
  QueryBuilderExplorerTreeSubTypeNodeData,
} from './QueryBuilderExplorerState.js';
import type { QueryBuilderState } from './QueryBuilderState.js';

export class QueryBuilderPropertySearchPanelState {
  queryBuilderState: QueryBuilderState;
  allMappedPropertyNodes: QueryBuilderExplorerTreeNodeData[] = [];
  searchedMappedPropertyNodes: QueryBuilderExplorerTreeNodeData[] = [];
  oneManyMappedPropertyNodes: QueryBuilderExplorerTreeNodeData[] = [];
  classMappedPropertyNodes: QueryBuilderExplorerTreeNodeData[] = [];
  stringMappedPropertyNodes: QueryBuilderExplorerTreeNodeData[] = [];
  numberMappedPropertyNodes: QueryBuilderExplorerTreeNodeData[] = [];
  dateMappedPropertyNodes: QueryBuilderExplorerTreeNodeData[] = [];
  booleanMappedPropertyNodes: QueryBuilderExplorerTreeNodeData[] = [];
  isSearchPanelOpen = false;
  searchedPropertyName = '';
  isOneManyRowsIncluded = true;
  isClassIncluded = true;
  isStringIncluded = true;
  isBooleanIncluded = true;
  isNumberIncluded = true;
  isDateIncluded = true;

  constructor(queryBuilderState: QueryBuilderState) {
    makeAutoObservable(this, {
      queryBuilderState: false,
      searchedMappedPropertyNodes: observable.ref,
      oneManyMappedPropertyNodes: observable.ref,
      classMappedPropertyNodes: observable.ref,
      stringMappedPropertyNodes: observable.ref,
      allMappedPropertyNodes: observable.ref,
      numberMappedPropertyNodes: observable.ref,
      dateMappedPropertyNodes: observable.ref,
      booleanMappedPropertyNodes: observable.ref,
      isSearchPanelOpen: observable,
      isOneManyRowsIncluded: observable,
      isClassIncluded: observable,
      isStringIncluded: observable,
      isNumberIncluded: observable,
      searchedPropertyName: observable,
      isBooleanIncluded: observable,
      isDateIncluded: observable,
      filteredPropertyNodes: computed,
      setSearchedPropertyName: action,
      setSearchedMappedPropertyNodes: action,
      setOneManyMappedPropertyNodes: action,
      setClassMappedPropertyNodes: action,
      setStringMappedPropertyNodes: action,
      setNumberMappedPropertyNodes: action,
      setDateMappedPropertyNodes: action,
      setBooleanMappedPropertyNodes: action,
      setIsSearchPanelOpen: action,
      refreshPropertyState: action,
      setOneManyRowsIncluded: action,
      setClassIncluded: action,
      setStringIncluded: action,
      setBooleanIncluded: action,
      setNumberIncluded: action,
      setDateIncluded: action,
    });

    this.queryBuilderState = queryBuilderState;
  }

  setOneManyRowsIncluded(val: boolean): void {
    this.isOneManyRowsIncluded = val;
  }

  setClassIncluded(val: boolean): void {
    this.isClassIncluded = val;
  }

  setStringIncluded(val: boolean): void {
    this.isStringIncluded = val;
  }

  setBooleanIncluded(val: boolean): void {
    this.isBooleanIncluded = val;
  }

  setNumberIncluded(val: boolean): void {
    this.isNumberIncluded = val;
  }

  setDateIncluded(val: boolean): void {
    this.isDateIncluded = val;
  }

  updateOneManyPropertyNodes(): void {
    this.setOneManyMappedPropertyNodes(
      this.searchedMappedPropertyNodes.filter((node) => {
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
      }),
    );
  }

  updateClassPropertyNodes(): void {
    this.setClassMappedPropertyNodes(
      this.searchedMappedPropertyNodes.filter((node) => {
        if (node.type instanceof Class) {
          return true;
        }
        return false;
      }),
    );
  }

  updateStringPropertyNodes(): void {
    this.setStringMappedPropertyNodes(
      this.searchedMappedPropertyNodes.filter((node) => {
        if (
          node.type instanceof PrimitiveType &&
          node.type.name === PRIMITIVE_TYPE.STRING
        ) {
          return true;
        }
        return false;
      }),
    );
  }

  updateNumberPropertyNodes(): void {
    this.setNumberMappedPropertyNodes(
      this.searchedMappedPropertyNodes.filter((node) => {
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
      }),
    );
  }

  updateDatePropertyNodes(): void {
    this.setDateMappedPropertyNodes(
      this.searchedMappedPropertyNodes.filter((node) => {
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
      }),
    );
  }

  updateBooleanPropertyNodes(): void {
    this.setBooleanMappedPropertyNodes(
      this.searchedMappedPropertyNodes.filter((node) => {
        if (
          node.type instanceof PrimitiveType &&
          node.type.name === PRIMITIVE_TYPE.BOOLEAN
        ) {
          return true;
        }
        return false;
      }),
    );
  }

  get filteredPropertyNodes(): QueryBuilderExplorerTreeNodeData[] {
    return this.searchedMappedPropertyNodes.filter((p) => {
      if (
        !this.isOneManyRowsIncluded &&
        this.oneManyMappedPropertyNodes.includes(p)
      ) {
        return false;
      }
      if (!this.isClassIncluded && this.classMappedPropertyNodes.includes(p)) {
        return false;
      }
      if (
        !this.isStringIncluded &&
        this.stringMappedPropertyNodes.includes(p)
      ) {
        return false;
      }
      if (
        !this.isNumberIncluded &&
        this.numberMappedPropertyNodes.includes(p)
      ) {
        return false;
      }
      if (
        !this.isBooleanIncluded &&
        this.booleanMappedPropertyNodes.includes(p)
      ) {
        return false;
      }
      if (!this.isDateIncluded && this.dateMappedPropertyNodes.includes(p)) {
        return false;
      }
      return true;
    });
  }

  fetchAllPropertyNodes(): void {
    const treeData = this.queryBuilderState.explorerState.treeData;
    let currentLevelPropertyNodes: QueryBuilderExplorerTreeNodeData[] = [];
    let nextLevelPropertyNodes: QueryBuilderExplorerTreeNodeData[] = [];
    if (treeData?.nodes.values()) {
      Array.from(treeData.nodes.values())
        .slice(1)
        .forEach((node) => {
          if (node.mappingData.mapped && !node.isPartOfDerivedPropertyBranch) {
            currentLevelPropertyNodes.push(node);
            this.allMappedPropertyNodes.push(node);
          }
        });
    }
    let currentDepth = 1;
    const maxDepth = 15;
    while (currentLevelPropertyNodes.length && currentDepth <= maxDepth) {
      const node = currentLevelPropertyNodes.shift();
      if (node) {
        if (node.childrenIds.length) {
          node.isOpen = !node.isOpen;
          if (
            node.isOpen &&
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
                this.queryBuilderState.graphManagerState,
                property,
                node,
                guaranteeNonNullable(
                  this.queryBuilderState.querySetupState.mapping,
                ),
              );
              if (
                propertyTreeNodeData.mappingData.mapped &&
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

  fetchMappedPropertyNodes(propName: string): void {
    const propertyName = propName.toLowerCase();
    this.allMappedPropertyNodes.forEach((node) => {
      if (node.label.toLowerCase().includes(propertyName)) {
        this.searchedMappedPropertyNodes.push(node);
      }
    });
    this.updateOneManyPropertyNodes();
    this.updateClassPropertyNodes();
    this.updateStringPropertyNodes();
    this.updateNumberPropertyNodes();
    this.updateDatePropertyNodes();
    this.updateBooleanPropertyNodes();
  }

  setIsSearchPanelOpen(val: boolean): void {
    this.isSearchPanelOpen = val;
  }

  setNumberMappedPropertyNodes(val: QueryBuilderExplorerTreeNodeData[]): void {
    this.numberMappedPropertyNodes = val;
  }

  setBooleanMappedPropertyNodes(val: QueryBuilderExplorerTreeNodeData[]): void {
    this.booleanMappedPropertyNodes = val;
  }

  setDateMappedPropertyNodes(val: QueryBuilderExplorerTreeNodeData[]): void {
    this.dateMappedPropertyNodes = val;
  }

  setSearchedPropertyName(val: string): void {
    this.searchedPropertyName = val;
  }

  setSearchedMappedPropertyNodes(
    val: QueryBuilderExplorerTreeNodeData[],
  ): void {
    this.searchedMappedPropertyNodes = val;
  }

  setClassMappedPropertyNodes(val: QueryBuilderExplorerTreeNodeData[]): void {
    this.classMappedPropertyNodes = val;
  }

  setStringMappedPropertyNodes(val: QueryBuilderExplorerTreeNodeData[]): void {
    this.stringMappedPropertyNodes = val;
  }

  setOneManyMappedPropertyNodes(val: QueryBuilderExplorerTreeNodeData[]): void {
    this.oneManyMappedPropertyNodes = val;
  }

  refreshPropertyState(): void {
    this.setSearchedMappedPropertyNodes([]);
    this.setOneManyMappedPropertyNodes([]);
    this.setClassMappedPropertyNodes([]);
    this.setStringMappedPropertyNodes([]);
    this.setDateMappedPropertyNodes([]);
    this.setBooleanMappedPropertyNodes([]);
  }
}
