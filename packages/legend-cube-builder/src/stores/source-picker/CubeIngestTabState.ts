/**
 * Copyright (c) 2026-present, Goldman Sachs
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
  type CubeContext,
  INGEST_DATASET_SOURCE_DEFINITION,
  IngestDatasetSource,
} from '@finos/legend-cube';
import type { GeneratorFn } from '@finos/legend-shared';
import {
  action,
  computed,
  flow,
  flowResult,
  makeObservable,
  observable,
} from 'mobx';
import {
  CUBE_DEFAULT_CONSUMER_WAREHOUSE,
  CubeDataProductEnvironmentType,
  getEffectiveCubeWarehouse,
} from '../../graph-manager/CubeDataProduct.js';
import { CubeEngineError } from '../../graph-manager/CubeEngine.js';
import {
  createCubeIngestModel,
  CUBE_INGEST_RUNTIME_PATH,
  type CubeIngestSettings,
  getCubeIngestSettings,
  isCubeIngestModel,
} from '../../graph-manager/CubeIngest.js';
import type {
  CubeIngestCatalog,
  CubeIngestDataSet,
  CubeIngestDefinitionCandidate,
  CubeIngestDefinitionList,
  CubeIngestEnvironment,
  CubeIngestProducer,
} from '../../graph-manager/CubeIngestCatalog.js';
import type { CubeEditorState } from '../CubeEditorState.js';
import {
  type CubeSourcePickerTab,
  CubeSourcePickerTabKey,
} from './CubeSourcePickerTab.js';

/** What failed in the tab: its first line, and the rest on demand */
export interface CubeIngestTabError {
  readonly message: string;
  readonly detail?: string | undefined;
}

export const CUBE_INGEST_TAB_MESSAGE = {
  CUBE_CHANGED:
    'The cube changed while the data set was being added; pick it again.',
} as const;

const toError = (error: unknown): CubeIngestTabError => {
  if (error instanceof CubeEngineError) {
    return {
      message: error.firstLine,
      detail: error.detail !== error.firstLine ? error.detail : undefined,
    };
  }
  return { message: error instanceof Error ? error.message : String(error) };
};

/**
 * The source dialog's Ingest tab (PLAN §6.7), as Data Cube's producer
 * source picks: the Mode (class), the viewer's environment for it, a
 * producer deployment, one of its SDLC-deployed definitions, then a data
 * set, typed from what the definition declares. The first Add saves the
 * class, the producer deployment and the warehouse as the cube's model;
 * then the tab offers only that deployment's definitions.
 */
export class CubeIngestTabState implements CubeSourcePickerTab {
  readonly key = CubeSourcePickerTabKey.INGEST;
  readonly label = 'Ingest';
  readonly editorState: CubeEditorState;

  environmentType = CubeDataProductEnvironmentType.PRODUCTION;
  environment: CubeIngestEnvironment | undefined;
  producers: readonly CubeIngestProducer[] | undefined;
  producerDeploymentId: string | undefined;
  definitionList: CubeIngestDefinitionList | undefined;
  definitionSearch = '';
  definition: CubeIngestDefinitionCandidate | undefined;
  dataSets: readonly CubeIngestDataSet[] | undefined;
  dataSetName: string | undefined;
  /** The warehouse of a cube without one yet: the one the viewer last picked, else the default */
  warehouse = CUBE_DEFAULT_CONSUMER_WAREHOUSE;
  isLoadingEnvironment = false;
  isListingDefinitions = false;
  isDescribing = false;
  isAdding = false;
  error: CubeIngestTabError | undefined;

  /** The class the environment and producers were read for */
  private loadedEnvironmentType: CubeDataProductEnvironmentType | undefined;
  /** Each counts its calls: a later call, or closing the dialog, drops an earlier answer */
  private environmentRequest = 0;
  private definitionsRequest = 0;
  private describeRequest = 0;
  private confirmRequest = 0;

