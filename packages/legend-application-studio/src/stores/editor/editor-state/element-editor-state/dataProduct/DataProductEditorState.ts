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
  type AccessPoint,
  stub_RawLambda,
  LakehouseTargetEnv,
  LAMBDA_PIPE,
  type RawLambda,
  ParserError,
  GRAPH_MANAGER_EVENT,
  isStubbed_RawLambda,
  AccessPointGroup,
  CodeCompletionResult,
} from '@finos/legend-graph';
import type { EditorStore } from '../../../EditorStore.js';
import { ElementEditorState } from '../ElementEditorState.js';
import { action, computed, flow, makeObservable, observable } from 'mobx';
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
} from '@finos/legend-shared';
import {
  dataProduct_addAccessPoint,
  dataProduct_addAccessPointGroup,
  dataProduct_deleteAccessPoint,
  dataProduct_deleteAccessPointGroup,
} from '../../../../graph-modifier/DSL_DataProduct_GraphModifierHelper.js';
import { LambdaEditorState } from '@finos/legend-query-builder';
import {
  DataProductElementEditorInitialConfiguration,
  EditorInitialConfiguration,
} from '../ElementEditorInitialConfiguration.js';
import { EXTERNAL_APPLICATION_NAVIGATION__generateUrlWithEditorConfig } from '../../../../../__lib__/LegendStudioNavigation.js';
import type {
  AdhocDataProductDeployResponse,
  LakehouseIngestionManager,
} from '@finos/legend-server-lakehouse';

export class AccessPointState {
  readonly state: AccessPointGroupState;
  accessPoint: AccessPoint;

  constructor(val: AccessPoint, editorState: AccessPointGroupState) {
    this.accessPoint = val;
    this.state = editorState;
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

  constructor(val: LakehouseAccessPoint, editorState: AccessPointGroupState) {
    super(val, editorState);
    makeObservable(this, {
      lambdaState: observable,
    });
    this.accessPoint = val;
    this.lambdaState = new AccessPointLambdaEditorState(this);
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
    });
  }

  deleteAccessPoint(val: AccessPointState): void {
    const state = this.accessPointStates.find((a) => a === val);
    deleteEntry(this.accessPointStates, state);
    dataProduct_deleteAccessPoint(this.value, val.accessPoint);
  }

  addAccessPoint(point: AccessPoint): void {
    const accessPointState = this.buildAccessPointState(point);
    addUniqueEntry(this.accessPointStates, accessPointState);
    dataProduct_addAccessPoint(this.value, point);
  }

  buildAccessPointState(val: AccessPoint): AccessPointState {
    if (val instanceof LakehouseAccessPoint) {
      return new LakehouseAccessPointState(val, this);
    }
    return new AccessPointState(val, this);
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
  accessPointModal = false;
  accessPointGroupModal = false;
  deploymentState = ActionState.create();
  accessPointGroupStates: AccessPointGroupState[] = [];
  isConvertingTransformLambdaObjects = false;
  deployOnOpen = false;
  deployResponse: AdhocDataProductDeployResponse | undefined;
  editingGroupState: AccessPointGroupState | undefined;

  constructor(
    editorStore: EditorStore,
    element: PackageableElement,
    config?: EditorInitialConfiguration,
  ) {
    super(editorStore, element);

    makeObservable(this, {
      product: computed,
      accessPointModal: observable,
      accessPointGroupModal: observable,
      accessPointGroupStates: observable,
      isConvertingTransformLambdaObjects: observable,
      deploy: flow,
      deployOnOpen: observable,
      deployResponse: observable,
      setDeployOnOpen: action,
      setDeployResponse: action,
      setAccessPointModal: action,
      setAccessPointGroupModal: action,
      addAccessPoint: action,
      convertAccessPointsFuncObjects: flow,
      editingGroupState: observable,
      setEditingGroupState: action,
    });
    this.accessPointGroupStates = this.product.accessPointGroups.map(
      (e) => new AccessPointGroupState(e, this),
    );
    const elementConfig = config?.elementEditorConfiguration;
    if (elementConfig instanceof DataProductElementEditorInitialConfiguration) {
      this.deployOnOpen = elementConfig.deployOnOpen ?? false;
    }
  }

  setDeployOnOpen(value: boolean): void {
    this.deployOnOpen = value;
  }

  setDeployResponse(
    response: AdhocDataProductDeployResponse | undefined,
  ): void {
    this.deployResponse = response;
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
          purePropertyMapping?.lambdaState.setLambdaString(
            purePropertyMapping.lambdaState.extractLambdaString(grammarText),
          );
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

  setAccessPointModal(val: boolean): void {
    this.accessPointModal = val;
  }

  setEditingGroupState(val: AccessPointGroupState | undefined): void {
    this.editingGroupState = val;
  }

  setAccessPointGroupModal(val: boolean): void {
    this.accessPointGroupModal = val;
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
    return new AccessPointGroupState(group, this);
  }

  deleteAccessPointGroup(val: AccessPointGroupState): void {
    const state = this.accessPointGroupStates.find((a) => a === val);
    deleteEntry(this.accessPointGroupStates, state);
    dataProduct_deleteAccessPointGroup(this.product, val.value);
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
