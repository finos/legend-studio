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
  type GenericLegendApplicationStore,
  DEFAULT_TYPEAHEAD_SEARCH_LIMIT,
  DEFAULT_TYPEAHEAD_SEARCH_MINIMUM_SEARCH_LENGTH,
} from '@finos/legend-application';
import { QueryBuilderState } from '@finos/legend-query-builder';
import {
  type GraphManagerState,
  getMappingCompatibleClasses,
  RuntimePointer,
  type Runtime,
  type Class,
} from '@finos/legend-graph';
import {
  DepotScope,
  SNAPSHOT_VERSION_ALIAS,
  type DepotServerClient,
  type StoredEntity,
} from '@finos/legend-server-depot';
import {
  type GeneratorFn,
  ActionState,
  assertErrorThrown,
  getNullableFirstEntry,
} from '@finos/legend-shared';
import { action, flow, makeObservable, observable } from 'mobx';
import { renderDataSpaceQueryBuilderSetupPanelContent } from '../../components/query/DataSpaceQueryBuilder.js';
import type {
  DataSpace,
  DataSpaceExecutionContext,
} from '../../graph/metamodel/pure/model/packageableElements/dataSpace/DSL_DataSpace_DataSpace.js';
import { DATA_SPACE_ELEMENT_CLASSIFIER_PATH } from '../../graph-manager/protocol/pure/DSL_DataSpace_PureProtocolProcessorPlugin.js';
import { type DataSpaceInfo, extractDataSpaceInfo } from './DataSpaceInfo.js';
import { DataSpaceAdvancedSearchState } from './DataSpaceAdvancedSearchState.js';

export class DataSpaceQueryBuilderState extends QueryBuilderState {
  readonly depotServerClient: DepotServerClient;
  readonly dataSpace: DataSpace;
  readonly groupId: string;
  readonly artifactId: string;
  readonly versionId: string;
  readonly viewProject: (
    groupId: string,
    artifactId: string,
    versionId: string,
    entityPath: string | undefined,
  ) => void;
  readonly viewSDLCProject: (
    groupId: string,
    artifactId: string,
    entityPath: string | undefined,
  ) => Promise<void>;
  readonly isAdvancedDataSpaceSearchEnabled: boolean;
  readonly loadDataSpacesState = ActionState.create();
  readonly onDataSpaceChange: (val: DataSpaceInfo) => void;
  readonly onExecutionContextChange?:
    | ((val: DataSpaceExecutionContext) => void)
    | undefined;
  readonly onRuntimeChange?: ((val: Runtime) => void) | undefined;
  readonly onClassChange?: ((val: Class) => void) | undefined;

  override TEMPORARY__setupPanelContentRenderer = (): React.ReactNode =>
    renderDataSpaceQueryBuilderSetupPanelContent(this);

  executionContext!: DataSpaceExecutionContext;
  dataSpaces: DataSpaceInfo[] = [];
  showRuntimeSelector = false;
  advancedSearchState?: DataSpaceAdvancedSearchState | undefined;

  constructor(
    applicationStore: GenericLegendApplicationStore,
    graphManagerState: GraphManagerState,
    depotServerClient: DepotServerClient,
    dataSpace: DataSpace,
    executionContext: DataSpaceExecutionContext,
    groupId: string,
    artifactId: string,
    versionId: string,
    viewProject: (
      groupId: string,
      artifactId: string,
      versionId: string,
      entityPath: string | undefined,
    ) => void,
    viewSDLCProject: (
      groupId: string,
      artifactId: string,
      entityPath: string | undefined,
    ) => Promise<void>,
    onDataSpaceChange: (val: DataSpaceInfo) => void,
    onExecutionContextChange?:
      | ((val: DataSpaceExecutionContext) => void)
      | undefined,
    onRuntimeChange?: ((val: Runtime) => void) | undefined,
    onClassChange?: ((val: Class) => void) | undefined,
  ) {
    super(applicationStore, graphManagerState);

    makeObservable(this, {
      dataSpaces: observable,
      executionContext: observable,
      showRuntimeSelector: observable,
      advancedSearchState: observable,
      showAdvancedSearchPanel: action,
      hideAdvancedSearchPanel: action,
      setExecutionContext: action,
      setShowRuntimeSelector: action,
      loadDataSpaces: flow,
    });

    this.depotServerClient = depotServerClient;
    this.dataSpace = dataSpace;
    this.executionContext = executionContext;
    this.groupId = groupId;
    this.artifactId = artifactId;
    this.versionId = versionId;
    this.viewProject = viewProject;
    this.viewSDLCProject = viewSDLCProject;
    this.onDataSpaceChange = onDataSpaceChange;
    this.onExecutionContextChange = onExecutionContextChange;
    this.onRuntimeChange = onRuntimeChange;
    this.onClassChange = onClassChange;
    // NOTE: if we reuse this state in the future (e.g. in Studio), we might need
    // to turn this flag off
    this.isAdvancedDataSpaceSearchEnabled = true;
  }