  constructor(editorState: CubeEditorState) {
    makeObservable<CubeIngestTabState, 'loadedEnvironmentType'>(this, {
      environmentType: observable,
      environment: observable.ref,
      producers: observable.ref,
      producerDeploymentId: observable,
      definitionList: observable.ref,
      definitionSearch: observable,
      definition: observable.ref,
      dataSets: observable.ref,
      dataSetName: observable,
      warehouse: observable,
      isLoadingEnvironment: observable,
      isListingDefinitions: observable,
      isDescribing: observable,
      isAdding: observable,
      error: observable.ref,
      loadedEnvironmentType: observable,
      fixedSettings: computed,
      isAvailable: computed,
      isBusy: computed,
      shownDefinitions: computed,
      dataSet: computed,
      canConfirm: computed,
      setEnvironmentType: action,
      selectProducer: action,
      setDefinitionSearch: action,
      selectDefinition: action,
      selectDataSet: action,
      setWarehouse: action,
      retry: action,
      open: action,
      close: action,
      loadEnvironment: flow,
      listDefinitions: flow,
      describeDefinition: flow,
      confirm: flow,
    });
    this.editorState = editorState;
  }

  get catalog(): CubeIngestCatalog | undefined {
    return this.editorState.host.ingestCatalog;
  }

  /** Hosts without an ingest catalog have no ingest data sets */
  get isAvailable(): boolean {
    return this.catalog !== undefined;
  }

  /** The cube's class, producer deployment and warehouse, once its first data set is added */
  get fixedSettings(): CubeIngestSettings | undefined {
    const model = this.editorState.document.context?.model;
    return model ? getCubeIngestSettings(model) : undefined;
  }

  get isBusy(): boolean {
    return (
      this.isLoadingEnvironment ||
      this.isListingDefinitions ||
      this.isDescribing ||
      this.isAdding
    );
  }

  ownsContext(context: CubeContext): boolean {
    return isCubeIngestModel(context.model);
  }

  /** The deployment's definitions whose path or project holds the search text */
  get shownDefinitions(): readonly CubeIngestDefinitionCandidate[] {
    const search = this.definitionSearch.trim().toLowerCase();
    return (this.definitionList?.candidates ?? []).filter((candidate) =>
      [
        candidate.definition,
        `${candidate.groupId}:${candidate.artifactId}`,
      ].some((text) => text.toLowerCase().includes(search)),
    );
  }

  get dataSet(): CubeIngestDataSet | undefined {
    return this.dataSets?.find((each) => each.name === this.dataSetName);
  }

  get canConfirm(): boolean {
    return (
      this.isAvailable &&
      !this.editorState.readOnly &&
      !this.isDescribing &&
      !this.isAdding &&
      this.producerDeploymentId !== undefined &&
      this.definition !== undefined &&
      this.dataSet?.isPickable === true &&
      this.warehouse.trim() !== ''
    );
  }

  /** The class of a cube without one yet: its environment and producers are read again */
  setEnvironmentType(environmentType: CubeDataProductEnvironmentType): void {
    if (this.fixedSettings || environmentType === this.environmentType) {
      return;
    }
    this.environmentType = environmentType;
    this.resetEnvironment();
    flowResult(this.loadEnvironment()).catch(
      this.editorState.host.applicationStore.alertUnhandledError,
    );
  }

  /** The producer deployment of a cube without one yet: its definitions are listed */
  selectProducer(deploymentId: string | undefined): void {
    if (this.fixedSettings || deploymentId === this.producerDeploymentId) {
      return;
    }
    this.producerDeploymentId = deploymentId;
    this.resetDefinitions();
    if (deploymentId !== undefined) {
      flowResult(this.listDefinitions()).catch(
        this.editorState.host.applicationStore.alertUnhandledError,
      );
    }
  }

  setDefinitionSearch(search: string): void {
    this.definitionSearch = search;
  }

  /** Picks a definition and reads its data sets */
  selectDefinition(candidate: CubeIngestDefinitionCandidate | undefined): void {
    if (candidate?.urn === this.definition?.urn) {
      return;
    }
    this.resetDefinition();
    this.definition = candidate;
    if (candidate) {
      flowResult(this.describeDefinition(candidate)).catch(
        this.editorState.host.applicationStore.alertUnhandledError,
      );
    }
  }

  /** Picks a data set that can be added */
  selectDataSet(name: string): void {
    if (this.dataSets?.find((each) => each.name === name)?.isPickable) {
      this.dataSetName = name;
    }
  }

  /** The warehouse of a cube without one yet; a saved cube's is kept */
  setWarehouse(warehouse: string): void {
    if (!this.fixedSettings) {
      this.warehouse = warehouse;
    }
  }

