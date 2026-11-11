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

import type { Schema } from '@finos/legend-cube';
import {
  CORE_PURE_PATH,
  V1_AppDirLevel,
  V1_IngestEnvironmentClassification,
} from '@finos/legend-graph';
import {
  type DepotServerClient,
  resolveVersion,
} from '@finos/legend-server-depot';
import {
  getIngestDeploymentServerConfigName,
  IngestDeploymentServerConfig,
  type LakehouseIngestServerClient,
  type LakehousePlatformServerClient,
} from '@finos/legend-server-lakehouse';
import {
  HttpStatus,
  NetworkClientError,
  type PlainObject,
} from '@finos/legend-shared';
import {
  type CubeDataProductProject,
  CubeDataProductEnvironmentType,
} from '../../../CubeDataProduct.js';
import {
  CubeEngineError,
  CubeEngineErrorKind,
  type NodeId,
} from '../../../CubeEngine.js';
import { parseCubeIngestUrn } from '../../../CubeIngest.js';
import {
  type CubeIngestCatalog,
  CubeIngestDataSet,
  type CubeIngestDataSetLocation,
  CubeIngestDefinitionCandidate,
  type CubeIngestDefinitionList,
  CubeIngestEnvironment,
  type CubeIngestEnvironmentKey,
  CubeIngestProducer,
  type CubeIngestReadOptions,
} from '../../../CubeIngestCatalog.js';
import { V1_readCubeDeploymentNames } from './V1_CubeDeploymentName.js';
import { V1_readCubeIngestDataSets } from './V1_CubeIngestDefinition.js';
import type { V1_CubeIngestDefinitionSource } from './V1_CubeIngestModel.js';

// The deployed ingest definitions (PLAN §6.7), read as Data Cube's producer
// source reads them: the platform's ingest environments, the one picked, by
// default the one named by the viewer's environment in the class, its
// ingest server's producer
// deployments, a deployment's definitions, and a definition's grammar, which
// the engine parses; and, with a deployment directory, the producers' names.
// With the depot, a data product cube's project's definitions too (§11.30):
// those its data products' deployment deployed, as the project has them at
// the cube's version.
// Everything is read once per page visit; `fresh` reads a definition again

/** The section the ingest server's grammar is in, which the engine needs before it */
const LAKEHOUSE_SECTION = '###Lakehouse';

const INGEST_DEFINITION_TYPE = 'ingestDefinition';

/** What the platform calls each class */
const CLASSIFICATIONS: Readonly<
  Record<CubeDataProductEnvironmentType, string>
> = {
  [CubeDataProductEnvironmentType.PRODUCTION]:
    V1_IngestEnvironmentClassification.PROD,
  [CubeDataProductEnvironmentType.PRODUCTION_PARALLEL]:
    V1_IngestEnvironmentClassification.PROD_PARALLEL,
};

/** The class the platform's classification names, or none for one Cube doesn't read */
const environmentTypeOf = (
  classification: string,
): CubeDataProductEnvironmentType | undefined =>
  (
    Object.entries(CLASSIFICATIONS) as [
      CubeDataProductEnvironmentType,
      string,
    ][]
  ).find(([, each]) => each === classification)?.[0];

const CLASS_LABELS: Readonly<Record<CubeDataProductEnvironmentType, string>> = {
  [CubeDataProductEnvironmentType.PRODUCTION]: 'production',
  [CubeDataProductEnvironmentType.PRODUCTION_PARALLEL]: 'production parallel',
};

