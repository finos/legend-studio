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
  DataSpaceQueryBuilderState,
  ResolvedDataSpaceEntityWithOrigin,
} from '@finos/legend-extension-dsl-data-space/application';
import {
  DATA_SPACE_ELEMENT_CLASSIFIER_PATH,
  type DataSpaceExecutionContext,
  DataSpaceServiceExecutableInfo,
  extractDataSpaceInfo,
  type DataSpace,
  type DataSpaceExecutableAnalysisResult,
  type DataSpaceAnalysisResult,
} from '@finos/legend-extension-dsl-data-space/graph';
import {
  generateDataSpaceQueryCreatorRoute,
  generateDataSpaceTemplateQueryCreatorRoute,
} from '../../../__lib__/DSL_DataSpace_LegendQueryNavigation.js';
import {
  DataSpaceAdvancedSearchState,
  type DataSpaceOption,
} from '@finos/legend-extension-dsl-data-space/application-query';
import {
  DepotScope,
  extractDepotEntityInfo,
  resolveVersion,
  SNAPSHOT_VERSION_ALIAS,
  type StoredEntity,
  type StoredSummaryEntity,
  type DepotServerClient,
} from '@finos/legend-server-depot';
import {
  CORE_PURE_PATH,
  GraphDataWithOrigin,
  LegendSDLC,
  RuntimePointer,
  type Class,
  type GraphData,
  type GraphManagerState,
  type Runtime,
} from '@finos/legend-graph';
import {
  ExtraOptionsConfig,
  type QueryBuilderActionConfig,
  type QueryBuilderConfig,
  type QueryBuilderWorkflowState,
  type QuerySDLC,
} from '@finos/legend-query-builder';
import type { LegendQueryApplicationStore } from '../../LegendQueryBaseStore.js';
import {
  createViewProjectHandler,
  createViewSDLCProjectHandler,
} from '../DataSpaceQueryBuilderHelper.js';
import {
  assertErrorThrown,
  LogEvent,
  type GeneratorFn,
} from '@finos/legend-shared';
import type {
  DepotEntityWithOrigin,
  ProjectGAVCoordinates,
} from '@finos/legend-storage';
import { APPLICATION_EVENT } from '@finos/legend-application';

/**
 * Legend Query DataSpace query builder state.
 */
export class LegendQueryDataSpaceQueryBuilderState extends DataSpaceQueryBuilderState {
  declare applicationStore: LegendQueryApplicationStore;
  depotServerClient: DepotServerClient;
  project: ProjectGAVCoordinates;
  disableDataProducts = false;
  declare extraOptionsConfig: ExtraOptionsConfig<DepotEntityWithOrigin>;

  constructor(
    applicationStore: LegendQueryApplicationStore,
    graphManagerState: GraphManagerState,
    workflow: QueryBuilderWorkflowState,
    actionConfig: QueryBuilderActionConfig,
    dataSpace: DataSpace,
    executionContext: DataSpaceExecutionContext,
    isLightGraphEnabled: boolean,
    depotServerClient: DepotServerClient,
    project: ProjectGAVCoordinates,
    prioritizeEntityFunc:
      | ((val: ResolvedDataSpaceEntityWithOrigin) => boolean)
      | undefined,
    onDataSpaceChange: (
      val: ResolvedDataSpaceEntityWithOrigin,
    ) => Promise<void>,
    dataSpaceAnalysisResult?: DataSpaceAnalysisResult | undefined,
    onExecutionContextChange?:
      | ((val: DataSpaceExecutionContext) => void)
      | undefined,
    onRuntimeChange?: ((val: Runtime) => void) | undefined,
    onClassChange?: ((val: Class) => void) | undefined,
    config?: QueryBuilderConfig | undefined,
    sourceInfo?: QuerySDLC | undefined,
  ) {
    super(
      applicationStore,
      graphManagerState,
      workflow,
      actionConfig,
      dataSpace,
      executionContext,
      isLightGraphEnabled,
      prioritizeEntityFunc,
      onDataSpaceChange,
      dataSpaceAnalysisResult,
      onExecutionContextChange,
      onRuntimeChange,
      onClassChange,
      config,
      sourceInfo,
    );
    this.project = project;
    this.depotServerClient = depotServerClient;
    this.extraOptionsConfig = new ExtraOptionsConfig<DepotEntityWithOrigin>(
      'DataProduct',
      'DEPOT_ENTITY_WITH_ORIGIN',
      undefined,
      undefined,
      (val: DepotEntityWithOrigin): string => val.path,
      undefined,
      undefined,
    );
  }

  override get isAdvancedDataSpaceSearchEnabled(): boolean {
    return true;
  }

  override get canVisitTemplateQuery(): boolean {
    return true;
  }

