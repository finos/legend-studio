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
  APPLICATION_EVENT,
  type GenericLegendApplicationStore,
} from '@finos/legend-application';
import {
  type QueryBuilderConfig,
  type QuerySDLC,
  type QueryBuilderWorkflowState,
  type QueryBuilderActionConfig,
  QueryBuilderState,
  type QueryBuilderExtraFunctionAnalysisInfo,
  QUERY_BUILDER_LAMBDA_WRITER_MODE,
} from '@finos/legend-query-builder';
import {
  type Class,
  type GraphManagerState,
  type QueryExecutionContext,
  type Runtime,
  type Mapping,
  type FunctionAnalysisInfo,
  type GraphData,
  getMappingCompatibleClasses,
  Package,
  QueryDataSpaceExecutionContext,
  elementBelongsToPackage,
  GraphDataWithOrigin,
  LegendSDLC,
  InMemoryGraphData,
} from '@finos/legend-graph';
import {
  type DepotServerClient,
  type StoredEntity,
  DepotScope,
  resolveVersion,
  SNAPSHOT_VERSION_ALIAS,
} from '@finos/legend-server-depot';
import {
  type GeneratorFn,
  ActionState,
  assertErrorThrown,
  filterByType,
  LogEvent,
  uniq,
} from '@finos/legend-shared';
import { action, flow, makeObservable, observable } from 'mobx';
import { renderDataSpaceQueryBuilderSetupPanelContent } from '../../components/query-builder/DataSpaceQueryBuilder.js';
import {
  type DataSpaceElement,
  type DataSpaceExecutionContext,
  DataSpace,
} from '../../graph/metamodel/pure/model/packageableElements/dataSpace/DSL_DataSpace_DataSpace.js';
import { DATA_SPACE_ELEMENT_CLASSIFIER_PATH } from '../../graph-manager/protocol/pure/DSL_DataSpace_PureProtocolProcessorPlugin.js';
import { DataSpaceAdvancedSearchState } from '../query/DataSpaceAdvancedSearchState.js';
import {
  type DataSpaceAnalysisResult,
  type DataSpaceExecutableAnalysisResult,
  DataSpaceServiceExecutableInfo,
} from '../../graph-manager/action/analytics/DataSpaceAnalysis.js';
import {
  type DataSpaceInfo,
  extractDataSpaceInfo,
} from '../shared/DataSpaceInfo.js';
import type { ProjectGAVCoordinates } from '@finos/legend-storage';
import { generateDataSpaceTemplateQueryCreatorRoute } from '../../__lib__/to-delete/DSL_DataSpace_LegendQueryNavigation_to_delete.js';
import { buildDataSpaceExecutableAnalysisResultFromExecutable } from '../../graph-manager/action/analytics/DataSpaceAnalysisHelper.js';

const matchesDataElement = (
  _class: Class,
  element: DataSpaceElement,
): boolean => {
  if (_class === element) {
    return true;
  }
  if (element instanceof Package) {
    return elementBelongsToPackage(_class, element);
  }
  return false;
};

export const resolveUsableDataSpaceClasses = (
  dataSpace: DataSpace,
  mapping: Mapping,
  graphManagerState: GraphManagerState,
  queryBuilderState?: DataSpaceQueryBuilderState,
): Class[] => {
  let compatibleClasses = getMappingCompatibleClasses(
    mapping,
    graphManagerState.usableClasses,
  );
  const mappingModelCoverageAnalysisResult =
    queryBuilderState?.dataSpaceAnalysisResult?.mappingToMappingCoverageResult?.get(
      mapping.path,
    );
  if (
    // This check is to make sure that we have `info` field present in `MappedEntity` which
    // contains information about the mapped class path
    mappingModelCoverageAnalysisResult?.mappedEntities.some(
      (m) => m.info !== undefined,
    )
  ) {
    const uniqueCompatibleClasses = uniq(
      mappingModelCoverageAnalysisResult.mappedEntities
        // is root entity filters out mapped classes
        .filter((e) => e.info?.isRootEntity)
        .map((e) => e.info?.classPath),
    );
    compatibleClasses = graphManagerState.graph.classes.filter((c) =>
      uniqueCompatibleClasses.includes(c.path),
    );
  }
  if (dataSpace.elements?.length) {
    const elements = dataSpace.elements;
    return compatibleClasses.filter((_class) => {
      const _classElements = elements
        .filter((e) => matchesDataElement(_class, e.element.value))
        // we sort because we respect the closest definition to the element.
        .sort(
          (a, b) => b.element.value.path.length - a.element.value.path.length,
        );
      if (!_classElements.length) {
        return false;
      }
      return !_classElements[0]?.exclude;
    });
  }
  return compatibleClasses;
};

