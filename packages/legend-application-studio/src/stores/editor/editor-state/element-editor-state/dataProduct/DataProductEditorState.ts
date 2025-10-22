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
  DataProduct,
  LakehouseAccessPoint,
  type PackageableElement,
  type IngestDefinition,
  AccessPoint,
  stub_RawLambda,
  LakehouseTargetEnv,
  LAMBDA_PIPE,
  type RawLambda,
  ParserError,
  GRAPH_MANAGER_EVENT,
  isStubbed_RawLambda,
  AccessPointGroup,
  CodeCompletionResult,
  type Stereotype,
  getStereotype,
  type StereotypeReference,
  ModelAccessPointGroup,
  PackageableRuntime,
  Association,
  Class,
  Enumeration,
  Package,
  observe_DataProductRuntimeInfo,
  PackageableElementExplicitReference,
  DataProductRuntimeInfo,
  type DataProductElement,
  type Mapping,
  Expertise,
  observe_DataProductElementScope,
  DataProductElementScope,
  validate_PureExecutionMapping,
  type V1_RawLineageModel,
} from '@finos/legend-graph';
import type { EditorStore } from '../../../EditorStore.js';
import { ElementEditorState } from '../ElementEditorState.js';
import {
  action,
  computed,
  flow,
  makeObservable,
  observable,
  runInAction,
} from 'mobx';
import {
  guaranteeType,
  addUniqueEntry,
  type GeneratorFn,
  assertErrorThrown,
  LogEvent,
  deleteEntry,
  filterByType,
  ActionState,
  guaranteeNonNullable,
  assertTrue,
  uuid,
  swapEntry,
  returnUndefOnError,
  deepEqual,
} from '@finos/legend-shared';
import {
  accessPointGroup_swapAccessPoints,
  dataProduct_addAccessPoint,
  dataProduct_addAccessPointGroup,
  dataProduct_addExpertise,
  dataProduct_deleteAccessPoint,
  dataProduct_deleteAccessPointGroup,
  dataProduct_swapAccessPointGroups,
  modelAccessPointGroup_addCompatibleRuntime,
  modelAccessPointGroup_addElement,
  modelAccessPointGroup_removeCompatibleRuntime,
  modelAccessPointGroup_removeElement,
  modelAccessPointGroup_setDefaultRuntime,
  modelAccessPointGroup_setElementExclude,
  modelAccessPointGroup_setMapping,
} from '../../../../graph-modifier/DSL_DataProduct_GraphModifierHelper.js';
import { LambdaEditorState, LineageState } from '@finos/legend-query-builder';
import {
  DataProductElementEditorInitialConfiguration,
  EditorInitialConfiguration,
} from '../ElementEditorInitialConfiguration.js';
import { EXTERNAL_APPLICATION_NAVIGATION__generateUrlWithEditorConfig } from '../../../../../__lib__/LegendStudioNavigation.js';
import type {
  AdhocDataProductDeployResponse,
  LakehouseIngestionManager,
} from '@finos/legend-server-lakehouse';

export enum DATA_PRODUCT_TAB {
  HOME = 'Home',
  SUPPORT = 'Support',
  APG = 'APG',
}

export enum DATA_PRODUCT_TYPE {
  INTERNAL = 'Internal',
  EXTERNAL = 'External',
}

export class AccessPointState {
  readonly uuid = uuid();
  state: AccessPointGroupState;
  accessPoint: AccessPoint;

  constructor(val: AccessPoint, editorState: AccessPointGroupState) {
    this.accessPoint = val;
    this.state = editorState;

    makeObservable(this, {
      state: observable,
      accessPoint: observable,
      changeGroupState: action,
    });
  }

  changeGroupState(newGroup: AccessPointGroupState): void {
    this.state = newGroup;
  }
}

export class AccessPointLambdaEditorState extends LambdaEditorState {
  readonly editorStore: EditorStore;
  readonly val: LakehouseAccessPointState;

  constructor(val: LakehouseAccessPointState) {
    super('', LAMBDA_PIPE, {
      typeAheadEnabled: true,
    });
    this.val = val;
    this.editorStore = val.state.state.editorStore;
  }

  override get lambdaId(): string {
    return this.val.accessPoint.id;
  }

  override get fullLambdaString(): string {
    return `${this.lambdaString}`;
  }

