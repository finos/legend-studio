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
import { getProducerLabel } from '../../__lib__/LegendCubeIngestLabels.js';
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
  CubeIngestEnvironmentKey,
  CubeIngestProducer,
} from '../../graph-manager/CubeIngestCatalog.js';
import type { CubeEditorState } from '../CubeEditorState.js';
import {
  type CubeSourcePickerTab,
  CubeSourcePickerTabKey,
  generateCubeNodeIds,
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

/** What the tab knows an ingest environment by: its class and its name, none for the viewer's own */
export const getCubeIngestEnvironmentId = (
  environment: CubeIngestEnvironmentKey,
): string => JSON.stringify([environment.environmentType, environment.name]);

/** A data set picked to add: the URN of its definition, and its name */
export interface CubeIngestPick {
  readonly definitionUrn: string;
  readonly dataSet: string;
}

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
 * source picks: an ingest environment of any class, by default the viewer's
 * own production one, a producer deployment, one of its SDLC-deployed
 * definitions, or several ticked, then one or several of their data sets,
 * typed from what each definition declares. The first Add saves the
 * environment, the producer deployment and the warehouse as the cube's
 * model; then the tab offers only that deployment's definitions.
 */
export class CubeIngestTabState implements CubeSourcePickerTab {
  readonly key = CubeSourcePickerTabKey.INGEST;
  readonly label = 'Ingest';
  readonly editorState: CubeEditorState;

  environmentType = CubeDataProductEnvironmentType.PRODUCTION;
  /** Whether the viewer picked the class or an environment; until then a new cube starts on the catalog's default class, its first */
  private environmentChosen = false;
  /** The environment picked, by name; none for the viewer's own of the class */
  environmentName: string | undefined;
  /** Every environment the viewer can pick, once listed */
  environments: readonly CubeIngestEnvironment[] | undefined;
  /** The environment read, the one picked or the viewer's own */
  environment: CubeIngestEnvironment | undefined;
  producers: readonly CubeIngestProducer[] | undefined;
  /** The producers' names the host's deployment directory knows, by deployment id */
  producerNames: ReadonlyMap<string, string> = new Map();
  producerDeploymentId: string | undefined;
  definitionList: CubeIngestDefinitionList | undefined;
  definitionSearch = '';
  /** The definitions opened, in the order opened: one picked alone, or several ticked */
  definitions: readonly CubeIngestDefinitionCandidate[] = [];
  /** The data sets of each opened definition, by its URN, once read */
  dataSetsByDefinition: ReadonlyMap<string, readonly CubeIngestDataSet[]> =
    new Map();
  /** The picked data sets, in the order picked, of any opened definition; several are added at once */
  picks: readonly CubeIngestPick[] = [];
  /** The warehouse of a cube without one yet: the one the viewer last picked, else the default */
  warehouse = CUBE_DEFAULT_CONSUMER_WAREHOUSE;
  isLoadingEnvironment = false;
  isListingDefinitions = false;
  isAdding = false;
  error: CubeIngestTabError | undefined;

  /** The environment the producers were read for, as `getCubeIngestEnvironmentId` names it */
  private loadedEnvironmentId: string | undefined;
  /** The definitions whose data sets are being read, by URN, each with its request */
  private describing: ReadonlyMap<string, number> = new Map();
  /** Each counts its calls: a later call, or closing the dialog, drops an earlier answer */
  private environmentRequest = 0;
  private definitionsRequest = 0;
  private describeRequest = 0;
  private confirmRequest = 0;

  constructor(editorState: CubeEditorState) {
    makeObservable<CubeIngestTabState, 'loadedEnvironmentId' | 'describing'>(
      this,
      {
        environmentType: observable,
        environmentName: observable,
        environments: observable.ref,
        environment: observable.ref,
        environmentKey: computed,
        producers: observable.ref,
        producerNames: observable.ref,
        producerDeploymentId: observable,
        definitionList: observable.ref,
        definitionSearch: observable,
        definitions: observable.ref,
        dataSetsByDefinition: observable.ref,
        picks: observable.ref,
        definition: computed,
        dataSets: computed,
        dataSetNames: computed,
        dataSetName: computed,
        pickedDataSets: computed,
        previewedDefinition: computed,
        warehouse: observable,
        isLoadingEnvironment: observable,
        isListingDefinitions: observable,
        isDescribing: computed,
        isAdding: observable,
        error: observable.ref,
        loadedEnvironmentId: observable,
        describing: observable.ref,
        fixedSettings: computed,
        isAvailable: computed,
        isBusy: computed,
        shownDefinitions: computed,
        dataSet: computed,
        canConfirm: computed,
        setEnvironmentType: action,
        setEnvironment: action,
        selectProducer: action,
        setDefinitionSearch: action,
        selectDefinition: action,
        toggleDefinition: action,
        selectDataSet: action,
        toggleDataSet: action,
        setWarehouse: action,
        retry: action,
        open: action,
        close: action,
        loadEnvironment: flow,
        loadProducerNames: flow,
        listDefinitions: flow,
        describeDefinition: flow,
        confirm: flow,
      },
    );
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

  /** Whether data sets of an opened definition are being read */
  get isDescribing(): boolean {
    return this.describing.size > 0;
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

  /** The definition opened last */
  get definition(): CubeIngestDefinitionCandidate | undefined {
    return this.definitions.at(-1);
  }

  /** The data sets of the definition opened last, once read */
  get dataSets(): readonly CubeIngestDataSet[] | undefined {
    const { definition } = this;
    return definition
      ? this.dataSetsByDefinition.get(definition.urn)
      : undefined;
  }

  isDefinitionOpened(candidate: CubeIngestDefinitionCandidate): boolean {
    return this.definitions.some((each) => each.urn === candidate.urn);
  }

  /** The data sets of an opened definition, once read */
  getDataSets(definitionUrn: string): readonly CubeIngestDataSet[] | undefined {
    return this.dataSetsByDefinition.get(definitionUrn);
  }

  /** The names of the picked data sets, in the order picked */
  get dataSetNames(): readonly string[] {
    return this.picks.map((pick) => pick.dataSet);
  }

  /** The data set picked last, the one previewed */
  get dataSetName(): string | undefined {
    return this.picks.at(-1)?.dataSet;
  }

  /** The data set picked last, the one previewed */
  get dataSet(): CubeIngestDataSet | undefined {
    return this.findDataSet(this.picks.at(-1));
  }

  /** The definition of the data set picked last */
  get previewedDefinition(): CubeIngestDefinitionCandidate | undefined {
    const urn = this.picks.at(-1)?.definitionUrn;
    return this.definitions.find((each) => each.urn === urn);
  }

  /** The picked data sets, in the order picked */
  get pickedDataSets(): readonly (CubeIngestDataSet | undefined)[] {
    return this.picks.map((pick) => this.findDataSet(pick));
  }

  /** How many data sets Add adds */
  get pickedCount(): number {
    return this.picks.length;
  }

  /** Whether a data set of an opened definition, by default the one opened last, is picked */
  isDataSetPicked(
    name: string,
    definitionUrn: string | undefined = this.definition?.urn,
  ): boolean {
    return this.picks.some(
      (pick) => pick.definitionUrn === definitionUrn && pick.dataSet === name,
    );
  }

  private findDataSet(
    pick: CubeIngestPick | undefined,
  ): CubeIngestDataSet | undefined {
    return pick
      ? this.dataSetsByDefinition
          .get(pick.definitionUrn)
          ?.find((each) => each.name === pick.dataSet)
      : undefined;
  }

  get canConfirm(): boolean {
    return (
      this.isAvailable &&
      !this.editorState.readOnly &&
      !this.isDescribing &&
      !this.isAdding &&
      this.producerDeploymentId !== undefined &&
      this.pickedDataSets.length > 0 &&
      this.pickedDataSets.every((each) => each?.isPickable === true) &&
      this.warehouse.trim() !== ''
    );
  }

  /** A producer deployment as the tab shows it: its name and id, else its id alone */
  getProducerLabel(deploymentId: string): string {
    return getProducerLabel(deploymentId, this.producerNames.get(deploymentId));
  }

  /** The environment picked: by default the viewer's own of the class */
  get environmentKey(): CubeIngestEnvironmentKey {
    return {
      environmentType: this.environmentType,
      name: this.environmentName,
    };
  }

  /** The class of a cube without one yet, on the viewer's own environment of it: its producers are read again */
  setEnvironmentType(environmentType: CubeDataProductEnvironmentType): void {
    if (this.fixedSettings || environmentType === this.environmentType) {
      return;
    }
    this.environmentChosen = true;
    this.environmentType = environmentType;
    this.environmentName = undefined;
    this.resetEnvironment();
    flowResult(this.loadEnvironment()).catch(
      this.editorState.host.applicationStore.alertUnhandledError,
    );
  }

  /** The environment of a cube without one yet: its producers are read again */
  setEnvironment(environment: CubeIngestEnvironmentKey): void {
    if (
      this.fixedSettings ||
      (this.environment !== undefined &&
        getCubeIngestEnvironmentId(environment) ===
          getCubeIngestEnvironmentId(this.environment))
    ) {
      return;
    }
    this.environmentChosen = true;
    this.environmentType = environment.environmentType;
    this.environmentName = environment.name;
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

  /**
   * Opens a definition alone, in place of any opened, and reads its data
   * sets; one already opened among others keeps its data sets and picks
   */
  selectDefinition(candidate: CubeIngestDefinitionCandidate | undefined): void {
    if (
      this.definitions.length <= 1 &&
      candidate?.urn === this.definition?.urn
    ) {
      return;
    }
    if (candidate && this.isDefinitionOpened(candidate)) {
      this.closeDefinitions((each) => each.urn !== candidate.urn);
      return;
    }
    this.resetDefinition();
    if (candidate) {
      this.openDefinition(candidate);
    }
  }

  /**
   * Opens a definition beside those opened, to add data sets of several at
   * once, and reads its data sets; or closes it, its picks dropped
   */
  toggleDefinition(candidate: CubeIngestDefinitionCandidate): void {
    if (this.isDefinitionOpened(candidate)) {
      this.closeDefinitions((each) => each.urn === candidate.urn);
    } else {
      this.openDefinition(candidate);
    }
  }

  /** Picks a data set that can be added, alone, in place of any picked */
  selectDataSet(
    name: string,
    definitionUrn: string | undefined = this.definition?.urn,
  ): void {
    if (
      definitionUrn !== undefined &&
      this.findDataSet({ definitionUrn, dataSet: name })?.isPickable
    ) {
      this.picks = [{ definitionUrn, dataSet: name }];
    }
  }

  /** Adds a data set that can be added to the picked ones, or takes it out */
  toggleDataSet(
    name: string,
    definitionUrn: string | undefined = this.definition?.urn,
  ): void {
    if (definitionUrn === undefined) {
      return;
    }
    if (this.isDataSetPicked(name, definitionUrn)) {
      this.picks = this.picks.filter(
        (pick) => pick.definitionUrn !== definitionUrn || pick.dataSet !== name,
      );
    } else if (this.findDataSet({ definitionUrn, dataSet: name })?.isPickable) {
      this.picks = [...this.picks, { definitionUrn, dataSet: name }];
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
    } else {
      this.definitions
        .filter(
          (each) =>
            !this.dataSetsByDefinition.has(each.urn) &&
            !this.describing.has(each.urn),
        )
        .forEach((each) => {
          flowResult(this.describeDefinition(each)).catch(alertUnhandledError);
        });
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
      if (
        this.environmentType !== settings.environmentType ||
        this.environmentName !== settings.environment
      ) {
        this.environmentType = settings.environmentType;
        this.environmentName = settings.environment;
        this.resetEnvironment();
      }
      if (this.producerDeploymentId !== settings.producerDeploymentId) {
        this.producerDeploymentId = settings.producerDeploymentId;
        this.resetDefinitions();
      }
      this.warehouse = getEffectiveCubeWarehouse(settings, remembered);
    } else {
      this.warehouse = remembered ?? CUBE_DEFAULT_CONSUMER_WAREHOUSE;
      // a new cube starts on the catalog's default class, unless the viewer picked one
      const [defaultType] = this.catalog?.environmentTypes ?? [];
      if (
        !this.environmentChosen &&
        defaultType !== undefined &&
        defaultType !== this.environmentType
      ) {
        this.environmentType = defaultType;
        this.environmentName = undefined;
        this.resetEnvironment();
      }
    }
    if (
      this.loadedEnvironmentId !==
      getCubeIngestEnvironmentId(this.environmentKey)
    ) {
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
    this.describing = new Map();
    this.closeDefinitions((each) => !this.dataSetsByDefinition.has(each.urn));
    // read again on reopening
    if (!this.environment || !this.producers) {
      this.loadedEnvironmentId = undefined;
    }
  }

  /** Reads the class's environment and producer deployments, then the producer's definitions */
  *loadEnvironment(): GeneratorFn<void> {
    const { catalog } = this;
    if (!catalog) {
      return;
    }
    const key = this.environmentKey;
    const request = ++this.environmentRequest;
    this.isLoadingEnvironment = true;
    this.loadedEnvironmentId = getCubeIngestEnvironmentId(key);
    this.error = undefined;
    // every environment, listed once: without them, only the one read is offered
    if (!this.environments) {
      const environments = (yield catalog
        .listEnvironments()
        .catch(() => undefined)) as
        | readonly CubeIngestEnvironment[]
        | undefined;
      if (request !== this.environmentRequest) {
        return;
      }
      this.environments = environments;
    }
    try {
      const [environment, producers] = (yield Promise.all([
        catalog.resolveEnvironment(key),
        catalog.listProducers(key),
      ])) as [CubeIngestEnvironment, readonly CubeIngestProducer[]];
      if (request !== this.environmentRequest) {
        return;
      }
      this.environment = environment;
      if (
        !this.environments?.some(
          (each) =>
            getCubeIngestEnvironmentId(each) ===
            getCubeIngestEnvironmentId(environment),
        )
      ) {
        this.environments = [...(this.environments ?? []), environment];
      }
      this.producers = producers;
      flowResult(
        this.loadProducerNames(producers.map((each) => each.deploymentId)),
      ).catch(this.editorState.host.applicationStore.alertUnhandledError);
      // a new cube starts on the environment's own warehouse, when it has one
      if (!this.fixedSettings && environment.warehouse) {
        this.warehouse = environment.warehouse;
      }
      // the only producer deployment is the one to read
      const [onlyProducer] = producers;
      if (
        this.producerDeploymentId === undefined &&
        producers.length === 1 &&
        onlyProducer
      ) {
        this.producerDeploymentId = onlyProducer.deploymentId;
        this.resetDefinitions();
      }
    } catch (error) {
      if (request === this.environmentRequest) {
        this.loadedEnvironmentId = undefined;
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

  /**
   * Asks the host's deployment directory for the names of producers not
   * named yet; without an answer, producers show their ids alone
   */
  *loadProducerNames(deploymentIds: readonly string[]): GeneratorFn<void> {
    const { catalog } = this;
    const unnamed = deploymentIds.filter((id) => !this.producerNames.has(id));
    if (!catalog?.getProducerNames || unnamed.length === 0) {
      return;
    }
    try {
      const names = (yield catalog.getProducerNames(unnamed)) as ReadonlyMap<
        string,
        string
      >;
      this.producerNames = new Map([...this.producerNames, ...names]);
    } catch {
      // the names only label the producers, which their ids still do
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
        this.environmentKey,
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

  /** Reads an opened definition's data sets */
  *describeDefinition(
    candidate: CubeIngestDefinitionCandidate,
  ): GeneratorFn<void> {
    const { catalog } = this;
    if (!catalog) {
      return;
    }
    const request = ++this.describeRequest;
    this.describing = new Map([...this.describing, [candidate.urn, request]]);
    this.error = undefined;
    // an answer counts while the definition is open and this is its last read
    const isCurrent = (): boolean =>
      this.describing.get(candidate.urn) === request;
    try {
      const dataSets = (yield catalog.describe(
        candidate.urn,
        this.environmentKey,
      )) as readonly CubeIngestDataSet[];
      if (isCurrent()) {
        this.dataSetsByDefinition = new Map([
          ...this.dataSetsByDefinition,
          [candidate.urn, dataSets],
        ]);
        // the only data set of it that can be added is picked
        const [onlyPickable, ...otherPickable] = dataSets.filter(
          (each) => each.isPickable,
        );
        if (
          onlyPickable &&
          !otherPickable.length &&
          !this.isDataSetPicked(onlyPickable.name, candidate.urn)
        ) {
          this.picks = [
            ...this.picks,
            { definitionUrn: candidate.urn, dataSet: onlyPickable.name },
          ];
        }
      }
    } catch (error) {
      if (isCurrent()) {
        this.error = toError(error);
      }
    } finally {
      if (isCurrent()) {
        this.describing = new Map(
          [...this.describing].filter(([urn]) => urn !== candidate.urn),
        );
      }
    }
  }

  /**
   * Adds the picked data sets, already typed, in one undo step; the first
   * saves the class, the producer deployment and the warehouse as the cube's
   * model, in the same undo step, and remembers the warehouse for the
   * viewer's next cubes
   */
  *confirm(): GeneratorFn<boolean> {
    if (!this.canConfirm) {
      return false;
    }
    const { editorState } = this;
    // each picked data set with its definition, as picked
    const picked = this.picks.map((pick) => ({
      definition: this.definitions.find(
        (each) => each.urn === pick.definitionUrn,
      ) as CubeIngestDefinitionCandidate,
      dataSet: this.findDataSet(pick) as CubeIngestDataSet,
    }));
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
      const ids = generateCubeNodeIds(
        document.query,
        IngestDatasetSource.TYPE,
        picked.length,
      );
      const nodes = picked.map(({ definition, dataSet }, index) =>
        INGEST_DATASET_SOURCE_DEFINITION.resolve(
          INGEST_DATASET_SOURCE_DEFINITION.fromCoordinates(
            ids[index] as string,
            {
              ingestDefinitionUrn: definition.urn,
              ingestDefinition: definition.definition,
              dataSet: dataSet.name,
            },
          ),
          {
            kind: 'resolved',
            schema: dataSet.schema as NonNullable<CubeIngestDataSet['schema']>,
          },
        ),
      );
      const settings = this.fixedSettings;
      if (
        document.context !== undefined &&
        (!settings ||
          settings.environmentType !== this.environmentType ||
          settings.environment !== this.environmentName ||
          settings.producerDeploymentId !== producerDeploymentId)
      ) {
        throw new Error(CUBE_INGEST_TAB_MESSAGE.CUBE_CHANGED);
      }
      // each data set is added in the order picked; the first one picked is
      // the one that runs on an empty cube, as a single one would be
      let query = document.query;
      for (const node of nodes) {
        if (!query.canAdd(node)) {
          throw new Error(CUBE_INGEST_TAB_MESSAGE.CUBE_CHANGED);
        }
        query = query.add(node);
      }
      editorState.applyDocument(
        document.context
          ? document.withQuery(query)
          : document
              .withContext({
                model: createCubeIngestModel({
                  environmentType: this.environmentType,
                  // the environment picked, by name; none when left on the
                  // viewer's own, so each viewer reads theirs (user, 2026-10-16)
                  environment: this.environmentName,
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
      // the definitions stay open, to add others of their data sets
      this.picks = [];
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
    this.loadedEnvironmentId = undefined;
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
    this.describing = new Map();
    this.definitions = [];
    this.dataSetsByDefinition = new Map();
    this.picks = [];
  }

  private openDefinition(candidate: CubeIngestDefinitionCandidate): void {
    this.definitions = [...this.definitions, candidate];
    flowResult(this.describeDefinition(candidate)).catch(
      this.editorState.host.applicationStore.alertUnhandledError,
    );
  }

  /** Closes the opened definitions given, their data sets, reads and picks dropped */
  private closeDefinitions(
    closes: (candidate: CubeIngestDefinitionCandidate) => boolean,
  ): void {
    const closed = new Set(
      this.definitions.filter(closes).map((each) => each.urn),
    );
    if (!closed.size) {
      return;
    }
    this.definitions = this.definitions.filter((each) => !closed.has(each.urn));
    this.dataSetsByDefinition = new Map(
      [...this.dataSetsByDefinition].filter(([urn]) => !closed.has(urn)),
    );
    this.describing = new Map(
      [...this.describing].filter(([urn]) => !closed.has(urn)),
    );
    this.picks = this.picks.filter((pick) => !closed.has(pick.definitionUrn));
  }
}