export interface DataSpaceQuerySDLC extends QuerySDLC {
  groupId: string;
  artifactId: string;
  versionId: string;
  dataSpace: string;
}

// could be abstracted for element
export abstract class DataSpacesBuilderRepoistory {
  readonly applicationStore: GenericLegendApplicationStore;
  readonly graphManagerState: GraphManagerState;
  readonly loadDataSpacesState = ActionState.create();
  dataSpaces: DataSpaceInfo[] | undefined;
  prioritizeDataSpaceFunc?: ((val: DataSpaceInfo) => boolean) | undefined;

  constructor(
    applicatonstore: GenericLegendApplicationStore,
    graphManagerState: GraphManagerState,
    prioritizeDataSpaceFunc?: ((val: DataSpaceInfo) => boolean) | undefined,
  ) {
    this.applicationStore = applicatonstore;
    this.graphManagerState = graphManagerState;
    this.prioritizeDataSpaceFunc = prioritizeDataSpaceFunc;
  }

  get isAdvancedDataSpaceSearchEnabled(): boolean {
    return false;
  }

  get canVisitTemplateQuery(): boolean {
    return false;
  }

  abstract loadDataSpaces(): GeneratorFn<void>;
  abstract visitTemplateQuery(
    dataSpace: DataSpace,
    template: DataSpaceExecutableAnalysisResult,
  ): void;

  configureDataSpaceOptions(val: DataSpaceInfo[]): void {
    this.dataSpaces = val;
  }
}

export class DataSpacesGraphRepoistory extends DataSpacesBuilderRepoistory {
  constructor(
    applicatonstore: GenericLegendApplicationStore,
    graphManagerState: GraphManagerState,
    prioritizeDataSpaceFunc?: ((val: DataSpaceInfo) => boolean) | undefined,
  ) {
    super(applicatonstore, graphManagerState, prioritizeDataSpaceFunc);
    makeObservable(this, {
      dataSpaces: observable,
      loadDataSpaces: flow,
      configureDataSpaceOptions: action,
    });
  }

  *loadDataSpaces(): GeneratorFn<void> {
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

  override visitTemplateQuery(
    dataSpace: DataSpace,
    template: DataSpaceExecutableAnalysisResult,
  ): void {
    throw new Error('Method not implemented.');
  }
}

export class DataSpacesDepotRepository extends DataSpacesBuilderRepoistory {
  readonly depotServerClient: DepotServerClient;
  readonly project: ProjectGAVCoordinates;
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
  advancedSearchState?: DataSpaceAdvancedSearchState | undefined;

  constructor(
    depotServerClient: DepotServerClient,
    applicatonstore: GenericLegendApplicationStore,
    graphManagerState: GraphManagerState,
    project: ProjectGAVCoordinates,
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
    prioritizeDataSpaceFunc?: ((val: DataSpaceInfo) => boolean) | undefined,
  ) {
    super(applicatonstore, graphManagerState, prioritizeDataSpaceFunc);
    makeObservable(this, {
      advancedSearchState: observable,
      dataSpaces: observable,
      showAdvancedSearchPanel: action,
      hideAdvancedSearchPanel: action,
      visitTemplateQuery: action,
      configureDataSpaceOptions: action,
      loadDataSpaces: flow,
    });
    this.depotServerClient = depotServerClient;
    this.project = project;
    this.viewProject = viewProject;
    this.viewSDLCProject = viewSDLCProject;
  }

  override get isAdvancedDataSpaceSearchEnabled(): boolean {
    return true;
  }

  override get canVisitTemplateQuery(): boolean {
    return true;
  }