  *convertLambdaGrammarStringToObject(): GeneratorFn<void> {
    const emptyLambda = stub_RawLambda();
    if (this.lambdaString) {
      try {
        const lambda =
          (yield this.editorStore.graphManagerState.graphManager.pureCodeToLambda(
            this.fullLambdaString,
            this.lambdaId,
          )) as RawLambda;
        this.setParserError(undefined);
        this.val.accessPoint.func = lambda;
      } catch (error) {
        assertErrorThrown(error);
        if (error instanceof ParserError) {
          this.setParserError(error);
        }
        this.editorStore.applicationStore.logService.error(
          LogEvent.create(GRAPH_MANAGER_EVENT.PARSING_FAILURE),
          error,
        );
      }
    } else {
      this.clearErrors();
      this.val.accessPoint.func = emptyLambda;
    }
  }

  *convertLambdaObjectToGrammarString(options?: {
    pretty?: boolean | undefined;
    preserveCompilationError?: boolean | undefined;
  }): GeneratorFn<void> {
    if (
      !isStubbed_RawLambda(this.val.accessPoint.func) &&
      !this.val.state.state.isConvertingTransformLambdaObjects
    ) {
      try {
        const lambdas = new Map<string, RawLambda>();
        lambdas.set(this.lambdaId, this.val.accessPoint.func);
        const isolatedLambdas =
          (yield this.editorStore.graphManagerState.graphManager.lambdasToPureCode(
            lambdas,
            options?.pretty,
          )) as Map<string, string>;
        const grammarText = isolatedLambdas.get(this.lambdaId);
        this.setLambdaString(
          grammarText !== undefined
            ? this.extractLambdaString(grammarText)
            : '',
        );
        this.clearErrors({
          preserveCompilationError: options?.preserveCompilationError,
        });
      } catch (error) {
        assertErrorThrown(error);
        this.editorStore.applicationStore.logService.error(
          LogEvent.create(GRAPH_MANAGER_EVENT.PARSING_FAILURE),
          error,
        );
      }
    } else {
      this.clearErrors();
      this.setLambdaString('');
    }
  }

  override async getCodeComplete(input: string): Promise<CodeCompletionResult> {
    try {
      return (await this.editorStore.graphManagerState.graphManager.getCodeComplete(
        input,
        this.editorStore.graphManagerState.graph,
        undefined,
        {
          ignoreElements: [this.val.state.state.product.path],
        },
      )) as unknown as CodeCompletionResult;
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(GRAPH_MANAGER_EVENT.PARSING_FAILURE),
        error,
      );
      return new CodeCompletionResult();
    }
  }
}

export class LakehouseAccessPointState extends AccessPointState {
  declare accessPoint: LakehouseAccessPoint;
  lambdaState: AccessPointLambdaEditorState;

  showDebug = false;

  // Add lineage state and isGeneratingLineage
  lineageState: LineageState;
  isGeneratingLineage = false;

  constructor(val: LakehouseAccessPoint, editorState: AccessPointGroupState) {
    super(val, editorState);
    makeObservable(this, {
      lambdaState: observable,
      showDebug: observable,
      setShowDebug: action,
      // Add observables for lineage
      lineageState: observable,
      isGeneratingLineage: observable,
      generateLineage: flow,
    });
    this.accessPoint = val;
    this.lambdaState = new AccessPointLambdaEditorState(this);
    this.lineageState = new LineageState(
      this.state.state.editorStore.applicationStore,
    );
  }

  setShowDebug(value: boolean): void {
    this.showDebug = value;
  }

  *generateLineage(): GeneratorFn<void> {
    if (this.isGeneratingLineage) {
      return;
    }
    try {
      this.isGeneratingLineage = true;
      const lambda = this.accessPoint.func;
      const lineageRawData =
        (yield this.state.state.editorStore.graphManagerState.graphManager.generateLineage(
          lambda,
          undefined,
          undefined,
          this.state.state.editorStore.graphManagerState.graph,
          undefined,
        )) as V1_RawLineageModel;

      const lineageData =
        this.state.state.editorStore.graphManagerState.graphManager.buildLineage(
          lineageRawData,
        );

      this.lineageState.setLineageData(lineageData);
    } catch (error) {
      assertErrorThrown(error);
      this.state.state.editorStore.applicationStore.logService.error(
        LogEvent.create(GRAPH_MANAGER_EVENT.LINEAGE_GENERATION_FAILURE),
        error,
      );
      this.state.state.editorStore.applicationStore.notificationService.notifyError(
        error,
      );
    } finally {
      this.isGeneratingLineage = false;
    }
  }
}

