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
  type DataSpaceExecutionContext,
  DataSpaceServiceExecutableInfo,
  type DataSpace,
  type DataSpaceExecutableAnalysisResult,
  type DataSpaceAnalysisResult,
  resolveExecutionContextMapping,
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
  resolveVersion,
  SNAPSHOT_VERSION_ALIAS,
  type DepotServerClient,
} from '@finos/legend-server-depot';
import {
  GraphDataWithOrigin,
  INTERNAL_ELEMENT_PATH,
  LakehouseRuntime,
  LegendSDLC,
  PackageableElementExplicitReference,
  RuntimePointer,
  getMappingCompatibleRuntimes,
  type Class,
  type GraphData,
  type GraphManagerState,
  type PackageableElement,
  type PackageableRuntime,
  type Runtime,
} from '@finos/legend-graph';
import {
  type QueryBuilderActionConfig,
  type QueryBuilderConfig,
  type QueryBuilderWorkflowState,
} from '@finos/legend-query-builder';
import { renderLegendQueryDataSpaceQueryBuilderSetupPanelContent } from '../../../components/data-space/LegendQueryDataSpaceQueryBuilder.js';
import type { LegendQueryApplicationStore } from '../../LegendQueryBaseStore.js';
import { QueryBuilderActionConfig_QueryApplication } from '../../QueryEditorStore.js';
import {
  createViewProjectHandler,
  createViewSDLCProjectHandler,
} from '../DataSpaceQueryBuilderHelper.js';
import {
  type GeneratorFn,
  LogEvent,
  assertErrorThrown,
} from '@finos/legend-shared';
import { action, flowResult, makeObservable, observable, reaction } from 'mobx';
import type {
  DepotEntityWithOrigin,
  ProjectGAVCoordinates,
  QueryableSourceInfo,
} from '@finos/legend-storage';
import type { DataProductSelectorState } from '../DataProductSelectorState.js';
import { LegendQueryUserDataHelper } from '../../../__lib__/LegendQueryUserDataHelper.js';
import { createDataSpaceRuntimePreferenceId } from '../../../__lib__/LegendQueryUserDataSpaceHelper.js';
import { LEGEND_QUERY_APP_EVENT } from '../../../__lib__/LegendQueryEvent.js';

export class LegendQueryDataSpaceQueryBuilderState extends DataSpaceQueryBuilderState {
  declare applicationStore: LegendQueryApplicationStore;
  depotServerClient: DepotServerClient;
  project: ProjectGAVCoordinates;
  readonly onDataProductChange: (val: DepotEntityWithOrigin) => void;
  productSelectorState: DataProductSelectorState;

  injectedLakehouseRuntime: LakehouseRuntime | undefined;
  /**
   * The runtime this user saved for the current execution context, if any
   */
  savedRuntimePath: string | undefined;

  override TEMPORARY__setupPanelContentRenderer = (): React.ReactNode =>
    renderLegendQueryDataSpaceQueryBuilderSetupPanelContent(this);

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
    productSelectorState: DataProductSelectorState,
    onDataProductChange: (val: DepotEntityWithOrigin) => void,
    dataSpaceAnalysisResult?: DataSpaceAnalysisResult | undefined,
    onExecutionContextChange?:
      | ((val: DataSpaceExecutionContext) => void)
      | undefined,
    onRuntimeChange?: ((val: Runtime) => void) | undefined,
    onClassChange?: ((val: Class) => void) | undefined,
    config?: QueryBuilderConfig | undefined,
    sourceInfo?: QueryableSourceInfo | undefined,
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
    this.productSelectorState = productSelectorState;
    this.onDataProductChange = onDataProductChange;
    this.injectedLakehouseRuntime = this.resolveInjectedLakehouseRuntime();

    makeObservable(this, {
      injectedLakehouseRuntime: observable,
      savedRuntimePath: observable,
      setInjectedLakehouseRuntime: action,
      setSavedRuntimePath: action,
    });