export const V1_CUBE_INGEST_CATALOG_MESSAGE = {
  NO_ENVIRONMENT: (
    environment: string,
    environmentType: CubeDataProductEnvironmentType,
  ): string =>
    `The lakehouse has no ${CLASS_LABELS[environmentType]} ingest environment named ${environment}`,
  NO_PRODUCER: (deploymentId: string): string =>
    `Producer deployment ${deploymentId} isn't in this ingest environment`,
  GONE: (definition: string): string =>
    `Ingest definition ${definition} is no longer deployed`,
  UNPARSABLE: (urn: string, firstLine: string): string =>
    `The engine couldn't read ingest definition ${urn}: ${firstLine}`,
  NOT_ONE_DEFINITION: (definition: string): string =>
    `The ingest server's grammar for ${definition} doesn't hold that definition`,
  NO_DATA_SET: (dataSet: string, definition: string): string =>
    `Ingest definition ${definition} has no data set ${dataSet}`,
  UNREADABLE: (definition: string): string =>
    `Cube couldn't read ingest definition ${definition}`,
  /** A data product cube's definitions (PLAN §11.30) */
  ADDED_AFTER: (versionId: string): string =>
    `Added after this data product's version ${versionId}`,
  NO_DEPLOYMENT:
    "The cube has no access point left, whose deployment says where its project's ingest definitions are: add one first",
  NOT_A_DEPLOYMENT: (deploymentId: string): string =>
    `The cube's data products name deployment "${deploymentId}", which isn't a deployment id`,
  OTHER_ENVIRONMENT: (
    deploymentId: string,
    producerEnvironment: string,
    viewerEnvironment: string,
  ): string =>
    `The cube's data products come from deployment ${deploymentId}, which deploys its ingest definitions to ${producerEnvironment}, not to your environment, ${viewerEnvironment}: a data product cube reads ingest data sets in your own environment only`,
  NOT_IN_CLASS: (
    deploymentId: string,
    environment: string,
    environmentType: CubeDataProductEnvironmentType,
  ): string =>
    `The cube's data products come from deployment ${deploymentId}, which deploys no ingest definitions to the ${CLASS_LABELS[environmentType]} ingest environment of ${environment}`,
  NOT_IN_ENVIRONMENT: (
    deploymentId: string,
    viewerEnvironment: string,
  ): string =>
    `The cube's data products come from deployment ${deploymentId}, which deploys no ingest definitions to your environment, ${viewerEnvironment}: a data product cube reads ingest data sets in your own environment only`,
  NO_DEPOT:
    'Cube reads a data product version only with a depot, which this Legend deployment lacks',
  DEPOT_UNREADABLE: (project: CubeDataProductProject): string =>
    `Cube couldn't read the ingest definitions of ${project.groupId}:${project.artifactId} at version ${project.versionId}`,
} as const;

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const isPlainObject = (value: unknown): value is PlainObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const firstLineOf = (text: string): string => text.split('\n')[0] ?? text;

/** A server's failure, as a network error unless it is already Cube's */
const toNetworkError = (error: unknown): CubeEngineError =>
  error instanceof CubeEngineError
    ? error
    : new CubeEngineError(CubeEngineErrorKind.NETWORK, messageOf(error));

/** The last segment of a producer environment's URN, when it is a deployment id */
const deploymentIdOf = (urn: string): string | undefined => {
  const id = urn.slice(urn.lastIndexOf(':') + 1);
  return /^\d+$/u.test(id) ? id : undefined;
};

const pathOf = (element: PlainObject): string =>
  `${String(element.package)}::${String(element.name)}`;

/**
 * The legend implementation of the ingest catalog; it is also the source of
 * the definitions ingest cubes type and run on, sharing what it read
 */