  /** Reads again the step that failed: the environment, the definitions or the data sets */
  retry(): void {
    const { alertUnhandledError } = this.editorState.host.applicationStore;
    this.error = undefined;
    if (!this.environment || !this.producers) {
      flowResult(this.loadEnvironment()).catch(alertUnhandledError);
    } else if (
      this.producerDeploymentId !== undefined &&
      !this.definitionList
    ) {
      flowResult(this.listDefinitions()).catch(alertUnhandledError);
    } else if (this.definition && !this.dataSets) {
      flowResult(this.describeDefinition(this.definition)).catch(
        alertUnhandledError,
      );
    }
  }

  /**
   * When the dialog opens on the tab: on a cube with ingest data sets, on its
   * class, producer deployment and warehouse; otherwise on the warehouse the
   * viewer last picked, else the default. Reads what isn't read yet
   */
  open(): void {
    const settings = this.fixedSettings;
    const remembered = this.editorState.dataProductRuntime.rememberedWarehouse;
    this.error = undefined;
    if (settings) {
      if (this.environmentType !== settings.environmentType) {
        this.environmentType = settings.environmentType;
        this.resetEnvironment();
      }
      if (this.producerDeploymentId !== settings.producerDeploymentId) {
        this.producerDeploymentId = settings.producerDeploymentId;
        this.resetDefinitions();
      }
      this.warehouse = getEffectiveCubeWarehouse(settings, remembered);
    } else {
      this.warehouse = remembered ?? CUBE_DEFAULT_CONSUMER_WAREHOUSE;
    }
    if (this.loadedEnvironmentType !== this.environmentType) {
      flowResult(this.loadEnvironment()).catch(
        this.editorState.host.applicationStore.alertUnhandledError,
      );
    } else if (
      this.producerDeploymentId !== undefined &&
      this.definitionList === undefined &&
      !this.isListingDefinitions
    ) {
      flowResult(this.listDefinitions()).catch(
        this.editorState.host.applicationStore.alertUnhandledError,
      );
    }
  }

  close(): void {
    this.environmentRequest++;
    this.definitionsRequest++;
    this.describeRequest++;
    this.confirmRequest++;
    this.isLoadingEnvironment = false;
    this.isListingDefinitions = false;
    this.isAdding = false;
    // a definition whose data sets haven't arrived would show none
    if (this.definition && !this.dataSets) {
      this.resetDefinition();
    }
    this.isDescribing = false;
    // read again on reopening
    if (!this.environment || !this.producers) {
      this.loadedEnvironmentType = undefined;
    }
  }

  /** Reads the class's environment and producer deployments, then the producer's definitions */
  *loadEnvironment(): GeneratorFn<void> {
    const { catalog } = this;
    if (!catalog) {
      return;
    }
    const environmentType = this.environmentType;
    const request = ++this.environmentRequest;
    this.isLoadingEnvironment = true;
    this.loadedEnvironmentType = environmentType;
    this.error = undefined;
    try {
      const [environment, producers] = (yield Promise.all([
        catalog.resolveEnvironment(environmentType),
        catalog.listProducers(environmentType),
      ])) as [CubeIngestEnvironment, readonly CubeIngestProducer[]];
      if (request !== this.environmentRequest) {
        return;
      }
      this.environment = environment;
      this.producers = producers;
    } catch (error) {
      if (request === this.environmentRequest) {
        this.loadedEnvironmentType = undefined;
        this.error = toError(error);
      }
      return;
    } finally {
      if (request === this.environmentRequest) {
        this.isLoadingEnvironment = false;
      }
    }
    if (this.producerDeploymentId !== undefined && !this.definitionList) {
      yield flowResult(this.listDefinitions());
    }
  }

  /** Lists the producer deployment's definitions */
  *listDefinitions(): GeneratorFn<void> {
    const { catalog, producerDeploymentId } = this;
    if (!catalog || producerDeploymentId === undefined) {
      return;
    }
    const request = ++this.definitionsRequest;
    this.isListingDefinitions = true;
    this.error = undefined;
    try {
      const list = (yield catalog.listDefinitions(
        this.environmentType,
        producerDeploymentId,
      )) as CubeIngestDefinitionList;
      if (request === this.definitionsRequest) {
        this.definitionList = list;
      }
    } catch (error) {
      if (request === this.definitionsRequest) {
        this.error = toError(error);
      }
    } finally {
      if (request === this.definitionsRequest) {
        this.isListingDefinitions = false;
      }
    }
  }