  override visitTemplateQuery(
    dataSpace: DataSpace,
    template: DataSpaceExecutableAnalysisResult,
  ): void {
    let templateId;
    if (template.info) {
      if (template.info.id) {
        templateId = template.info.id;
      } else if (template.info instanceof DataSpaceServiceExecutableInfo) {
        templateId = template.executable ?? template.info.pattern;
      }
    }
    if (!templateId) {
      this.applicationStore.notificationService.notifyWarning(
        `Can't visit tempalte query without a Id`,
      );
    } else {
      this.applicationStore.navigationService.navigator.visitAddress(
        this.applicationStore.navigationService.navigator.generateAddress(
          generateDataSpaceTemplateQueryCreatorRoute(
            this.project.groupId,
            this.project.artifactId,
            this.project.versionId,
            dataSpace.path,
            templateId,
          ),
        ),
      );
    }
  }

  showAdvancedSearchPanel(dataSpace: DataSpace): void {
    this.advancedSearchState = new DataSpaceAdvancedSearchState(
      this.applicationStore,
      this.graphManagerState,
      this.depotServerClient,
      {
        viewProject: this.viewProject,
        viewSDLCProject: this.viewSDLCProject,
      },
      {
        groupId: this.project.groupId,
        artifactId: this.project.artifactId,
        versionId: this.project.versionId,
        title: dataSpace.title,
        name: dataSpace.name,
        path: dataSpace.path,
        defaultExecutionContext: dataSpace.defaultExecutionContext.name,
      },
      this.project.versionId === SNAPSHOT_VERSION_ALIAS,
    );
  }

  hideAdvancedSearchPanel(): void {
    this.advancedSearchState = undefined;
  }

  *loadDataSpaces(): GeneratorFn<void> {
    if (this.dataSpaces === undefined) {
      this.loadDataSpacesState.inProgress();
      const toGetSnapShot = this.project.versionId === SNAPSHOT_VERSION_ALIAS;
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
        this.applicationStore.logService.error(
          LogEvent.create(APPLICATION_EVENT.GENERIC_FAILURE),
          error,
        );
      }
    }
  }
}

export class DataSpaceQueryBuilderState extends QueryBuilderState {
  readonly onDataSpaceChange: (val: DataSpaceInfo) => Promise<void>;
  readonly onExecutionContextChange?:
    | ((val: DataSpaceExecutionContext) => void)
    | undefined;
  readonly onRuntimeChange?: ((val: Runtime) => void) | undefined;
  readonly onClassChange?: ((val: Class) => void) | undefined;
  readonly dataSpaceAnalysisResult?: DataSpaceAnalysisResult | undefined;
  readonly dataSpaceRepo: DataSpacesBuilderRepoistory;

  override TEMPORARY__setupPanelContentRenderer = (): React.ReactNode =>
    renderDataSpaceQueryBuilderSetupPanelContent(this);

  dataSpace: DataSpace;
  executionContext!: DataSpaceExecutionContext;
  showRuntimeSelector = false;
  isTemplateQueryDialogOpen = false;
  isLightGraphEnabled!: boolean;
  displayedTemplateQueries: DataSpaceExecutableAnalysisResult[] | undefined;