  override get sideBarClassName(): string | undefined {
    return this.showRuntimeSelector
      ? 'query-builder__setup__data-space--with-runtime'
      : 'query-builder__setup__data-space';
  }

  showAdvancedSearchPanel(): void {
    this.advancedSearchState = new DataSpaceAdvancedSearchState(
      this.applicationStore,
      this.graphManagerState,
      this.depotServerClient,
      {
        viewProject: this.viewProject,
        viewSDLCProject: this.viewSDLCProject,
      },
      {
        groupId: this.groupId,
        artifactId: this.artifactId,
        versionId: this.versionId,
        title: this.dataSpace.title,
        name: this.dataSpace.name,
        path: this.dataSpace.path,
        defaultExecutionContext: this.dataSpace.defaultExecutionContext.name,
      },
      this.versionId === SNAPSHOT_VERSION_ALIAS,
    );
  }

  hideAdvancedSearchPanel(): void {
    this.advancedSearchState = undefined;
  }

  setExecutionContext(val: DataSpaceExecutionContext): void {
    this.executionContext = val;
  }

  setShowRuntimeSelector(val: boolean): void {
    this.showRuntimeSelector = val;
  }

  *loadDataSpaces(searchText: string): GeneratorFn<void> {
    const isValidSearchString =
      searchText.length >= DEFAULT_TYPEAHEAD_SEARCH_MINIMUM_SEARCH_LENGTH;
    this.loadDataSpacesState.inProgress();
    const toGetSnapShot = this.versionId === SNAPSHOT_VERSION_ALIAS;
    try {
      this.dataSpaces = (
        (yield this.depotServerClient.getEntitiesByClassifierPath(
          DATA_SPACE_ELEMENT_CLASSIFIER_PATH,
          {
            search: isValidSearchString ? searchText : undefined,
            scope: toGetSnapShot ? DepotScope.SNAPSHOT : DepotScope.RELEASES,
            limit: DEFAULT_TYPEAHEAD_SEARCH_LIMIT,
          },
        )) as StoredEntity[]
      ).map((storedEntity) =>
        extractDataSpaceInfo(storedEntity, toGetSnapShot),
      );
      this.loadDataSpacesState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.loadDataSpacesState.fail();
      this.applicationStore.notificationService.notifyError(error);
    }
  }

  /**
   * Propagation after changing the execution context:
   * - The mapping will be updated to the mapping of the execution context
   * - The runtime will be updated to the default runtime of the execution context
   * - If no class is chosen, try to choose a compatible class
   * - If the chosen class is compatible with the new selected execution context mapping, do nothing, otherwise, try to choose a compatible class
   */
  propagateExecutionContextChange(
    executionContext: DataSpaceExecutionContext,
  ): void {
    const mapping = executionContext.mapping.value;
    this.changeMapping(mapping);
    this.changeRuntime(new RuntimePointer(executionContext.defaultRuntime));

    const compatibleClasses = getMappingCompatibleClasses(
      mapping,
      this.graphManagerState.usableClasses,
    );
    // if there is no chosen class or the chosen one is not compatible
    // with the mapping then pick a compatible class if possible
    if (!this.class || !compatibleClasses.includes(this.class)) {
      const possibleNewClass = getNullableFirstEntry(compatibleClasses);
      if (possibleNewClass) {
        this.changeClass(possibleNewClass);
      }
    }
  }
}
