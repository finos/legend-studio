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

import { type GenericLegendApplicationStore } from '@finos/legend-application';
import {
  type QueryBuilderConfig,
  QueryBuilderState,
  type QuerySDLC,
} from '@finos/legend-query-builder';
import {
  type GraphManagerState,
  getMappingCompatibleClasses,
  RuntimePointer,
  type Runtime,
  Class,
  type Mapping,
  getDescendantsOfPackage,
  Package,
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
  filterByType,
  uniq,
} from '@finos/legend-shared';
import { action, flow, makeObservable, observable } from 'mobx';
import { renderDataSpaceQueryBuilderSetupPanelContent } from '../../components/query-builder/DataSpaceQueryBuilder.js';
import {
  DataSpace,
  type DataSpaceExecutionContext,
} from '../../graph/metamodel/pure/model/packageableElements/dataSpace/DSL_DataSpace_DataSpace.js';
import { DATA_SPACE_ELEMENT_CLASSIFIER_PATH } from '../../graph-manager/protocol/pure/DSL_DataSpace_PureProtocolProcessorPlugin.js';
import { DataSpaceAdvancedSearchState } from '../query/DataSpaceAdvancedSearchState.js';
import type { DataSpaceAnalysisResult } from '../../graph-manager/action/analytics/DataSpaceAnalysis.js';
import {
  extractDataSpaceInfo,
  type DataSpaceInfo,
} from '../shared/DataSpaceInfo.js';

export const resolveUsableDataSpaceClasses = (
  dataSpace: DataSpace,
  mapping: Mapping,
  graphManagerState: GraphManagerState,
): Class[] => {
  if (dataSpace.elements?.length) {
    const dataSpaceElements = dataSpace.elements.map((ep) => ep.element.value);
    return uniq([
      ...dataSpaceElements.filter(filterByType(Class)),
      ...dataSpaceElements
        .filter(filterByType(Package))
        .map((_package) => Array.from(getDescendantsOfPackage(_package)))
        .flat()
        .filter(filterByType(Class)),
    ]);
  }
  return getMappingCompatibleClasses(mapping, graphManagerState.usableClasses);
};

export class DataSpaceProjectInfo {
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

  constructor(
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
  ) {
    this.groupId = groupId;
    this.artifactId = artifactId;
    this.versionId = versionId;
    this.viewProject = viewProject;
    this.viewSDLCProject = viewSDLCProject;
  }
}

export interface DataSpaceQuerySDLC extends QuerySDLC {
  groupId: string;
  artifactId: string;
  versionId: string;
  dataSpace: string;
}

export class DataSpaceQueryBuilderState extends QueryBuilderState {
  readonly depotServerClient: DepotServerClient;
  readonly isAdvancedDataSpaceSearchEnabled: boolean;
  readonly loadDataSpacesState = ActionState.create();
  readonly onDataSpaceChange: (val: DataSpaceInfo) => void;
  readonly onExecutionContextChange?:
    | ((val: DataSpaceExecutionContext) => void)
    | undefined;
  readonly onRuntimeChange?: ((val: Runtime) => void) | undefined;
  readonly onClassChange?: ((val: Class) => void) | undefined;
  readonly dataSpaceAnalysisResult?: DataSpaceAnalysisResult | undefined;
  readonly projectInfo?: DataSpaceProjectInfo | undefined;

  override TEMPORARY__setupPanelContentRenderer = (): React.ReactNode =>
    renderDataSpaceQueryBuilderSetupPanelContent(this);

  dataSpace: DataSpace;
  executionContext!: DataSpaceExecutionContext;
  dataSpaces: DataSpaceInfo[] = [];
  showRuntimeSelector = false;
  advancedSearchState?: DataSpaceAdvancedSearchState | undefined;
  isTemplateQueryDialogOpen = false;