export class V1_LegendCubeIngestCatalog
  implements CubeIngestCatalog, V1_CubeIngestDefinitionSource
{
  readonly environmentTypes = [
    CubeDataProductEnvironmentType.PRODUCTION,
    CubeDataProductEnvironmentType.PRODUCTION_PARALLEL,
  ];

  private readonly platformServerClient: LakehousePlatformServerClient;
  private readonly ingestServerClient: LakehouseIngestServerClient;
  private readonly resolveBaseEnvironment: () => Promise<string>;
  private readonly parseGrammar: (code: string) => Promise<PlainObject>;
  private readonly getAccessToken: () => string | undefined;

  private summaries: Promise<IngestDeploymentServerConfig[]> | undefined;
  /** By ingest environment, as `keyOf` names it */
  private readonly producers = new Map<string, Promise<CubeIngestProducer[]>>();
  private readonly definitionLists = new Map<
    string,
    Promise<CubeIngestDefinitionList>
  >();
  private readonly elements = new Map<string, Promise<PlainObject>>();
  private readonly readDeploymentNames:
    | ((deploymentIds: readonly string[]) => Promise<unknown>)
    | undefined;
  /** Each deployment's name, by id, none when the directory doesn't know it */
  private readonly deploymentNames = new Map<
    string,
    Promise<string | undefined>
  >();
  private readonly depotServerClient: DepotServerClient | undefined;
  /** Each project's definitions at a version, by path, as the depot has them */
  private readonly versionDefinitions = new Map<
    string,
    Promise<ReadonlyMap<string, PlainObject>>
  >();

  /**
   * The definitions a data product cube reads alongside its access points
   * (PLAN §11.30): only with a depot, which says which ones its project has
   * at its version; without one, data products and ingest data sets stay
   * apart
   */
  readonly listProjectDefinitions?: (
    project: CubeDataProductProject,
    deploymentId: string | undefined,
  ) => Promise<CubeIngestDefinitionList>;

  constructor(
    platformServerClient: LakehousePlatformServerClient,
    ingestServerClient: LakehouseIngestServerClient,
    resolveBaseEnvironment: () => Promise<string>,
    parseGrammar: (code: string) => Promise<PlainObject>,
    getAccessToken: () => string | undefined,
    options?: {
      /** The deployment directory's answer for some deployments: without it, producers have no names */
      readonly readDeploymentNames?:
        | ((deploymentIds: readonly string[]) => Promise<unknown>)
        | undefined;
      /** The published projects, whose versions a data product cube's data sets are read at (PLAN §11.30) */
      readonly depotServerClient?: DepotServerClient | undefined;
    },
  ) {
    this.platformServerClient = platformServerClient;
    this.ingestServerClient = ingestServerClient;
    this.resolveBaseEnvironment = resolveBaseEnvironment;
    this.parseGrammar = parseGrammar;
    this.getAccessToken = getAccessToken;
    this.readDeploymentNames = options?.readDeploymentNames;
    const depotServerClient = options?.depotServerClient;
    this.depotServerClient = depotServerClient;
    if (depotServerClient) {
      this.listProjectDefinitions = (project, deploymentId) =>
        this.listVersionDefinitions(depotServerClient, project, deploymentId);
    }
  }

  /** Reads a promise once per page visit, again after a failure */
  private static once<K, T>(
    cache: Map<K, Promise<T>>,
    key: K,
    read: () => Promise<T>,
  ): Promise<T> {
    const cached = cache.get(key);
    if (cached) {
      return cached;
    }
    const reading = read().catch((error: unknown) => {
      cache.delete(key);
      throw error;
    });
    cache.set(key, reading);
    return reading;
  }

  private readSummaries(): Promise<IngestDeploymentServerConfig[]> {
    this.summaries ??= this.platformServerClient
      .getIngestEnvironmentSummaries(this.getAccessToken())
      .then((rows) =>
        rows.map((row) =>
          IngestDeploymentServerConfig.serialization.fromJson(row),
        ),
      )
      .catch((error: unknown) => {
        this.summaries = undefined;
        throw toNetworkError(error);
      });
    return this.summaries;
  }

  /** The ingest environment of the class with the name given, else the one named by the viewer's environment */
  private async summaryOf(
    key: CubeIngestEnvironmentKey,
  ): Promise<IngestDeploymentServerConfig> {
    const { environmentType } = key;
    const [summaries, environment] = await Promise.all([
      this.readSummaries(),
      key.name ?? this.resolveBaseEnvironment(),
    ]);
    const summary = summaries.find(
      (each) =>
        each.environmentName === environment &&
        (each.environmentClassification as string) ===
          CLASSIFICATIONS[environmentType],
    );
    if (!summary) {
      throw new CubeEngineError(
        CubeEngineErrorKind.EXECUTION,
        V1_CUBE_INGEST_CATALOG_MESSAGE.NO_ENVIRONMENT(
          environment,
          environmentType,
        ),
      );
    }
    return summary;
  }

  /** The ingest environment of a class a platform's row describes */
  private static environmentOf(
    summary: IngestDeploymentServerConfig,
    environmentType: CubeDataProductEnvironmentType,
  ): CubeIngestEnvironment {
    return new CubeIngestEnvironment({
      environmentType,
      name: summary.environmentName,
      // as Data Cube's producer runs and Marketplace's name it
      runtimeEnvironment:
        getIngestDeploymentServerConfigName(summary) ?? summary.environmentName,
    });
  }

  /** What the caches know an environment by: its class and its name */
  private static keyOf(summary: IngestDeploymentServerConfig): string {
    return JSON.stringify([
      summary.environmentClassification,
      summary.environmentName,
    ]);
  }

  /** Every ingest environment of the platform in the classes Cube reads, by name, production first */
  async listEnvironments(): Promise<readonly CubeIngestEnvironment[]> {
    return (await this.readSummaries())
      .flatMap((summary) => {
        const environmentType = environmentTypeOf(
          summary.environmentClassification as string,
        );
        return environmentType
          ? [V1_LegendCubeIngestCatalog.environmentOf(summary, environmentType)]
          : [];
      })
      .sort(
        (a, b) =>
          a.name.localeCompare(b.name) ||
          this.environmentTypes.indexOf(a.environmentType) -
            this.environmentTypes.indexOf(b.environmentType),
      );
  }

  async resolveEnvironment(
    environment: CubeIngestEnvironmentKey,
  ): Promise<CubeIngestEnvironment> {
    return V1_LegendCubeIngestCatalog.environmentOf(
      await this.summaryOf(environment),
      environment.environmentType,
    );
  }

  async getRuntimeEnvironment(
    environment: CubeIngestEnvironmentKey,
  ): Promise<string> {
    return (await this.resolveEnvironment(environment)).runtimeEnvironment;
  }

  async listProducers(
    environment: CubeIngestEnvironmentKey,
  ): Promise<readonly CubeIngestProducer[]> {
    const summary = await this.summaryOf(environment);
    return V1_LegendCubeIngestCatalog.once(
      this.producers,
      V1_LegendCubeIngestCatalog.keyOf(summary),
      async () => {
        let urns: string[];
        try {
          urns = await this.ingestServerClient.getProducerEnvironments(
            summary.ingestServerUrl,
            this.getAccessToken(),
          );
        } catch (error) {
          throw toNetworkError(error);
        }
        // numeric deployments only: a viewer's own environment holds ad hoc deploys
        return urns.flatMap((urn) => {
          const deploymentId = deploymentIdOf(urn);
          return deploymentId
            ? [new CubeIngestProducer({ deploymentId, urn })]
            : [];
        });
      },
    );
  }

  /**
   * The deployments' names, asked of the directory in one call for those
   * not asked yet; a failed call is asked again next time
   */
  async getProducerNames(
    deploymentIds: readonly string[],
  ): Promise<ReadonlyMap<string, string>> {
    const read = this.readDeploymentNames;
    if (!read) {
      return new Map();
    }
    const unread = [...new Set(deploymentIds)].filter(
      (id) => !this.deploymentNames.has(id),
    );
    if (unread.length > 0) {
      const reading = read(unread)
        .then(V1_readCubeDeploymentNames)
        .catch((error: unknown) => {
          unread.forEach((id) => this.deploymentNames.delete(id));
          throw toNetworkError(error);
        });
      unread.forEach((id) =>
        this.deploymentNames.set(
          id,
          reading.then((names) => names.get(id)),
        ),
      );
    }
    const names = await Promise.all(
      deploymentIds.map(
        async (id): Promise<[string, string | undefined]> => [
          id,
          await this.deploymentNames.get(id),
        ],
      ),
    );
    return new Map(
      names.flatMap(([id, name]) => (name !== undefined ? [[id, name]] : [])),
    );
  }

  async listDefinitions(
    environment: CubeIngestEnvironmentKey,
    producerDeploymentId: string,
  ): Promise<CubeIngestDefinitionList> {
    const { environmentType } = environment;
    const summary = await this.summaryOf(environment);
    return V1_LegendCubeIngestCatalog.once(
      this.definitionLists,
      JSON.stringify([
        V1_LegendCubeIngestCatalog.keyOf(summary),
        producerDeploymentId,
      ]),
      async () => {
        const producers = await this.listProducers(environment);
        const producer = producers.find(
          (each) => each.deploymentId === producerDeploymentId,
        );
        if (!producer) {
          throw new CubeEngineError(
            CubeEngineErrorKind.EXECUTION,
            V1_CUBE_INGEST_CATALOG_MESSAGE.NO_PRODUCER(producerDeploymentId),
          );
        }
        let urns: string[];
        try {
          urns = await this.ingestServerClient.getIngestDefinitions(
            producer.urn,
            summary.ingestServerUrl,
            this.getAccessToken(),
          );
        } catch (error) {
          throw toNetworkError(error);
        }
        const candidates: CubeIngestDefinitionCandidate[] = [];
        urns.forEach((urn) => {
          const parsed = parseCubeIngestUrn(urn);
          if (parsed && parsed.environmentType === environmentType) {
            candidates.push(
              new CubeIngestDefinitionCandidate({
                urn,
                definition: parsed.definition,
                groupId: parsed.groupId,
                artifactId: parsed.artifactId,
              }),
            );
          }
        });
        return {
          candidates,
          droppedCount: urns.length - candidates.length,
        };
      },
    );
  }

  /**
   * The definitions a data product cube of the project reads alongside its
   * access points (PLAN §11.30, user, 2026-11-09): those its data products'
   * deployment deployed from SDLC, which deploys their project's, kept when
   * they are the project's, deployed to the cube's class, in the viewer's
   * own ingest environment of it; one the project lacks at the cube's
   * version is listed, but can't be opened
   */
  private async listVersionDefinitions(
    depotServerClient: DepotServerClient,
    project: CubeDataProductProject,
    deploymentId: string | undefined,
  ): Promise<CubeIngestDefinitionList> {
    if (deploymentId === undefined) {
      throw new CubeEngineError(
        CubeEngineErrorKind.EXECUTION,
        V1_CUBE_INGEST_CATALOG_MESSAGE.NO_DEPLOYMENT,
      );
    }
    if (!/^\d+$/u.test(deploymentId)) {
      throw new CubeEngineError(
        CubeEngineErrorKind.EXECUTION,
        V1_CUBE_INGEST_CATALOG_MESSAGE.NOT_A_DEPLOYMENT(deploymentId),
      );
    }
    const environment = { environmentType: project.environmentType };
    const [deployed, atVersion] = await Promise.all([
      (async (): Promise<CubeIngestDefinitionList> => {
        const producers = await this.listProducers(environment);
        if (!producers.some((each) => each.deploymentId === deploymentId)) {
          throw await this.explainMissingProducer(environment, deploymentId);
        }
        return this.listDefinitions(environment, deploymentId);
      })(),
      this.readVersionDefinitions(depotServerClient, project),
    ]);
    const candidates = deployed.candidates.filter(
      (candidate) =>
        candidate.groupId === project.groupId &&
        candidate.artifactId === project.artifactId,
    );
    return {
      candidates: candidates.map((candidate) =>
        atVersion.has(candidate.definition)
          ? candidate
          : new CubeIngestDefinitionCandidate({
              urn: candidate.urn,
              definition: candidate.definition,
              groupId: candidate.groupId,
              artifactId: candidate.artifactId,
              disabledReason: V1_CUBE_INGEST_CATALOG_MESSAGE.ADDED_AFTER(
                project.versionId,
              ),
            }),
      ),
      droppedCount:
        deployed.droppedCount + deployed.candidates.length - candidates.length,
    };
  }

  /**
   * Why a deployment isn't a producer of the viewer's own ingest
   * environment of a class: the environment it deploys to, beside the
   * viewer's; the viewer's alone when the platform can't say
   */
  private async explainMissingProducer(
    environment: CubeIngestEnvironmentKey,
    deploymentId: string,
  ): Promise<CubeEngineError> {
    const viewer = (await this.summaryOf(environment)).environmentName;
    let producer: string | undefined;
    try {
      producer = IngestDeploymentServerConfig.serialization.fromJson(
        await this.platformServerClient.findProducerServer(
          Number(deploymentId),
          V1_AppDirLevel.DEPLOYMENT,
          this.getAccessToken(),
        ),
      ).environmentName;
    } catch {
      // the message names the viewer's environment alone
    }
    return new CubeEngineError(
      CubeEngineErrorKind.EXECUTION,
      !producer
        ? V1_CUBE_INGEST_CATALOG_MESSAGE.NOT_IN_ENVIRONMENT(
            deploymentId,
            viewer,
          )
        : producer === viewer
          ? // the environment is the viewer's: its other class has the deployment
            V1_CUBE_INGEST_CATALOG_MESSAGE.NOT_IN_CLASS(
              deploymentId,
              viewer,
              environment.environmentType,
            )
          : V1_CUBE_INGEST_CATALOG_MESSAGE.OTHER_ENVIRONMENT(
              deploymentId,
              producer,
              viewer,
            ),
    );
  }

  /** What the depot's answers are known by: the project and its version */
  private static versionKeyOf(project: CubeDataProductProject): string {
    return JSON.stringify([
      project.groupId,
      project.artifactId,
      project.versionId,
    ]);
  }

  /**
   * A project's ingest definitions at a version, by path, as the depot has
   * them: once per page visit, again after a failure, or once forgotten, as
   * a `fresh` read forgets them, since a SNAPSHOT version moves
   */
  private readVersionDefinitions(
    depotServerClient: DepotServerClient,
    project: CubeDataProductProject,
  ): Promise<ReadonlyMap<string, PlainObject>> {
    return V1_LegendCubeIngestCatalog.once(
      this.versionDefinitions,
      V1_LegendCubeIngestCatalog.versionKeyOf(project),
      async () => {
        let rows: unknown;
        try {
          rows = await depotServerClient.getVersionEntities(
            project.groupId,
            project.artifactId,
            resolveVersion(project.versionId),
            CORE_PURE_PATH.INGEST_DEFINITION,
          );
        } catch (error) {
          throw new CubeEngineError(
            CubeEngineErrorKind.NETWORK,
            `${V1_CUBE_INGEST_CATALOG_MESSAGE.DEPOT_UNREADABLE(project)}\n${messageOf(error)}`,
          );
        }
        if (!Array.isArray(rows)) {
          throw new CubeEngineError(
            CubeEngineErrorKind.NETWORK,
            V1_CUBE_INGEST_CATALOG_MESSAGE.DEPOT_UNREADABLE(project),
          );
        }
        // the depot wraps each entity with its project and version; an
        // entity of another classifier is left out
        return new Map(
          rows.flatMap((row: unknown): [string, PlainObject][] => {
            const wrapped: unknown = isPlainObject(row)
              ? row.entity
              : undefined;
            const entity = isPlainObject(wrapped) ? wrapped : row;
            return isPlainObject(entity) &&
              entity.classifierPath === CORE_PURE_PATH.INGEST_DEFINITION &&
              typeof entity.path === 'string' &&
              isPlainObject(entity.content)
              ? [[entity.path, entity.content]]
              : [];
          }),
        );
      },
    );
  }

  /** A definition's data sets, read from its element: a failure if it can't be read */
  private static readDataSets(
    element: PlainObject,
    definition: string,
  ): CubeIngestDataSet[] {
    try {
      return V1_readCubeIngestDataSets(element);
    } catch {
      throw new CubeEngineError(
        CubeEngineErrorKind.COMPILE,
        V1_CUBE_INGEST_CATALOG_MESSAGE.UNREADABLE(definition),
      );
    }
  }

  /** A definition's element, from the ingest server's grammar, which the engine parses */
  private async readElement(
    urn: string,
    summary: IngestDeploymentServerConfig,
  ): Promise<PlainObject> {
    const definition = parseCubeIngestUrn(urn)?.definition ?? urn;
    let grammar: string;
    try {
      grammar = await this.ingestServerClient.getIngestDefinitionGrammar(
        urn,
        summary.ingestServerUrl,
        this.getAccessToken(),
      );
    } catch (error) {
      if (
        error instanceof NetworkClientError &&
        error.response.status === HttpStatus.NOT_FOUND
      ) {
        throw new CubeEngineError(
          CubeEngineErrorKind.NETWORK,
          V1_CUBE_INGEST_CATALOG_MESSAGE.GONE(definition),
        );
      }
      throw toNetworkError(error);
    }
    let model: PlainObject;
    try {
      model = await this.parseGrammar(`${LAKEHOUSE_SECTION}\n${grammar}`);
    } catch (error) {
      throw new CubeEngineError(
        CubeEngineErrorKind.COMPILE,
        V1_CUBE_INGEST_CATALOG_MESSAGE.UNPARSABLE(
          urn,
          firstLineOf(messageOf(error)),
        ),
      );
    }
    const found = (Array.isArray(model.elements) ? model.elements : []).filter(
      (element): element is PlainObject =>
        typeof element === 'object' &&
        element !== null &&
        (element as PlainObject)._type === INGEST_DEFINITION_TYPE &&
        pathOf(element as PlainObject) === definition,
    );
    const [element] = found;
    if (found.length !== 1 || !element) {
      throw new CubeEngineError(
        CubeEngineErrorKind.COMPILE,
        V1_CUBE_INGEST_CATALOG_MESSAGE.NOT_ONE_DEFINITION(definition),
      );
    }
    return element;
  }

  async getDefinitionElement(
    urn: string,
    environment: CubeIngestEnvironmentKey,
    options?: { readonly fresh?: boolean | undefined },
  ): Promise<PlainObject> {
    const summary = await this.summaryOf(environment);
    const key = JSON.stringify([
      V1_LegendCubeIngestCatalog.keyOf(summary),
      urn,
    ]);
    if (options?.fresh) {
      this.elements.delete(key);
    }
    return V1_LegendCubeIngestCatalog.once(this.elements, key, () =>
      this.readElement(urn, summary),
    );
  }

  async describe(
    urn: string,
    environment: CubeIngestEnvironmentKey,
    options?: CubeIngestReadOptions,
  ): Promise<readonly CubeIngestDataSet[]> {
    this.forgetVersion(options);
    return this.describeDataSets(urn, environment, options);
  }

  /** A `fresh` read of a data product cube's data sets reads its version again too */
  private forgetVersion(options: CubeIngestReadOptions | undefined): void {
    if (options?.fresh && options.project) {
      this.versionDefinitions.delete(
        V1_LegendCubeIngestCatalog.versionKeyOf(options.project),
      );
    }
  }

  /** A definition's data sets; a data product cube's at its version, which `forgetVersion` reads again */
  private async describeDataSets(
    urn: string,
    environment: CubeIngestEnvironmentKey,
    options: CubeIngestReadOptions | undefined,
  ): Promise<readonly CubeIngestDataSet[]> {
    const project = options?.project;
    const [element, atVersion] = await Promise.all([
      this.getDefinitionElement(urn, environment, options),
      project
        ? this.readVersionDefinitions(this.requireDepot(), project)
        : undefined,
    ]);
    const definition = pathOf(element);
    const deployed = V1_LegendCubeIngestCatalog.readDataSets(
      element,
      definition,
    );
    if (!project || !atVersion) {
      return deployed;
    }
    // a data product cube's: its deployed data sets, typed as the project
    // has them at its version, which its runs compile against (PLAN §11.30)
    const content = atVersion.get(definition);
    const versioned = content
      ? V1_LegendCubeIngestCatalog.readDataSets(content, definition)
      : [];
    return deployed.map(
      (dataSet) =>
        versioned.find((each) => each.name === dataSet.name) ??
        new CubeIngestDataSet({
          name: dataSet.name,
          primaryKey: dataSet.primaryKey,
          disabledReason: V1_CUBE_INGEST_CATALOG_MESSAGE.ADDED_AFTER(
            project.versionId,
          ),
        }),
    );
  }

  private requireDepot(): DepotServerClient {
    if (!this.depotServerClient) {
      throw new CubeEngineError(
        CubeEngineErrorKind.UNSUPPORTED_MODEL,
        V1_CUBE_INGEST_CATALOG_MESSAGE.NO_DEPOT,
      );
    }
    return this.depotServerClient;
  }

  async resolveSchemas(
    environment: CubeIngestEnvironmentKey,
    sources: ReadonlyMap<NodeId, CubeIngestDataSetLocation>,
    options?: CubeIngestReadOptions,
  ): Promise<Map<NodeId, Schema | CubeEngineError>> {
    // a data product cube's version is read again once, not per definition
    this.forgetVersion(options);
    const urns = [
      ...new Set([...sources.values()].map((each) => each.ingestDefinitionUrn)),
    ];
    const described = new Map(
      await Promise.all(
        urns.map(
          async (
            urn,
          ): Promise<
            [string, readonly CubeIngestDataSet[] | CubeEngineError]
          > => {
            try {
              return [
                urn,
                await this.describeDataSets(urn, environment, options),
              ];
            } catch (error) {
              return [urn, toNetworkError(error)];
            }
          },
        ),
      ),
    );
    return new Map(
      [...sources].map(([nodeId, source]) => {
        const read = described.get(source.ingestDefinitionUrn);
        if (read instanceof CubeEngineError || read === undefined) {
          const error = read ?? toNetworkError('no answer');
          return [
            nodeId,
            new CubeEngineError(error.kind, error.detail, nodeId),
          ];
        }
        const dataSet = read.find((each) => each.name === source.dataSet);
        return [
          nodeId,
          dataSet?.schema && dataSet.isPickable
            ? dataSet.schema
            : new CubeEngineError(
                CubeEngineErrorKind.COMPILE,
                dataSet?.disabledReason ??
                  V1_CUBE_INGEST_CATALOG_MESSAGE.NO_DATA_SET(
                    source.dataSet,
                    source.ingestDefinition,
                  ),
                nodeId,
              ),
        ];
      }),
    );
  }
}