export class AccessPointGroupState {
  readonly state: DataProductEditorState;
  readonly uuid = uuid();
  value: AccessPointGroup;
  accessPointStates: AccessPointState[] = [];

  constructor(val: AccessPointGroup, editorState: DataProductEditorState) {
    this.value = val;
    this.state = editorState;
    this.accessPointStates = val.accessPoints.map((e) =>
      this.buildAccessPointState(e),
    );

    makeObservable(this, {
      value: observable,
      accessPointStates: observable,
      addAccessPoint: action,
      deleteAccessPoint: action,
      swapAccessPoints: action,
      containsPublicStereotype: computed,
    });
  }

  get containsPublicStereotype(): StereotypeReference | undefined {
    return this.value.stereotypes.find(
      (stereotype) => stereotype.value === this.publicStereotype,
    );
  }

  get publicStereotype(): Stereotype | undefined {
    const publicStereotype =
      this.state.editorStore.applicationStore.config.options.dataProductConfig
        ?.publicStereotype;

    if (publicStereotype) {
      return returnUndefOnError(() =>
        getStereotype(
          this.state.editorStore.graphManagerState.graph.getProfile(
            publicStereotype.profile,
          ),
          publicStereotype.stereotype,
        ),
      );
    }

    return undefined;
  }

  hasErrors(): boolean {
    return (
      this.accessPointStates.length === 0 ||
      this.value.id === '' ||
      !this.value.description ||
      !this.value.title ||
      Boolean(
        this.accessPointStates.find((apState) => apState.accessPoint.id === ''),
      ) ||
      Boolean(
        this.accessPointStates.find((apState) => !apState.accessPoint.title),
      ) ||
      Boolean(
        this.accessPointStates.find(
          (apState) => !apState.accessPoint.description,
        ),
      )
    );
  }

  deleteAccessPoint(val: AccessPointState): void {
    const state = this.accessPointStates.find((a) => a === val);
    deleteEntry(this.accessPointStates, state);
    dataProduct_deleteAccessPoint(this.value, val.accessPoint);
  }

  addAccessPoint(point: AccessPoint | AccessPointState): void {
    const accessPointState =
      point instanceof AccessPoint ? this.buildAccessPointState(point) : point;
    addUniqueEntry(this.accessPointStates, accessPointState);
    dataProduct_addAccessPoint(this.value, accessPointState.accessPoint);
  }

  swapAccessPoints(
    sourceAccessPoint: AccessPointState,
    targetAccessPoint: AccessPointState,
  ): void {
    swapEntry(this.accessPointStates, sourceAccessPoint, targetAccessPoint);
    accessPointGroup_swapAccessPoints(
      this.value,
      sourceAccessPoint.accessPoint,
      targetAccessPoint.accessPoint,
    );
  }

  buildAccessPointState(val: AccessPoint): AccessPointState {
    if (val instanceof LakehouseAccessPoint) {
      return new LakehouseAccessPointState(val, this);
    }
    return new AccessPointState(val, this);
  }
}

export class ModelAccessPointGroupState extends AccessPointGroupState {
  declare value: ModelAccessPointGroup;
  showNewModal = false;

  constructor(val: ModelAccessPointGroup, editorState: DataProductEditorState) {
    super(val, editorState);
    this.value = val;
  }

  setMapping(mapping: Mapping): void {
    modelAccessPointGroup_setMapping(
      this.value,
      PackageableElementExplicitReference.create(mapping),
    );
  }

  setDefaultRuntime(runtime: DataProductRuntimeInfo) {
    modelAccessPointGroup_setDefaultRuntime(this.value, runtime);
  }

  addCompatibleRuntime(runtime: PackageableRuntime): void {
    const newRuntime = observe_DataProductRuntimeInfo(
      new DataProductRuntimeInfo(),
    );
    newRuntime.id = runtime.name;
    newRuntime.runtime = PackageableElementExplicitReference.create(runtime);
    modelAccessPointGroup_addCompatibleRuntime(this.value, newRuntime);

    if (deepEqual(this.value.defaultRuntime, new DataProductRuntimeInfo())) {
      this.setDefaultRuntime(newRuntime);
    }
  }

  removeCompatibleRuntime(runtime: DataProductRuntimeInfo): void {
    modelAccessPointGroup_removeCompatibleRuntime(this.value, runtime);
    if (runtime === this.value.defaultRuntime) {
      if (!this.value.compatibleRuntimes.length) {
        this.setDefaultRuntime(new DataProductRuntimeInfo());
      } else if (this.value.compatibleRuntimes[0]) {
        this.setDefaultRuntime(this.value.compatibleRuntimes[0]);
      }
    }
  }