  constructor(
    applicationStore: GenericLegendApplicationStore,
    graphManagerState: GraphManagerState,
    workflow: QueryBuilderWorkflowState,
    actionConfig: QueryBuilderActionConfig,
    dataSpace: DataSpace,
    executionContext: DataSpaceExecutionContext,
    isLightGraphEnabled: boolean,
    dataSpaceRepo: DataSpacesBuilderRepoistory | undefined,
    onDataSpaceChange: (val: DataSpaceInfo) => Promise<void>,
    dataSpaceAnalysisResult?: DataSpaceAnalysisResult | undefined,
    onExecutionContextChange?:
      | ((val: DataSpaceExecutionContext) => void)
      | undefined,
    onRuntimeChange?: ((val: Runtime) => void) | undefined,
    onClassChange?: ((val: Class) => void) | undefined,
    config?: QueryBuilderConfig | undefined,
    sourceInfo?: QuerySDLC | undefined,
  ) {
    super(applicationStore, graphManagerState, workflow, config, sourceInfo);

    makeObservable(this, {
      executionContext: observable,
      showRuntimeSelector: observable,
      isTemplateQueryDialogOpen: observable,
      isLightGraphEnabled: observable,
      displayedTemplateQueries: observable,
      setExecutionContext: action,
      setShowRuntimeSelector: action,
      setTemplateQueryDialogOpen: action,
      setIsLightGraphEnabled: action,
      intialize: flow,
    });

    this.dataSpace = dataSpace;
    this.executionContext = executionContext;
    this.onDataSpaceChange = onDataSpaceChange;
    this.onExecutionContextChange = onExecutionContextChange;
    this.onRuntimeChange = onRuntimeChange;
    this.onClassChange = onClassChange;
    this.dataSpaceRepo =
      dataSpaceRepo ??
      new DataSpacesGraphRepoistory(
        this.applicationStore,
        this.graphManagerState,
      );
    this.dataSpaceAnalysisResult = dataSpaceAnalysisResult;
    this.workflowState.updateActionConfig(actionConfig);
    this.isLightGraphEnabled = isLightGraphEnabled;
    if (dataSpaceAnalysisResult?.__INTERNAL__useRelationTDS) {
      this.setLambdaWriteMode(
        QUERY_BUILDER_LAMBDA_WRITER_MODE.TYPED_FETCH_STRUCTURE,
      );
    }
  }

  override get sideBarClassName(): string | undefined {
    return this.showRuntimeSelector
      ? 'query-builder__setup__data-space--with-runtime'
      : 'query-builder__setup__data-space';
  }

  override getQueryExecutionContext(): QueryExecutionContext {
    const queryExeContext = new QueryDataSpaceExecutionContext();
    queryExeContext.dataSpacePath = this.dataSpace.path;
    queryExeContext.executionKey = this.executionContext.name;
    return queryExeContext;
  }

  setTemplateQueryDialogOpen(val: boolean): void {
    this.isTemplateQueryDialogOpen = val;
  }

  setExecutionContext(val: DataSpaceExecutionContext): void {
    this.executionContext = val;
  }

  setShowRuntimeSelector(val: boolean): void {
    this.showRuntimeSelector = val;
  }

  setIsLightGraphEnabled(val: boolean): void {
    this.isLightGraphEnabled = val;
  }

  override buildFunctionAnalysisInfo():
    | QueryBuilderExtraFunctionAnalysisInfo
    | undefined {
    let functionInfoMap: Map<string, FunctionAnalysisInfo> = new Map<
      string,
      FunctionAnalysisInfo
    >();
    let dependencyFunctionInfoMap: Map<string, FunctionAnalysisInfo> = new Map<
      string,
      FunctionAnalysisInfo
    >();
    const functionInfos = this.dataSpaceAnalysisResult?.functionInfos;
    if (functionInfos) {
      functionInfoMap = functionInfos;
    }
    const dependencyFunctionInfos =
      this.dataSpaceAnalysisResult?.dependencyFunctionInfos;
    if (dependencyFunctionInfos) {
      dependencyFunctionInfoMap = dependencyFunctionInfos;
    }
    return {
      functionInfoMap,
      dependencyFunctionInfoMap,
    };
  }

  override getGraphData(): GraphData {
    if (this.dataSpaceRepo instanceof DataSpacesDepotRepository) {
      const option = new LegendSDLC(
        this.dataSpaceRepo.project.groupId,
        this.dataSpaceRepo.project.artifactId,
        resolveVersion(this.dataSpaceRepo.project.versionId),
      );
      return new GraphDataWithOrigin(option);
    }
    return new InMemoryGraphData(this.graphManagerState.graph);
  }

  *intialize(): GeneratorFn<void> {
    this.displayedTemplateQueries =
      this.dataSpace.executables && this.dataSpace.executables.length > 0
        ? ((yield buildDataSpaceExecutableAnalysisResultFromExecutable(
            this.dataSpace,
            this.dataSpace.executables,
            this.graphManagerState,
          )) as DataSpaceExecutableAnalysisResult[])
        : this.dataSpaceAnalysisResult?.executables.filter(
            (ex) => ex.info !== undefined,
          );
  }
}
