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
import {
  type QueryBuilderConfig,
  QueryBuilderState,
} from '@finos/legend-query-builder';
import {
  type GraphManagerState,
  getMappingCompatibleClasses,
  RuntimePointer,
  type Runtime,
  Class,
  getDescendantsOfPackage,
  Package,
  createGraphBuilderReport,
  GRAPH_MANAGER_EVENT,
  LegendSDLC,
  V1_EngineRuntime,
  V1_Mapping,
  V1_PackageableRuntime,
  V1_PureGraphManager,
  resolvePackagePathAndElementName,
} from '@finos/legend-graph';
import {
  DepotScope,
  resolveVersion,
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
  StopWatch,
  LogEvent,
  guaranteeNonNullable,
  guaranteeType,
} from '@finos/legend-shared';
import { action, flow, flowResult, makeObservable, observable } from 'mobx';
import { renderDataSpaceQueryBuilderSetupPanelContent } from '../../components/query/DataSpaceQueryBuilder.js';
import {
  DataSpace,
  type DataSpaceExecutionContext,
} from '../../graph/metamodel/pure/model/packageableElements/dataSpace/DSL_DataSpace_DataSpace.js';
import { DATA_SPACE_ELEMENT_CLASSIFIER_PATH } from '../../graph-manager/protocol/pure/DSL_DataSpace_PureProtocolProcessorPlugin.js';
import { type DataSpaceInfo, extractDataSpaceInfo } from './DataSpaceInfo.js';
import { DataSpaceAdvancedSearchState } from './DataSpaceAdvancedSearchState.js';
import type { DataSpaceAnalysisResult } from '../../graph-manager/action/analytics/DataSpaceAnalysis.js';
import {
  LEGEND_QUERY_APP_EVENT,
  type QueryEditorStore,
} from '@finos/legend-application-query';

