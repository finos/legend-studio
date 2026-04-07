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
  type GraphManagerState,
  type PackageableRuntime,
  type AccessorOwner,
  type Accessor,
  IngestDefinition,
  Database,
  PackageableElementExplicitReference,
  RuntimePointer,
  type TEMPORARY_IngestContent,
} from '@finos/legend-graph';
import { QueryBuilderState } from '../../QueryBuilderState.js';
import type { GenericLegendApplicationStore } from '@finos/legend-application';
import type {
  QueryBuilderWorkflowState,
  QueryBuilderActionConfig,
} from '../../query-workflow/QueryBuilderWorkFlowState.js';
import type { QueryBuilderConfig } from '../../../graph-manager/QueryBuilderConfig.js';
import { renderAccessorQueryBuilderSetupPanelContent } from '../../../components/workflows/AccessorQueryBuilder.js';
import { action, computed, makeObservable } from 'mobx';
import type { QueryableSourceInfo } from '@finos/legend-storage';
import { buildElementOption } from '@finos/legend-lego/graph-editor';
import { getCompatibleRuntimesFromAccessorOwner } from './AccessorQueryBuilderHelper.js';
import { QueryBuilderEmbeddedFromExecutionContextState } from '../../QueryBuilderExecutionContextState.js';
import { QueryBuilderTDSState } from '../../fetch-structure/tds/QueryBuilderTDSState.js';

export interface AccessorOwnerOption {
  label: string;
  value: AccessorOwner;
}

export class AccessorQueryBuilderState extends QueryBuilderState {
  override TEMPORARY__setupPanelContentRenderer = (): React.ReactNode =>
    renderAccessorQueryBuilderSetupPanelContent(this);

  constructor(
    applicationStore: GenericLegendApplicationStore,
    accessor: Accessor | undefined,
    graphManagerState: GraphManagerState,
    workflow: QueryBuilderWorkflowState,
    actionConfig: QueryBuilderActionConfig,
    config?: QueryBuilderConfig | undefined,
    sourceInfo?: QueryableSourceInfo | undefined,
  ) {
    super(applicationStore, graphManagerState, workflow, config, sourceInfo);
    makeObservable(this, {
      changeAccessorOwner: action,
      changeAccessor: action,
      accessorOwnerOptions: computed,
      compatibleRuntimes: computed,
    });
    this.workflowState.updateActionConfig(actionConfig);
    if (accessor) {
      this.changeSourceElement(accessor);
    }
    this.configureFilterPanelsForAccessor();
    // force from.
    this.executionContextState =
      new QueryBuilderEmbeddedFromExecutionContextState(this);
  }

  // we will not include data product as it is own state
  get accessorOwners(): AccessorOwner[] {
    return [
      ...this.graphManagerState.graph.ingests,
      ...this.graphManagerState.usableDatabases,
    ];
  }

  get accessorOwnerOptions(): AccessorOwnerOption[] {
    return this.accessorOwners.map(buildElementOption);
  }

  get selectedAccessorOwner(): AccessorOwner | undefined {
    return this.sourceAccessor?.parentElement;
  }

  get accessors(): {
    schemaName?: string | undefined;
    tableName: string;
  }[] {
    if (this.selectedAccessorOwner instanceof IngestDefinition) {
      const content = this.selectedAccessorOwner
        .content as unknown as TEMPORARY_IngestContent;
      return (
        content.datasets?.map((e) => ({
          tableName: e.name,
        })) ?? []
      );
    } else if (this.selectedAccessorOwner instanceof Database) {
      return this.selectedAccessorOwner.schemas.flatMap((schema) =>
        schema.tables.map((table) => ({
          schemaName: schema.name,
          tableName: table.name,
        })),
      );
    }
    return [];
  }

  get accessorsOptions(): {
    label: string;
    value: { schemaName?: string | undefined; tableName: string };
  }[] {
    return this.accessors.map((accessor) => ({
      label: accessor.schemaName
        ? `${accessor.schemaName}.${accessor.tableName}`
        : accessor.tableName,
      value: accessor,
    }));
  }

  get compatibleRuntimes(): PackageableRuntime[] {
    const owner = this.selectedAccessorOwner;
    if (!owner) {
      return [];
    }
    return getCompatibleRuntimesFromAccessorOwner(
      owner,
      this.graphManagerState,
    );
  }

  override get requiresMappingForExecution(): boolean {
    return false;
  }

  /**
   * In accessor mode, the filter panel does not support relation columns,
   * so we hide it and show the post-filter panel instead.
   */
  private configureFilterPanelsForAccessor(): void {
    this.filterState.setShowPanel(false);
    const tdsState = this.fetchStructureState.implementation;
    if (tdsState instanceof QueryBuilderTDSState) {
      tdsState.setShowPostFilterPanel(true);
    }
  }

  changeAccessorOwner(accessorOwner: AccessorOwner): void {
    const accessor =
      this.graphManagerState.graphManager.createAccessorFromPackageableElement(
        accessorOwner,
        this.graphManagerState.graph,
      );
    if (accessor) {
      this.changeSourceElement(accessor);
      this.configureFilterPanelsForAccessor();
    }
  }

  changeAccessor(value: {
    schemaName?: string | undefined;
    tableName: string;
  }): void {
    const owner = this.selectedAccessorOwner;
    if (owner) {
      const accessor =
        this.graphManagerState.graphManager.createAccessorFromPackageableElement(
          owner,
          this.graphManagerState.graph,
          {
            schemaName: value.schemaName,
            tableName: value.tableName,
          },
        );
      if (accessor) {
        this.changeSourceElement(accessor);
        this.configureFilterPanelsForAccessor();
      }
    }
  }

  changeSelectedRuntime(val: PackageableRuntime): void {
    this.changeRuntime(
      new RuntimePointer(PackageableElementExplicitReference.create(val)),
    );
  }
}