  addFeaturedElement(element: DataProductElement): void {
    const elementPointer = observe_DataProductElementScope(
      new DataProductElementScope(),
    );
    elementPointer.element =
      PackageableElementExplicitReference.create(element);
    modelAccessPointGroup_addElement(this.value, elementPointer);
  }

  removeFeaturedElement(element: DataProductElementScope): void {
    modelAccessPointGroup_removeElement(this.value, element);
  }

  excludeFeaturedElement(
    element: DataProductElementScope,
    value: boolean,
  ): void {
    modelAccessPointGroup_setElementExclude(element, value);
  }

  override hasErrors(): boolean {
    return Boolean(
      super.hasErrors() ||
        !validate_PureExecutionMapping(this.value.mapping.value) ||
        !deepEqual(this.value.defaultRuntime, new DataProductRuntimeInfo()),
    );
  }

  getCompatibleRuntimeOptions(): {
    label: string;
    value: PackageableRuntime;
  }[] {
    const currentRuntimes = this.value.compatibleRuntimes.map(
      (runtimePointer) => runtimePointer.runtime.value,
    );
    return this.state.editorStore.graphManagerState.graph.allOwnElements
      .filter(
        (element): element is PackageableRuntime =>
          element instanceof PackageableRuntime,
      )
      .filter((runtime) => !currentRuntimes.includes(runtime))
      .map((runtime) => ({
        label: runtime.path,
        value: runtime,
      }));
  }

  isValidDataProductElement(
    element: PackageableElement,
  ): element is DataProductElement {
    return (
      element instanceof Package ||
      element instanceof Class ||
      element instanceof Enumeration ||
      element instanceof Association
    );
  }

  getFeaturedElementOptions(): { label: string; value: DataProductElement }[] {
    const currentElements = this.value.featuredElements.map(
      (elementPointer) => elementPointer.element.value,
    );
    return this.state.editorStore.graphManagerState.graph.allOwnElements
      .filter((element) => this.isValidDataProductElement(element))
      .filter((element) => !currentElements.includes(element))
      .map((element) => ({
        label: element.path,
        value: element,
      }));
  }
}

const createEditorInitialConfiguration = (): EditorInitialConfiguration => {
  const config = new EditorInitialConfiguration();
  const ingest = new DataProductElementEditorInitialConfiguration();
  ingest.deployOnOpen = true;
  config.elementEditorConfiguration = ingest;
  return config;
};

const editorInitialConfigToBase64 = (val: EditorInitialConfiguration): string =>
  btoa(JSON.stringify(EditorInitialConfiguration.serialization.toJson(val)));

export const generateUrlToDeployOnOpen = (
  val: DataProductEditorState,
): string => {
  return val.editorStore.applicationStore.navigationService.navigator.generateAddress(
    EXTERNAL_APPLICATION_NAVIGATION__generateUrlWithEditorConfig(
      val.editorStore.editorMode.generateElementLink(val.product.path),
      editorInitialConfigToBase64(createEditorInitialConfiguration()),
    ),
  );
};

export class DataProductEditorState extends ElementEditorState {
  deploymentState = ActionState.create();
  accessPointGroupStates: AccessPointGroupState[] = [];
  isConvertingTransformLambdaObjects = false;
  deployOnOpen = false;
  deployResponse: AdhocDataProductDeployResponse | undefined;
  selectedGroupState: AccessPointGroupState | undefined;
  selectedTab: DATA_PRODUCT_TAB;
  modelledDataProduct = false;