export const resolveUsableDataSpaceClasses = (
  queryBuilderState: DataSpaceQueryBuilderState,
): Class[] => {
  const dataSpace = queryBuilderState.dataSpace;
  const mapping = queryBuilderState.executionContext.mapping.value;
  const graphManagerState = queryBuilderState.graphManagerState;
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
  } else if (
    queryBuilderState.explorerState.mappingModelCoverageAnalysisResult &&
    // This check is to make sure that we have `info` field present in `MappedEntity` which
    // contains information about the mapped class path
    queryBuilderState.explorerState.mappingModelCoverageAnalysisResult.mappedEntities.some(
      (m) => m.info !== undefined,
    )
  ) {
    const compatibleClassPaths =
      queryBuilderState.explorerState.mappingModelCoverageAnalysisResult.mappedEntities.map(
        (e) => e.info?.classPath,
      );
    const uniqueCompatibleClasses = compatibleClassPaths.filter(
      (val, index) => compatibleClassPaths.indexOf(val) === index,
    );
    return graphManagerState.graph.classes.filter((c) =>
      uniqueCompatibleClasses.includes(c.path),
    );
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

export class DataSpaceQueryBuilderState extends QueryBuilderState {
  readonly depotServerClient: DepotServerClient;
  readonly isAdvancedDataSpaceSearchEnabled: boolean;
  readonly loadDataSpacesState = ActionState.create();
  readonly onDataSpaceChange: (val: DataSpaceInfo) => Promise<void>;
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
  isLightGraphEnabled!: boolean;

  constructor(
    applicationStore: GenericLegendApplicationStore,
    graphManagerState: GraphManagerState,
    depotServerClient: DepotServerClient,
    dataSpace: DataSpace,
    executionContext: DataSpaceExecutionContext,
    isLightGraphEnabled: boolean,
    onDataSpaceChange: (val: DataSpaceInfo) => Promise<void>,
    isAdvancedDataSpaceSearchEnabled: boolean,
    dataSpaceAnalysisResult?: DataSpaceAnalysisResult | undefined,
    onExecutionContextChange?:
      | ((val: DataSpaceExecutionContext) => void)
      | undefined,
    onRuntimeChange?: ((val: Runtime) => void) | undefined,
    onClassChange?: ((val: Class) => void) | undefined,
    projectInfo?: DataSpaceProjectInfo | undefined,
    config?: QueryBuilderConfig | undefined,
  ) {
    super(applicationStore, graphManagerState, config);

    makeObservable(this, {
      dataSpaces: observable,
      executionContext: observable,
      isLightGraphEnabled: observable,
      showRuntimeSelector: observable,
      advancedSearchState: observable,
      showAdvancedSearchPanel: action,
      hideAdvancedSearchPanel: action,
      setExecutionContext: action,
      setIsLightGraphEnabled: action,
      setShowRuntimeSelector: action,
      loadDataSpaces: flow,
    });

    this.depotServerClient = depotServerClient;
    this.dataSpace = dataSpace;
    this.executionContext = executionContext;
    this.projectInfo = projectInfo;
    this.isLightGraphEnabled = isLightGraphEnabled;
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

  setIsLightGraphEnabled(val: boolean): void {
    this.isLightGraphEnabled = val;
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

  *loadDataSpaces(searchText: string): GeneratorFn<void> {
    if (this.projectInfo) {
      const isValidSearchString =
        searchText.length >= DEFAULT_TYPEAHEAD_SEARCH_MINIMUM_SEARCH_LENGTH;
      this.loadDataSpacesState.inProgress();
      const toGetSnapShot =
        this.projectInfo.versionId === SNAPSHOT_VERSION_ALIAS;
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
  async propagateExecutionContextChange(
    executionContext: DataSpaceExecutionContext,
    editorStore?: QueryEditorStore,
    isGraphBuildingNotRequired?: boolean,
  ): Promise<void> {
    const mapping = executionContext.mapping.value;
    const mappingModelCoverageAnalysisResult =
      this.dataSpaceAnalysisResult?.executionContextsIndex.get(
        executionContext.name,
      )?.mappingModelCoverageAnalysisResult;
    if (this.dataSpaceAnalysisResult && mappingModelCoverageAnalysisResult) {
      if (!isGraphBuildingNotRequired && editorStore) {
        try {
          const stopWatch = new StopWatch();
          const graph = this.graphManagerState.createNewGraph();

          const graph_buildReport = createGraphBuilderReport();
          // Create dummy mappings and runtimes
          // TODO?: these stubbed mappings and runtimes are not really useful that useful, so either we should
          // simplify the model here or potentially refactor the backend analytics endpoint to return these as model
          const mappingModels = uniq(
            Array.from(
              this.dataSpaceAnalysisResult.executionContextsIndex.values(),
            ).map((context) => context.mapping),
          ).map((m) => {
            const _mapping = new V1_Mapping();
            const [packagePath, name] = resolvePackagePathAndElementName(
              m.path,
            );
            _mapping.package = packagePath;
            _mapping.name = name;
            return guaranteeType(
              this.graphManagerState.graphManager,
              V1_PureGraphManager,
            ).elementProtocolToEntity(_mapping);
          });
          const runtimeModels = uniq(
            Array.from(
              this.dataSpaceAnalysisResult.executionContextsIndex.values(),
            )
              .map((context) => context.defaultRuntime)
              .concat(
                Array.from(
                  this.dataSpaceAnalysisResult.executionContextsIndex.values(),
                ).flatMap((val) => val.compatibleRuntimes),
              ),
          ).map((r) => {
            const runtime = new V1_PackageableRuntime();
            const [packagePath, name] = resolvePackagePathAndElementName(
              r.path,
            );
            runtime.package = packagePath;
            runtime.name = name;
            runtime.runtimeValue = new V1_EngineRuntime();
            return guaranteeType(
              this.graphManagerState.graphManager,
              V1_PureGraphManager,
            ).elementProtocolToEntity(runtime);
          });
          const graphEntities = guaranteeNonNullable(
            mappingModelCoverageAnalysisResult.entities,
          )
            .concat(mappingModels)
            .concat(runtimeModels)
            // NOTE: if an element could be found in the graph already it means it comes from system
            // so we could rid of it
            .filter(
              (el) =>
                !graph.getNullableElement(el.path, false) &&
                !el.path.startsWith('meta::'),
            );
          await this.graphManagerState.graphManager.buildGraphForQuery(
            graph,
            graphEntities,
            ActionState.create(),
            {
              origin: new LegendSDLC(
                guaranteeNonNullable(this.projectInfo).groupId,
                guaranteeNonNullable(this.projectInfo).artifactId,
                resolveVersion(
                  guaranteeNonNullable(this.projectInfo).versionId,
                ),
              ),
            },
            graph_buildReport,
          );
          this.graphManagerState.graph = graph;
          const dependency_buildReport = createGraphBuilderReport();
          // report
          stopWatch.record(GRAPH_MANAGER_EVENT.INITIALIZE_GRAPH__SUCCESS);
          const graphBuilderReportData = {
            timings:
              this.applicationStore.timeService.finalizeTimingsRecord(
                stopWatch,
              ),
            dependencies: dependency_buildReport,
            dependenciesCount:
              this.graphManagerState.graph.dependencyManager
                .numberOfDependencies,
            graph: graph_buildReport,
          };
          editorStore.logBuildGraphMetrics(graphBuilderReportData);

          this.applicationStore.logService.info(
            LogEvent.create(GRAPH_MANAGER_EVENT.INITIALIZE_GRAPH__SUCCESS),
            graphBuilderReportData,
          );
        } catch (error) {
          assertErrorThrown(error);
          editorStore.applicationStore.logService.error(
            LogEvent.create(LEGEND_QUERY_APP_EVENT.GENERIC_FAILURE),
            error,
          );

          editorStore.graphManagerState.graph =
            editorStore.graphManagerState.createNewGraph();
          await flowResult(editorStore.buildFullGraph());
        }
      }
      this.explorerState.mappingModelCoverageAnalysisResult =
        mappingModelCoverageAnalysisResult;
    }
    const compatibleClasses = resolveUsableDataSpaceClasses(this);

    this.changeMapping(mapping);

    this.changeRuntime(new RuntimePointer(executionContext.defaultRuntime));

    // if there is no chosen class or the chosen one is not compatible
    // with the mapping then pick a compatible class if possible
    if (!this.class || !compatibleClasses.includes(this.class)) {
      const possibleNewClass = getNullableFirstEntry(compatibleClasses);
      if (possibleNewClass) {
        this.changeClass(possibleNewClass);
      }
    }
    this.explorerState.refreshTreeData();
  }
}