  get sdlc(): LegendSDLC {
    return new LegendSDLC(
      this.project.groupId,
      this.project.artifactId,
      resolveVersion(this.project.versionId),
    );
  }

  override get isDataSpaceLinkable(): boolean {
    return true;
  }

  withOptions(
    dataspaces: ResolvedDataSpaceEntityWithOrigin[] | undefined,
    products: DepotEntityWithOrigin[] | undefined,
  ): LegendQueryDataSpaceQueryBuilderState {
    this.entities = dataspaces;
    if (products) {
      this.extraOptionsConfig.setOptions(
        products.map((e) => ({
          label: e.path,
          value: e,
        })),
      );
    }
    return this;
  }

  override copyDataSpaceLinkToClipboard(): void {
    const dataSpace = this.dataSpace;
    const executionContext = this.executionContext;
    const runtimePath =
      this.executionContextState.runtimeValue instanceof RuntimePointer
        ? this.executionContextState.runtimeValue.packageableRuntime.value.path
        : undefined;
    const route =
      this.applicationStore.navigationService.navigator.generateAddress(
        generateDataSpaceQueryCreatorRoute(
          this.project.groupId,
          this.project.artifactId,
          this.project.versionId,
          dataSpace.path,
          executionContext.name,
          runtimePath,
          this.class?.path,
        ),
      );

    navigator.clipboard
      .writeText(route)
      .catch(() =>
        this.applicationStore.notificationService.notifyError(
          'Error copying data product query set up link to clipboard',
        ),
      );

    this.applicationStore.notificationService.notifySuccess(
      'Copied data product query set up link to clipboard',
    );
  }

  override get selectedDataSpaceOption(): DataSpaceOption {
    return {
      label: this.dataSpace.title ?? this.dataSpace.name,
      value: new ResolvedDataSpaceEntityWithOrigin(
        {
          groupId: this.project.groupId,
          artifactId: this.project.artifactId,
          versionId: this.project.versionId,
        },
        this.dataSpace.title,
        this.dataSpace.name,
        this.dataSpace.path,
        this.dataSpace.defaultExecutionContext.name,
      ),
    };
  }

  override *loadEntities(): GeneratorFn<void> {
    if (this.entities === undefined) {
      this.loadEntitiesState.inProgress();
      const toGetSnapShot = this.project.versionId === SNAPSHOT_VERSION_ALIAS;
      try {
        // use promise
        this.entities = (
          (yield this.depotServerClient.getEntitiesByClassifier(
            DATA_SPACE_ELEMENT_CLASSIFIER_PATH,
            {
              scope: toGetSnapShot ? DepotScope.SNAPSHOT : DepotScope.RELEASES,
            },
          )) as StoredEntity[]
        ).map((storedEntity) =>
          extractDataSpaceInfo(storedEntity, toGetSnapShot),
        );
        const dataProducts = this.disableDataProducts
          ? []
          : (
              (yield this.depotServerClient.getEntitiesSummaryByClassifier(
                CORE_PURE_PATH.DATA_PRODUCT,
                {
                  scope: DepotScope.RELEASES,
                  summary: true,
                },
              )) as StoredSummaryEntity[]
            ).map((storedEntity) => {
              return extractDepotEntityInfo(storedEntity, false);
            });
        this.extraOptionsConfig.setOptions(
          dataProducts.map((e) => ({
            label: e.name,
            value: e,
          })),
        );
        this.loadEntitiesState.pass();
      } catch (error) {
        assertErrorThrown(error);
        this.loadEntitiesState.fail();
        this.applicationStore.notificationService.notifyError(error);
        this.applicationStore.logService.error(
          LogEvent.create(APPLICATION_EVENT.GENERIC_FAILURE),
          error,
        );
      }
    }
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
        `Can't visit template query without an Id`,
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

  override showAdvancedSearchPanel(dataSpace: DataSpace): void {
    this.advancedSearchState = new DataSpaceAdvancedSearchState(
      this.applicationStore,
      this.graphManagerState,
      this.depotServerClient,
      {
        viewProject: createViewProjectHandler(this.applicationStore),
        viewSDLCProject: createViewSDLCProjectHandler(
          this.applicationStore,
          this.depotServerClient,
        ),
      },
      new ResolvedDataSpaceEntityWithOrigin(
        {
          groupId: this.project.groupId,
          artifactId: this.project.artifactId,
          versionId: this.project.versionId,
        },
        dataSpace.title,
        dataSpace.name,
        dataSpace.path,
        dataSpace.defaultExecutionContext.name,
      ),
      this.project.versionId === SNAPSHOT_VERSION_ALIAS,
    );
  }

  override getGraphData(): GraphData {
    return new GraphDataWithOrigin(this.sdlc);
  }
}