  /** Reads the definition's data sets */
  *describeDefinition(
    candidate: CubeIngestDefinitionCandidate,
  ): GeneratorFn<void> {
    const { catalog } = this;
    if (!catalog) {
      return;
    }
    const request = ++this.describeRequest;
    this.isDescribing = true;
    this.error = undefined;
    try {
      const dataSets = (yield catalog.describe(
        candidate.urn,
        this.environmentType,
      )) as readonly CubeIngestDataSet[];
      if (request === this.describeRequest) {
        this.dataSets = dataSets;
        // the only data set that can be added is picked
        const pickable = dataSets.filter((each) => each.isPickable);
        this.dataSetName =
          pickable.length === 1 ? pickable[0]?.name : undefined;
      }
    } catch (error) {
      if (request === this.describeRequest) {
        this.error = toError(error);
      }
    } finally {
      if (request === this.describeRequest) {
        this.isDescribing = false;
      }
    }
  }

  /**
   * Adds the data set, already typed; the first saves the class, the
   * producer deployment and the warehouse as the cube's model, in the same
   * undo step, and remembers the warehouse for the viewer's next cubes
   */
  *confirm(): GeneratorFn<boolean> {
    if (!this.canConfirm) {
      return false;
    }
    const { editorState } = this;
    const definition = this.definition as CubeIngestDefinitionCandidate;
    const dataSet = this.dataSet as CubeIngestDataSet;
    const producerDeploymentId = this.producerDeploymentId as string;
    const warehouse = this.warehouse.trim();
    const request = ++this.confirmRequest;
    this.isAdding = true;
    this.error = undefined;
    try {
      // no engine call: yields once, so a dialog closed meanwhile adds nothing
      yield Promise.resolve();
      if (request !== this.confirmRequest) {
        return false;
      }
      const { document } = editorState;
      const id = document.query.generateId(IngestDatasetSource.TYPE);
      const node = INGEST_DATASET_SOURCE_DEFINITION.resolve(
        INGEST_DATASET_SOURCE_DEFINITION.fromCoordinates(id, {
          ingestDefinitionUrn: definition.urn,
          ingestDefinition: definition.definition,
          dataSet: dataSet.name,
        }),
        {
          kind: 'resolved',
          schema: dataSet.schema as NonNullable<CubeIngestDataSet['schema']>,
        },
      );
      const settings = this.fixedSettings;
      if (
        (document.context !== undefined &&
          (!settings ||
            settings.environmentType !== this.environmentType ||
            settings.producerDeploymentId !== producerDeploymentId)) ||
        !document.query.canAdd(node)
      ) {
        throw new Error(CUBE_INGEST_TAB_MESSAGE.CUBE_CHANGED);
      }
      const query = document.query.add(node);
      editorState.applyDocument(
        document.context
          ? document.withQuery(query)
          : document
              .withContext({
                model: createCubeIngestModel({
                  environmentType: this.environmentType,
                  producerDeploymentId,
                  warehouse,
                }),
                runtime: CUBE_INGEST_RUNTIME_PATH,
              })
              .withQuery(query),
      );
      if (!settings) {
        editorState.dataProductRuntime.remember(warehouse);
      }
      // the definition stays open, to add another of its data sets
      this.dataSetName = undefined;
      return true;
    } catch (error) {
      if (request === this.confirmRequest) {
        this.error = toError(error);
      }
      return false;
    } finally {
      if (request === this.confirmRequest) {
        this.isAdding = false;
      }
    }
  }

  private resetEnvironment(): void {
    this.environmentRequest++;
    this.isLoadingEnvironment = false;
    this.loadedEnvironmentType = undefined;
    this.environment = undefined;
    this.producers = undefined;
    if (!this.fixedSettings) {
      this.producerDeploymentId = undefined;
    }
    this.resetDefinitions();
  }

  private resetDefinitions(): void {
    this.definitionsRequest++;
    this.isListingDefinitions = false;
    this.definitionList = undefined;
    this.definitionSearch = '';
    this.resetDefinition();
  }

  private resetDefinition(): void {
    this.describeRequest++;
    this.isDescribing = false;
    this.definition = undefined;
    this.dataSets = undefined;
    this.dataSetName = undefined;
  }
}