    reaction(
      () => this.executionContextState.runtimeValue,
      () =>
        this.setInjectedLakehouseRuntime(
          this.resolveInjectedLakehouseRuntime(),
        ),
    );
  }

  setInjectedLakehouseRuntime(val: LakehouseRuntime | undefined): void {
    this.injectedLakehouseRuntime = val;
  }

  setSavedRuntimePath(val: string | undefined): void {
    this.savedRuntimePath = val;
  }

  /**
   * The runtimes that can run the mapping of the current execution context
   */
  get compatibleRuntimes(): PackageableRuntime[] {
    const mapping = resolveExecutionContextMapping(this.executionContext);
    if (!mapping) {
      return [];
    }
    const analyzedExecutionContext = this.dataSpaceAnalysisResult
      ? Array.from(
          this.dataSpaceAnalysisResult.executionContextsIndex.values(),
        ).find((context) => context.mapping.path === mapping.path)
      : undefined;
    return (
      analyzedExecutionContext?.compatibleRuntimes ??
      getMappingCompatibleRuntimes(
        mapping,
        this.graphManagerState.usableRuntimes,
      )
    );
  }

  get currentRuntimePath(): string | undefined {
    const runtime = this.executionContextState.runtimeValue;
    return runtime instanceof RuntimePointer
      ? runtime.packageableRuntime.value.path
      : undefined;
  }

  get defaultRuntimePath(): string | undefined {
    return this.executionContext.defaultRuntime?.value.path;
  }

  private get runtimePreferenceId(): string {
    return createDataSpaceRuntimePreferenceId(
      this.project.groupId,
      this.project.artifactId,
      this.dataSpace.path,
      this.executionContext.name,
    );
  }

  /**
   * Switches to the runtime this user picked for the current execution context
   * before, if any. A saved runtime that can no longer run the context, e.g.
   * removed in a newer version of the project, is forgotten.
   *
   * Returns whether the saved runtime is in use.
   */
  applySavedRuntime(): boolean {
    this.setSavedRuntimePath(undefined);
    const savedRuntimePath =
      LegendQueryUserDataHelper.getDataSpaceRuntimePreference(
        this.applicationStore.userDataService,
        this.runtimePreferenceId,
      );
    if (!savedRuntimePath) {
      return false;
    }
    const runtime = this.compatibleRuntimes.find(
      (compatibleRuntime) => compatibleRuntime.path === savedRuntimePath,
    );
    if (!runtime || savedRuntimePath === this.defaultRuntimePath) {
      this.forgetSavedRuntime();
      return false;
    }
    // mark the choice as used again, so choices in use are not the ones
    // dropped when the list is full
    this.saveRuntime(savedRuntimePath);
    if (this.currentRuntimePath !== savedRuntimePath) {
      this.changeRuntime(
        new RuntimePointer(PackageableElementExplicitReference.create(runtime)),
      );
    }
    // a runtime other than the default is never applied out of sight
    this.setShowRuntimeSelector(true);
    return true;
  }

  /**
   * Saves the runtime this user picked in the setup panel for the current
   * execution context. Picking the context's default runtime forgets the choice.
   */
  rememberRuntime(runtime: Runtime): void {
    if (!(runtime instanceof RuntimePointer)) {
      return;
    }
    const packageableRuntime = runtime.packageableRuntime.value;
    // runtimes Query builds for the session, e.g. the lakehouse fallback, are
    // not found again by their path
    if (packageableRuntime.package?.path === INTERNAL_ELEMENT_PATH) {
      return;
    }
    if (packageableRuntime.path === this.defaultRuntimePath) {
      this.forgetSavedRuntime();
      return;
    }
    this.saveRuntime(packageableRuntime.path);
  }

  /**
   * Goes back to the default runtime of the current execution context and
   * forgets the runtime this user saved for it
   */
  resetToDefaultRuntime(): void {
    const defaultRuntime = this.executionContext.defaultRuntime;
    if (defaultRuntime) {
      this.changeRuntime(new RuntimePointer(defaultRuntime));
    }
    this.forgetSavedRuntime();
  }

  private saveRuntime(runtimePath: string): void {
    this.setSavedRuntimePath(runtimePath);
    try {
      LegendQueryUserDataHelper.persistDataSpaceRuntimePreference(
        this.applicationStore.userDataService,
        this.runtimePreferenceId,
        runtimePath,
      );
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.logService.warn(
        LogEvent.create(LEGEND_QUERY_APP_EVENT.LOCAL_STORAGE_PERSIST_ERROR),
        error.message,
      );
    }
  }

  private forgetSavedRuntime(): void {
    this.setSavedRuntimePath(undefined);
    try {
      LegendQueryUserDataHelper.removeDataSpaceRuntimePreference(
        this.applicationStore.userDataService,
        this.runtimePreferenceId,
      );
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.logService.warn(
        LogEvent.create(LEGEND_QUERY_APP_EVENT.LOCAL_STORAGE_PERSIST_ERROR),
        error.message,
      );
    }
  }

  private resolveInjectedLakehouseRuntime(): LakehouseRuntime | undefined {
    const runtime = this.executionContextState.runtimeValue;
    if (!(runtime instanceof RuntimePointer)) {
      return undefined;
    }
    const packageableRuntime = runtime.packageableRuntime.value;
    if (packageableRuntime.package?.path !== INTERNAL_ELEMENT_PATH) {
      return undefined;
    }
    return packageableRuntime.runtimeValue instanceof LakehouseRuntime
      ? packageableRuntime.runtimeValue
      : undefined;
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
      this.productSelectorState.setDataProducts(products);
    }
    return this;
  }

  override copyDataSpaceLinkToClipboard(): void {
    const editorStore =
      this.workflowState.actionConfig instanceof
      QueryBuilderActionConfig_QueryApplication
        ? this.workflowState.actionConfig.editorStore
        : undefined;
    const editorRoute = editorStore?.getEditorRoute();
    let routePath: string;
    if (editorRoute) {
      routePath = editorRoute;
    } else {
      const dataSpace = this.dataSpace;
      const executionContext = this.executionContext;
      const runtimePath =
        this.executionContextState.runtimeValue instanceof RuntimePointer
          ? this.executionContextState.runtimeValue.packageableRuntime.value
              .path
          : undefined;
      routePath = generateDataSpaceQueryCreatorRoute(
        this.project.groupId,
        this.project.artifactId,
        this.project.versionId,
        dataSpace.path,
        executionContext.name,
        runtimePath,
        this.sourceClass?.path,
      );
    }
    const route =
      this.applicationStore.navigationService.navigator.generateAddress(
        routePath,
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
        this.dataSpace.defaultExecutionContext?.name,
      ),
    };
  }

  override *loadEntities(): GeneratorFn<void> {
    if (this.entities === undefined) {
      this.loadEntitiesState.inProgress();
      try {
        // If the selector already has data, use it; otherwise trigger loading
        if (!this.productSelectorState.isCompletelyLoaded) {
          yield flowResult(this.productSelectorState.loadProducts());
        }
        this.entities = this.productSelectorState.legacyDataProducts;
        this.loadEntitiesState.pass();
      } catch {
        this.loadEntitiesState.fail();
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
        dataSpace.defaultExecutionContext?.name,
      ),
      this.project.versionId === SNAPSHOT_VERSION_ALIAS,
    );
  }

  override getGraphData(): GraphData {
    return new GraphDataWithOrigin(this.sdlc);
  }

  override get floatingExecutionElements(): PackageableElement[] | undefined {
    if (!this.injectedLakehouseRuntime) {
      return undefined;
    }
    const runtime = this.executionContextState.runtimeValue;
    return runtime instanceof RuntimePointer
      ? [runtime.packageableRuntime.value]
      : undefined;
  }
}