  constructor(
    editorStore: EditorStore,
    element: PackageableElement,
    config?: EditorInitialConfiguration,
  ) {
    super(editorStore, element);

    makeObservable(this, {
      product: computed,
      accessPointGroupStates: observable,
      isConvertingTransformLambdaObjects: observable,
      selectedTab: observable,
      modelledDataProduct: observable,
      setSelectedTab: action,
      addGroupState: action,
      deleteGroupState: action,
      deploy: flow,
      deployOnOpen: observable,
      deployResponse: observable,
      setDeployOnOpen: action,
      setDeployResponse: action,
      addAccessPoint: action,
      convertAccessPointsFuncObjects: flow,
      selectedGroupState: observable,
      setSelectedGroupState: action,
      swapAccessPointGroups: action,
    });

    this.accessPointGroupStates = this.product.accessPointGroups.map((e) => {
      if (e instanceof ModelAccessPointGroup) {
        this.modelledDataProduct = true;
        return new ModelAccessPointGroupState(e, this);
      } else if (e instanceof AccessPointGroup) {
        return new AccessPointGroupState(e, this);
      } else {
        throw new Error(
          `Can't build access point group state for unsupported access point group type: ${e}`,
        );
      }
    });

    this.selectedGroupState = this.accessPointGroupStates[0];

    const elementConfig = config?.elementEditorConfiguration;
    if (elementConfig instanceof DataProductElementEditorInitialConfiguration) {
      this.deployOnOpen = elementConfig.deployOnOpen ?? false;
    }
    this.selectedTab = DATA_PRODUCT_TAB.HOME;
  }

  setDeployOnOpen(value: boolean): void {
    this.deployOnOpen = value;
  }

  setDeployResponse(
    response: AdhocDataProductDeployResponse | undefined,
  ): void {
    this.deployResponse = response;
  }

  setSelectedTab(value: DATA_PRODUCT_TAB): void {
    this.selectedTab = value;
  }

  addGroupState(value: AccessPointGroupState): void {
    this.accessPointGroupStates.push(value);
  }

  deleteGroupState(value: AccessPointGroupState): void {
    deleteEntry(
      this.accessPointGroupStates,
      this.accessPointGroupStates.find((a) => a === value),
    );
  }

  swapAccessPointGroups(
    sourceGroup: AccessPointGroupState,
    targetGroup: AccessPointGroupState,
  ): void {
    swapEntry(this.accessPointGroupStates, sourceGroup, targetGroup);
    dataProduct_swapAccessPointGroups(
      this.product,
      sourceGroup.value,
      targetGroup.value,
    );
  }

  *convertAccessPointsFuncObjects(): GeneratorFn<void> {
    const lambdas = new Map<string, RawLambda>();
    const index = new Map<string, LakehouseAccessPointState>();
    const states = this.accessPointGroupStates
      .map((e) => e.accessPointStates)
      .flat()
      .filter(filterByType(LakehouseAccessPointState));
    states.forEach((pm) => {
      if (!isStubbed_RawLambda(pm.accessPoint.func)) {
        lambdas.set(pm.lambdaState.lambdaId, pm.accessPoint.func);
        index.set(pm.lambdaState.lambdaId, pm);
      }
    });
    if (lambdas.size) {
      this.isConvertingTransformLambdaObjects = true;
      try {
        const isolatedLambdas =
          (yield this.editorStore.graphManagerState.graphManager.lambdasToPureCode(
            lambdas,
          )) as Map<string, string>;
        isolatedLambdas.forEach((grammarText, key) => {
          const purePropertyMapping = index.get(key);
          if (
            purePropertyMapping?.lambdaState.lambdaPrefix &&
            grammarText.startsWith(purePropertyMapping.lambdaState.lambdaPrefix)
          ) {
            purePropertyMapping.lambdaState.setLambdaString(
              purePropertyMapping.lambdaState.extractLambdaString(grammarText),
            );
          } else {
            purePropertyMapping?.lambdaState.setLambdaString(grammarText);
          }
        });
      } catch (error) {
        assertErrorThrown(error);
        this.editorStore.applicationStore.logService.error(
          LogEvent.create(GRAPH_MANAGER_EVENT.PARSING_FAILURE),
          error,
        );
      } finally {
        this.isConvertingTransformLambdaObjects = false;
      }
    }
  }

  setSelectedGroupState(val: AccessPointGroupState | undefined): void {
    this.selectedGroupState = val;
  }

  addAccessPoint(
    id: string,
    description: string | undefined,
    accessPointGroup: AccessPointGroupState | string,
  ): void {
    const accesspoint = new LakehouseAccessPoint(
      id,
      LakehouseTargetEnv.Snowflake,
      stub_RawLambda(),
    );
    accesspoint.description = description;
    const groupState =
      accessPointGroup instanceof AccessPointGroupState
        ? accessPointGroup
        : this.createGroupAndAdd(accessPointGroup);
    groupState.addAccessPoint(accesspoint);
    addUniqueEntry(this.accessPointGroupStates, groupState);
  }