  constructor(
    applicationStore: GenericLegendApplicationStore,
    graphManagerState: GraphManagerState,
    depotServerClient: DepotServerClient,
    dataSpace: DataSpace,
    executionContext: DataSpaceExecutionContext,
    onDataSpaceChange: (val: DataSpaceInfo) => void,
    isAdvancedDataSpaceSearchEnabled: boolean,
    dataSpaceAnalysisResult?: DataSpaceAnalysisResult | undefined,
    onExecutionContextChange?:
      | ((val: DataSpaceExecutionContext) => void)
      | undefined,
    onRuntimeChange?: ((val: Runtime) => void) | undefined,
    onClassChange?: ((val: Class) => void) | undefined,
    projectInfo?: DataSpaceProjectInfo | undefined,
    config?: QueryBuilderConfig | undefined,
    sourceInfo?: QuerySDLC | undefined,
  ) {
    super(applicationStore, graphManagerState, config, sourceInfo);

    makeObservable(this, {
      dataSpaces: observable,
      executionContext: observable,
      showRuntimeSelector: observable,
      advancedSearchState: observable,
      isTemplateQueryDialogOpen: observable,
      showAdvancedSearchPanel: action,
      hideAdvancedSearchPanel: action,
      setExecutionContext: action,
      setShowRuntimeSelector: action,
      setTemplateQueryDialogOpen: action,
      loadDataSpaces: flow,
    });

    this.depotServerClient = depotServerClient;
    this.dataSpace = dataSpace;
    this.executionContext = executionContext;
    this.projectInfo = projectInfo;
    this.onDataSpaceChange = onDataSpaceChange;
    this.onExecutionContextChange = onExecutionContextChange;
    this.onRuntimeChange = onRuntimeChange;
    this.onClassChange = onClassChange;
    this.isAdvancedDataSpaceSearchEnabled = isAdvancedDataSpaceSearchEnabled;
    this.dataSpaceAnalysisResult = dataSpaceAnalysisResult;
  }

  override get sideBarClassName(): string | undefined {
    return this.showRuntimeSelector
      ? 'query-builder__setup__data-space--with-runtime'
      : 'query-builder__setup__data-space';
  }

  setTemplateQueryDialogOpen(val: boolean): void {
    this.isTemplateQueryDialogOpen = val;
  }

  showAdvancedSearchPanel(): void {
    if (this.projectInfo && this.isAdvancedDataSpaceSearchEnabled) {
      this.advancedSearchState = new DataSpaceAdvancedSearchState(
        this.applicationStore,
        this.graphManagerState,
        this.depotServerClient,
        {
          viewProject: this.projectInfo.viewProject,
          viewSDLCProject: this.projectInfo.viewSDLCProject,
        },
        {
          groupId: this.projectInfo.groupId,
          artifactId: this.projectInfo.artifactId,
          versionId: this.projectInfo.versionId,
          title: this.dataSpace.title,
          name: this.dataSpace.name,
          path: this.dataSpace.path,
          defaultExecutionContext: this.dataSpace.defaultExecutionContext.name,
        },
        this.projectInfo.versionId === SNAPSHOT_VERSION_ALIAS,
      );
    }
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

  *loadDataSpaces(): GeneratorFn<void> {
    if (this.projectInfo) {
      this.loadDataSpacesState.inProgress();
      const toGetSnapShot =
        this.projectInfo.versionId === SNAPSHOT_VERSION_ALIAS;
      try {
        this.dataSpaces = (
          (yield this.depotServerClient.getEntitiesByClassifier(
            DATA_SPACE_ELEMENT_CLASSIFIER_PATH,
            {
              scope: toGetSnapShot ? DepotScope.SNAPSHOT : DepotScope.RELEASES,
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
    } else {
      this.dataSpaces = this.graphManagerState.graph.allOwnElements
        .filter(filterByType(DataSpace))
        .map(
          (e) =>
            ({
              groupId: undefined,
              artifactId: undefined,
              versionId: undefined,
              path: e.path,
              name: e.name,
              title: e.title,
              defaultExecutionContext: e.defaultExecutionContext.title,
            }) as DataSpaceInfo,
        );
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
    const mappingModelCoverageAnalysisResult =
      this.dataSpaceAnalysisResult?.executionContextsIndex.get(
        executionContext.name,
      )?.mappingModelCoverageAnalysisResult;
    if (mappingModelCoverageAnalysisResult) {
      this.explorerState.mappingModelCoverageAnalysisResult =
        mappingModelCoverageAnalysisResult;
    }
    this.changeRuntime(new RuntimePointer(executionContext.defaultRuntime));

    const compatibleClasses = resolveUsableDataSpaceClasses(
      this.dataSpace,
      mapping,
      this.graphManagerState,
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