  createGroupAndAdd(id: string, description?: string): AccessPointGroupState {
    const existingGroupState = this.accessPointGroupStates.find(
      (groupState) => groupState.value.id === id,
    );

    if (existingGroupState) {
      return existingGroupState;
    }
    const group = new AccessPointGroup();
    group.id = id;
    group.description = description;
    dataProduct_addAccessPointGroup(this.product, group);
    const newGroupState = new AccessPointGroupState(group, this);
    this.addGroupState(newGroupState);
    return newGroupState;
  }

  deleteAccessPointGroup(val: AccessPointGroupState): void {
    const state = this.accessPointGroupStates.find((a) => a === val);
    runInAction(() => {
      if (state) {
        this.deleteGroupState(state);
        if (state === this.selectedGroupState) {
          this.setSelectedGroupState(this.accessPointGroupStates[0]);
        }
      }
      dataProduct_deleteAccessPointGroup(this.product, val.value);
    });
  }

  createExpertise() {
    const newExpertise = new Expertise();
    dataProduct_addExpertise(this.product, newExpertise);
  }

  *deploy(token: string | undefined): GeneratorFn<void> {
    try {
      assertTrue(
        this.validForDeployment,
        'Data product definition is not valid for deployment',
      );
      this.deploymentState.inProgress();
      // The grammar we provide will be for the current data product + all ingests (used for compilation)
      const grammar =
        (yield this.editorStore.graphManagerState.graphManager.elementsToPureCode(
          [...this.editorStore.graphManagerState.graph.ingests, this.product],
        )) as unknown as string;

      const response = (yield guaranteeNonNullable(
        this.ingestionManager,
      ).deployDataProduct(
        grammar,
        guaranteeNonNullable(this.associatedIngest?.appDirDeployment),
        (val: string) =>
          this.editorStore.applicationStore.alertService.setBlockingAlert({
            message: val,
            showLoading: true,
          }),
        token,
      )) as unknown as AdhocDataProductDeployResponse;
      this.setDeployResponse(response);
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.notificationService.notifyError(
        `Ingest definition failed to deploy: ${error.message}`,
      );
    } finally {
      this.deploymentState.complete();
      this.editorStore.applicationStore.alertService.setBlockingAlert(
        undefined,
      );
    }
  }

  clearSupportInfo(): void {
    const supportInfo = this.product.supportInfo;
    runInAction(() => {
      //if the url is empty, the label should be too
      if (supportInfo?.documentation && !supportInfo.documentation.url) {
        supportInfo.documentation = undefined;
      } else if (supportInfo?.website && !supportInfo.website.url) {
        supportInfo.website = undefined;
      } else if (supportInfo?.faqUrl && !supportInfo.faqUrl.url) {
        supportInfo.faqUrl = undefined;
      } else if (supportInfo?.supportUrl && !supportInfo.supportUrl.url) {
        supportInfo.supportUrl = undefined;
      }
      //clear support info section if everything is clear
      if (
        !supportInfo?.documentation &&
        !supportInfo?.website &&
        !supportInfo?.faqUrl &&
        !supportInfo?.supportUrl &&
        supportInfo?.emails.length === 0
      ) {
        this.product.supportInfo = undefined;
      }
    });
  }

  get product(): DataProduct {
    return guaranteeType(
      this.element,
      DataProduct,
      'Element inside data product editor state must be a data product',
    );
  }

  get validForDeployment(): boolean {
    return Boolean(
      this.associatedIngest?.appDirDeployment && this.ingestionManager,
    );
  }

  get accessPoints(): AccessPoint[] {
    return this.product.accessPointGroups.map((e) => e.accessPoints).flat();
  }

  get ingestionManager(): LakehouseIngestionManager | undefined {
    return this.editorStore.ingestionManager;
  }

  get deployValidationMessage(): string {
    if (!this.associatedIngest?.appDirDeployment) {
      return 'No app dir deployment found';
    } else if (!this.ingestionManager) {
      return 'No ingestion manager found';
    }
    return 'Deploy';
  }

  // We need to get the associated Ingest to get the app dir deployment
  // We could do a more in depth check on the access point lambdas to check which ingest it uses but for now
  // we will assume all ingests have the same DID
  // we get the last one, to prioritize the ones in the current project followed by dependency ones
  get associatedIngest(): IngestDefinition | undefined {
    return this.editorStore.graphManagerState.graph.ingests.slice(-1)[0];
  }

  override reprocess(
    newElement: PackageableElement,
    editorStore: EditorStore,
  ): DataProductEditorState {
    const editorState = new DataProductEditorState(editorStore, newElement);
    return editorState;
  }
}
