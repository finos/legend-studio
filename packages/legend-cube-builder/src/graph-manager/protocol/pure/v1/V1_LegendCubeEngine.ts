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
  EmitRole,
  type IR,
  lambda,
  type ModelContext,
  type Schema,
  storeAccessor,
} from '@finos/legend-cube';
import { V1_EngineServerClient, V1_RenderStyle } from '@finos/legend-graph';
import {
  type PlainObject,
  stringifyLosslessJSON,
  type TracerService,
} from '@finos/legend-shared';
import type {
  CubeDirectConnection,
  CubeDirectDatabaseType,
} from '../../../CubeConnectionExplorer.js';
import {
  checkCubeDataProductModel,
  CUBE_DATA_PRODUCT_RUNTIME_PATH,
  type CubeDataProductProject,
  getCubeDataProductProject,
  getEffectiveCubeWarehouse,
  isCubeDataProductModel,
} from '../../../CubeDataProduct.js';
import {
  checkCubeIngestModel,
  CUBE_INGEST_RUNTIME_PATH,
  type CubeIngestSettings,
  getCubeIngestSettings,
  isCubeIngestModel,
} from '../../../CubeIngest.js';
import type { CubeLakehouseEnvironment } from '../../../CubeLakehouseEnvironment.js';
import {
  checkCubeProjectModel,
  isCubeProjectModel,
} from '../../../CubeProject.js';
import {
  CUBE_DIRECT_DATABASE_PATH,
  CUBE_DIRECT_MODEL_TYPE,
  CUBE_DIRECT_RUNTIME_PATH,
  getCubeDirectConnection,
} from '../../../CubeDirectConnection.js';
import {
  type AccessorPath,
  type CubeEngine,
  CubeEngineError,
  CubeEngineErrorKind,
  type CubeModelOutline,
  type CubeResult,
  type NodeId,
} from '../../../CubeEngine.js';
import {
  V1_canonicalCubeDirectConnection,
  V1_checkCubeDirectConnection,
} from './V1_CubeDirectConnection.js';
import {
  V1_buildCubeDataProductExecutionContext,
  V1_buildCubeDataProductTypingContext,
  V1_hasCubeDataProductAccessor,
} from './V1_CubeDataProductModel.js';
import {
  V1_buildCubeIngestExecutionContext,
  V1_buildCubeIngestTypingContext,
  V1_checkCubeIngestAccessors,
  V1_collectCubeIngestAccessors,
  type V1_CubeIngestDefinitionSource,
  V1_getCubeIngestUrns,
  V1_hasCubeIngestAccessor,
} from './V1_CubeIngestModel.js';
import {
  V1_buildCubeDirectModelContext,
  V1_collectCubeStoreAccessors,
  V1_CUBE_DIRECT_DATABASE,
  type V1_CubeDirectTable,
} from './V1_CubeDirectModel.js';
import {
  V1_buildCubeEngineError,
  V1_toCubeEngineError,
} from './V1_CubeEngineErrors.js';
import {
  V1_CubeUnreadableResultError,
  V1_readCubeExecutionResult,
} from './V1_CubeExecutionResultReader.js';
import { V1_serializeCubeLambda } from './V1_CubeLambdaSerializer.js';
import { V1_buildCubeModelOutline } from './V1_CubeModelOutlineBuilder.js';
import { V1_buildCubeSchema } from './V1_CubeRelationTypeAdapter.js';
import {
  V1_buildCubeSchemaExplorationInput,
  V1_buildExploredDatabase,
  type V1_CubeExploredTablePath,
  V1_toCubeExplorationError,
  V1_unquoteCubeName,
} from './V1_CubeSchemaExploration.js';

/** The engine client's configuration, as the host gives it (legend-graph doesn't export its type) */
export type V1_CubeEngineConfig = ConstructorParameters<
  typeof V1_EngineServerClient
>[0];

/** Pure text (PLAN §6.2.2); the other kind run is a direct connection (§6.8) */
const TEXT_MODEL_TYPE = 'text';

const EXECUTION_CLIENT_VERSION = 'vX_X_X';

/**
 * The node an execution lambda runs: the one its outermost call is stamped
 * with, `from` in `{| <relation>->limit(…)->from(runtime)}` and `limit` in
 * the let form, `{| {| <lets>; <relation>}->from(runtime)->limit(…)}` (PLAN
 * §8.6), where errors without a stamp go
 */
const captureNodeOf = (executionLambda: IR): NodeId | undefined => {
  const from =
    executionLambda.k === 'lambda' ? executionLambda.body[0] : undefined;
  return from?.k === 'func' ? from.origin?.nodeId : undefined;
};

/** Why a lambda can't run on the cube's model: data products and database tables are kept apart (PLAN §6.8) */
const DATA_PRODUCT_ONLY = 'Only a data product cube can read data products';
const TABLES_IN_DATA_PRODUCT_CUBE =
  "A data product cube can't read database tables";
const NO_LAKEHOUSE =
  "This page can't run data products: its host has no lakehouse";
/** Why a lambda can't run on the cube's model: ingest data sets are kept apart too (PLAN §6.7) */
const INGEST_ONLY = 'Only an ingest cube can read ingest data sets';
const OTHER_SOURCES_IN_INGEST_CUBE =
  'An ingest cube reads ingest data sets only';
const NO_INGEST =
  "This page can't read ingest data sets: its host has no ingest servers";

/** The kinds of model a cube's sources must match */
enum CubeSourceFamily {
  DATA_PRODUCT = 'dataProduct',
  INGEST = 'ingest',
  TABLES = 'tables',
}

const familyOf = (model: ModelContext): CubeSourceFamily =>
  isCubeDataProductModel(model)
    ? CubeSourceFamily.DATA_PRODUCT
    : isCubeIngestModel(model)
      ? CubeSourceFamily.INGEST
      : CubeSourceFamily.TABLES;

/** Why a lambda reads a source its cube's kind can't, if it does */
const foreignSourceProblemOf = (
  family: CubeSourceFamily,
  ir: IR,
): string | undefined => {
  const readsTables = V1_collectCubeStoreAccessors(ir).length > 0;
  const readsDataProducts = V1_hasCubeDataProductAccessor(ir);
  const readsIngest = V1_hasCubeIngestAccessor(ir);
  switch (family) {
    case CubeSourceFamily.DATA_PRODUCT:
      return readsTables
        ? TABLES_IN_DATA_PRODUCT_CUBE
        : readsIngest
          ? INGEST_ONLY
          : undefined;
    case CubeSourceFamily.INGEST:
      return readsTables || readsDataProducts
        ? OTHER_SOURCES_IN_INGEST_CUBE
        : undefined;
    default:
      return readsDataProducts
        ? DATA_PRODUCT_ONLY
        : readsIngest
          ? INGEST_ONLY
          : undefined;
  }
};

/** An error of the host's ingest servers, placed on a node */
const toIngestError = (
  error: unknown,
  kind: CubeEngineErrorKind,
  nodeId: NodeId | undefined,
): CubeEngineError =>
  error instanceof CubeEngineError
    ? new CubeEngineError(error.kind, error.detail, nodeId)
    : new CubeEngineError(
        kind,
        error instanceof Error ? error.message : String(error),
        nodeId,
      );

/** The message for a model of a kind this version can't run (PLAN §8.7) */
export const V1_unsupportedModelMessage = (type: string): string =>
  `This cube's model kind "${type}" isn't supported yet.`;

/** A table of a direct-connection cube, as the database stores its names */
const directTableOf = (path: AccessorPath): V1_CubeExploredTablePath => [
  V1_unquoteCubeName(path[1]),
  V1_unquoteCubeName(path[2]),
];

const tableKey = (path: V1_CubeExploredTablePath): string =>
  JSON.stringify(path);

/** The error of a table a direct-connection cube's database doesn't have */
const missingTableError = (
  path: V1_CubeExploredTablePath,
  kind: CubeEngineErrorKind,
  nodeId: NodeId | undefined,
): CubeEngineError =>
  new CubeEngineError(
    kind,
    `The database has no table ${path[1]} in schema ${path[0]}`,
    nodeId,
  );

/** The error of a table that isn't in a direct-connection cube's one Database */
const foreignTableError = (
  path: AccessorPath,
  kind: CubeEngineErrorKind,
  nodeId: NodeId | undefined,
): CubeEngineError =>
  new CubeEngineError(
    kind,
    `The table is in "${path[0]}", not in the cube's database connection`,
    nodeId,
  );

/** A lambda's problem with a direct-connection cube's tables, if any */
const tableProblemOf = (
  accessors: readonly AccessorPath[],
  missing: ReadonlySet<string>,
  kind: CubeEngineErrorKind,
  nodeId: NodeId | undefined,
): CubeEngineError | undefined => {
  const foreign = accessors.find(
    (path) => path[0] !== CUBE_DIRECT_DATABASE_PATH,
  );
  if (foreign) {
    return foreignTableError(foreign, kind, nodeId);
  }
  const absent = accessors
    .map(directTableOf)
    .find((path) => missing.has(tableKey(path)));
  return absent ? missingTableError(absent, kind, nodeId) : undefined;
};

/**
 * The Legend engine behind the Cube engine port (PLAN §8.7). It sends the
 * cube's saved model context as it is, lambdas as protocol JSON with lossless
 * numbers, and reads every response itself: the graph manager's wrappers drop
 * type parameters and read numbers lossily (D8).
 */
export class V1_LegendCubeEngine implements CubeEngine {
  readonly client: V1_EngineServerClient;
  /**
   * The tables this session has read from direct connections, by connection
   * and table: picking or re-checking a table reads it again, and typing and
   * running reuse what was read
   */
  private readonly directTables = new Map<string, V1_CubeDirectTable>();

  /** The viewer's lakehouse environment, which data product runs need */
  private readonly lakehouseEnvironment: CubeLakehouseEnvironment | undefined;
  /** The warehouse the viewer last picked, for a data product cube without its own */
  private readonly getRememberedWarehouse: () => string | undefined;
  /** The deployed ingest definitions, which ingest cubes read */
  private readonly ingestDefinitions: V1_CubeIngestDefinitionSource | undefined;

  constructor(
    config: V1_CubeEngineConfig,
    tracerService: TracerService,
    options?: {
      lakehouseEnvironment?: CubeLakehouseEnvironment | undefined;
      getRememberedWarehouse?: (() => string | undefined) | undefined;
      ingestDefinitions?: V1_CubeIngestDefinitionSource | undefined;
    },
  ) {
    this.client = new V1_EngineServerClient(config);
    // every call throws without one
    this.client.setTracerService(tracerService);
    this.lakehouseEnvironment = options?.lakehouseEnvironment;
    this.getRememberedWarehouse =
      options?.getRememberedWarehouse ?? (() => undefined);
    this.ingestDefinitions = options?.ingestDefinitions;
  }

  /** An ingest model's settings, or an unsupported-model error naming its problems */
  private ingestSettingsOf(
    model: ModelContext,
    nodeId?: NodeId,
  ): CubeIngestSettings {
    const settings = getCubeIngestSettings(model);
    if (!settings) {
      throw new CubeEngineError(
        CubeEngineErrorKind.UNSUPPORTED_MODEL,
        checkCubeIngestModel(model).join('\n'),
        nodeId,
      );
    }
    return settings;
  }

  /**
   * The definitions the URNs name, read from the host's ingest servers, each
   * once; a definition that can't be read gives its error instead
   */
  private async ingestDefinitionsOf(
    urns: readonly string[],
    settings: CubeIngestSettings,
  ): Promise<Map<string, PlainObject | CubeEngineError>> {
    const source = this.ingestDefinitions;
    return new Map(
      await Promise.all(
        urns.map(
          async (urn): Promise<[string, PlainObject | CubeEngineError]> => {
            if (!source) {
              return [
                urn,
                new CubeEngineError(
                  CubeEngineErrorKind.UNSUPPORTED_MODEL,
                  NO_INGEST,
                ),
              ];
            }
            try {
              return [
                urn,
                await source.getDefinitionElement(
                  urn,
                  settings.environmentType,
                ),
              ];
            } catch (error) {
              return [
                urn,
                toIngestError(error, CubeEngineErrorKind.NETWORK, undefined),
              ];
            }
          },
        ),
      ),
    );
  }

  /** A data product model's project, or an unsupported-model error naming its problems */
  private dataProductProjectOf(
    model: ModelContext,
    nodeId?: NodeId,
  ): CubeDataProductProject {
    const project = getCubeDataProductProject(model);
    if (!project) {
      throw new CubeEngineError(
        CubeEngineErrorKind.UNSUPPORTED_MODEL,
        checkCubeDataProductModel(model).join('\n'),
        nodeId,
      );
    }
    return project;
  }

  /**
   * Checks a tables cube's model can be sent to the engine: Pure text, or a
   * project pointer at a released version (PLAN §6.3); else an
   * unsupported-model error
   */
  private checkTablesModel(model: ModelContext, nodeId?: NodeId): void {
    if (isCubeProjectModel(model)) {
      const problems = checkCubeProjectModel(model);
      if (problems.length) {
        throw new CubeEngineError(
          CubeEngineErrorKind.UNSUPPORTED_MODEL,
          problems.join('\n'),
          nodeId,
        );
      }
      return;
    }
    this.textOf(model, nodeId);
  }

  /** The model's Pure text, or an unsupported-model error for any other kind */
  private textOf(model: ModelContext, nodeId?: NodeId): string {
    if (model._type !== TEXT_MODEL_TYPE || typeof model.code !== 'string') {
      throw new CubeEngineError(
        CubeEngineErrorKind.UNSUPPORTED_MODEL,
        V1_unsupportedModelMessage(model._type),
        nodeId,
      );
    }
    return model.code;
  }

  /**
   * A direct-connection model's connection, or an unsupported-model error when
   * Cube can't use it (an imported cube then shows its saved schemas)
   */
  private directConnectionOf(
    model: ModelContext,
    nodeId?: NodeId,
  ): CubeDirectConnection {
    const connection = getCubeDirectConnection(model);
    const problems = V1_checkCubeDirectConnection(connection);
    if (!connection || problems.length) {
      throw new CubeEngineError(
        CubeEngineErrorKind.UNSUPPORTED_MODEL,
        problems.join('\n'),
        nodeId,
      );
    }
    return connection;
  }

  /**
   * The model a call on a direct-connection cube runs on, holding the tables
   * it needs, and those its database doesn't have. Tables this session
   * hasn't read are read in one call; `fresh` reads them all again
   */
  private async directContextFor(
    connection: CubeDirectConnection,
    tables: readonly V1_CubeExploredTablePath[],
    fresh: boolean,
  ): Promise<{ context: PlainObject; missing: ReadonlySet<string> }> {
    const connectionKey = V1_canonicalCubeDirectConnection(connection);
    const cacheKey = (path: V1_CubeExploredTablePath): string =>
      JSON.stringify([connectionKey, ...path]);
    const needed = [
      ...new Map(tables.map((path) => [tableKey(path), path])).values(),
    ];
    const toRead = fresh
      ? needed
      : needed.filter((path) => !this.directTables.has(cacheKey(path)));
    if (toRead.length) {
      const { database, missing } = V1_buildExploredDatabase(
        await this.client.buildDatabase(
          V1_buildCubeSchemaExplorationInput(
            connection,
            connection.databaseType as CubeDirectDatabaseType,
            V1_CUBE_DIRECT_DATABASE,
            { kind: 'columns', tables: toRead },
          ),
        ),
        toRead,
      );
      (database.schemas as PlainObject[]).forEach((schema) =>
        (schema.tables as PlainObject[]).forEach((definition) => {
          const path: V1_CubeExploredTablePath = [
            V1_unquoteCubeName(schema.name as string),
            V1_unquoteCubeName(definition.name as string),
          ];
          this.directTables.set(cacheKey(path), { path, definition });
        }),
      );
      missing.forEach((path) => this.directTables.delete(cacheKey(path)));
    }
    const found: V1_CubeDirectTable[] = [];
    const missing = new Set<string>();
    needed.forEach((path) => {
      const table = this.directTables.get(cacheKey(path));
      if (table) {
        found.push(table);
      } else {
        missing.add(tableKey(path));
      }
    });
    return {
      context: V1_buildCubeDirectModelContext(connection, found),
      missing,
    };
  }

  async loadModel(model: ModelContext): Promise<CubeModelOutline> {
    if (isCubeIngestModel(model)) {
      this.ingestSettingsOf(model);
      // its data sets are listed through the ingest catalog
      return {
        databases: [],
        runtimes: [{ path: CUBE_INGEST_RUNTIME_PATH, storePaths: [] }],
      };
    }
    if (isCubeDataProductModel(model)) {
      this.dataProductProjectOf(model);
      // its access points are listed through the data product catalog
      return {
        databases: [],
        runtimes: [{ path: CUBE_DATA_PRODUCT_RUNTIME_PATH, storePaths: [] }],
      };
    }
    if (model._type === CUBE_DIRECT_MODEL_TYPE) {
      const connection = this.directConnectionOf(model);
      // its tables are listed through the connection explorer; its one
      // connection gives the database type operations are written for
      return {
        databases: [],
        runtimes: [
          {
            path: CUBE_DIRECT_RUNTIME_PATH,
            storePaths: [CUBE_DIRECT_DATABASE_PATH],
            connections: [
              {
                storePath: CUBE_DIRECT_DATABASE_PATH,
                databaseType: connection.databaseType as string,
              },
            ],
          },
        ],
      };
    }
    if (isCubeProjectModel(model)) {
      // its Databases and runtimes are listed through the project catalog
      throw new CubeEngineError(
        CubeEngineErrorKind.UNSUPPORTED_MODEL,
        `A project's outline comes from its depot, through the project catalog`,
      );
    }
    const code = this.textOf(model);
    try {
      return V1_buildCubeModelOutline(
        await this.client.grammarToJSON_model(code),
      );
    } catch (error) {
      throw V1_toCubeEngineError(error, undefined, CubeEngineErrorKind.COMPILE);
    }
  }

  resolveSchemas(
    model: ModelContext,
    accessors: ReadonlyMap<NodeId, AccessorPath>,
  ): Promise<Map<NodeId, Schema | CubeEngineError>> {
    const lambdas = new Map(
      [...accessors].map(([nodeId, path]) => [
        nodeId,
        lambda([], [storeAccessor(path, { nodeId, role: EmitRole.ACCESSOR })]),
      ]),
    );
    if (isCubeDataProductModel(model) || isCubeIngestModel(model)) {
      return Promise.resolve(
        new Map(
          [...accessors.keys()].map((nodeId) => [
            nodeId,
            new CubeEngineError(
              CubeEngineErrorKind.UNSUPPORTED_MODEL,
              isCubeIngestModel(model)
                ? OTHER_SOURCES_IN_INGEST_CUBE
                : TABLES_IN_DATA_PRODUCT_CUBE,
              nodeId,
            ),
          ]),
        ),
      );
    }
    // a table is read again from its database whenever it is resolved
    return model._type === CUBE_DIRECT_MODEL_TYPE
      ? this.typeDirect(model, lambdas, true)
      : this.typeAll(model, lambdas);
  }

  async typeLambdas(
    model: ModelContext,
    lambdas: ReadonlyMap<NodeId, IR>,
  ): Promise<Map<NodeId, Schema | CubeEngineError>> {
    const family = familyOf(model);
    // a lambda reading another kind of source is refused before any call
    const refused = new Map<NodeId, CubeEngineError>();
    const typable = new Map<NodeId, IR>();
    lambdas.forEach((ir, nodeId) => {
      const problem = foreignSourceProblemOf(family, ir);
      if (problem) {
        refused.set(
          nodeId,
          new CubeEngineError(CubeEngineErrorKind.COMPILE, problem, nodeId),
        );
      } else {
        typable.set(nodeId, ir);
      }
    });
    const typed =
      family === CubeSourceFamily.DATA_PRODUCT
        ? await this.typeDataProduct(model, typable)
        : family === CubeSourceFamily.INGEST
          ? await this.typeIngest(model, typable)
          : model._type === CUBE_DIRECT_MODEL_TYPE
            ? await this.typeDirect(model, typable, false)
            : await this.typeAll(model, typable);
    // in the order the lambdas were given
    return new Map(
      [...lambdas.keys()].map((nodeId) => [
        nodeId,
        (refused.get(nodeId) ?? typed.get(nodeId)) as Schema | CubeEngineError,
      ]),
    );
  }

  /**
   * Types lambdas on a data product cube: on its project at its saved
   * version, with no runtime. The open-source engine reads no data product,
   * so there every lambda fails as the engine says
   */
  private async typeDataProduct(
    model: ModelContext,
    lambdas: ReadonlyMap<NodeId, IR>,
  ): Promise<Map<NodeId, Schema | CubeEngineError>> {
    let project: CubeDataProductProject;
    try {
      project = this.dataProductProjectOf(model);
    } catch (error) {
      return new Map(
        [...lambdas.keys()].map((nodeId) => [
          nodeId,
          new CubeEngineError(
            (error as CubeEngineError).kind,
            (error as CubeEngineError).detail,
            nodeId,
          ),
        ]),
      );
    }
    return this.typeOn(V1_buildCubeDataProductTypingContext(project), lambdas);
  }

  /**
   * Types lambdas on an ingest cube: on the definitions they read, as the
   * ingest servers serve them, with no runtime. A lambda whose data sets
   * can't be read on the cube, or whose definition can't be fetched, fails
   * on its own node. The open-source engine reads no ingest definition
   */
  private async typeIngest(
    model: ModelContext,
    lambdas: ReadonlyMap<NodeId, IR>,
  ): Promise<Map<NodeId, Schema | CubeEngineError>> {
    const typed = new Map<NodeId, Schema | CubeEngineError>();
    if (!lambdas.size) {
      return typed;
    }
    let settings: CubeIngestSettings;
    try {
      settings = this.ingestSettingsOf(model);
    } catch (error) {
      return new Map(
        [...lambdas.keys()].map((nodeId) => [
          nodeId,
          toIngestError(error, CubeEngineErrorKind.COMPILE, nodeId),
        ]),
      );
    }
    const accessorsOf = new Map(
      [...lambdas].map(([nodeId, ir]) => [
        nodeId,
        V1_collectCubeIngestAccessors(ir),
      ]),
    );
    const checked = new Map<NodeId, IR>();
    lambdas.forEach((ir, nodeId) => {
      const problem = V1_checkCubeIngestAccessors(
        accessorsOf.get(nodeId) ?? [],
        settings,
      );
      if (problem) {
        typed.set(
          nodeId,
          new CubeEngineError(CubeEngineErrorKind.COMPILE, problem, nodeId),
        );
      } else {
        checked.set(nodeId, ir);
      }
    });
    const definitions = await this.ingestDefinitionsOf(
      V1_getCubeIngestUrns(
        [...checked.keys()].flatMap((nodeId) => accessorsOf.get(nodeId) ?? []),
      ),
      settings,
    );
    const typable = new Map<NodeId, IR>();
    checked.forEach((ir, nodeId) => {
      const failure = V1_getCubeIngestUrns(accessorsOf.get(nodeId) ?? [])
        .map((urn) => definitions.get(urn))
        .find((read) => read instanceof CubeEngineError);
      if (failure) {
        typed.set(
          nodeId,
          toIngestError(failure, CubeEngineErrorKind.COMPILE, nodeId),
        );
      } else {
        typable.set(nodeId, ir);
      }
    });
    const elements = [...definitions.values()].filter(
      (read): read is PlainObject => !(read instanceof CubeEngineError),
    );
    (
      await this.typeOn(V1_buildCubeIngestTypingContext(elements), typable)
    ).forEach((schema, nodeId) => typed.set(nodeId, schema));
    // in the order the lambdas were given
    return new Map(
      [...lambdas.keys()].map((nodeId) => [
        nodeId,
        typed.get(nodeId) as Schema | CubeEngineError,
      ]),
    );
  }

  /**
   * Types lambdas on a direct-connection cube: the tables they use are read
   * from its database in one call, then typed in one batch on the model built
   * from them
   */
  private async typeDirect(
    model: ModelContext,
    lambdas: ReadonlyMap<NodeId, IR>,
    fresh: boolean,
  ): Promise<Map<NodeId, Schema | CubeEngineError>> {
    const typed = new Map<NodeId, Schema | CubeEngineError>();
    if (!lambdas.size) {
      return typed;
    }
    const failAll = (
      toError: (nodeId: NodeId) => CubeEngineError,
    ): Map<NodeId, CubeEngineError> =>
      new Map([...lambdas.keys()].map((nodeId) => [nodeId, toError(nodeId)]));
    let connection: CubeDirectConnection;
    try {
      connection = this.directConnectionOf(model);
    } catch (error) {
      return failAll(
        (nodeId) =>
          new CubeEngineError(
            (error as CubeEngineError).kind,
            (error as CubeEngineError).detail,
            nodeId,
          ),
      );
    }
    const accessorsOf = new Map(
      [...lambdas].map(([nodeId, ir]) => [
        nodeId,
        V1_collectCubeStoreAccessors(ir),
      ]),
    );
    const tables = [...accessorsOf.values()]
      .flat()
      .filter((path) => path[0] === CUBE_DIRECT_DATABASE_PATH)
      .map(directTableOf);
    let built: { context: PlainObject; missing: ReadonlySet<string> };
    try {
      built = await this.directContextFor(connection, tables, fresh);
    } catch (error) {
      return failAll((nodeId) =>
        V1_toCubeExplorationError(error, CubeEngineErrorKind.COMPILE, nodeId),
      );
    }
    const typable = new Map<NodeId, IR>();
    lambdas.forEach((ir, nodeId) => {
      const problem = tableProblemOf(
        accessorsOf.get(nodeId) ?? [],
        built.missing,
        CubeEngineErrorKind.COMPILE,
        nodeId,
      );
      if (problem) {
        typed.set(nodeId, problem);
      } else {
        typable.set(nodeId, ir);
      }
    });
    (await this.typeOn(built.context, typable)).forEach((schema, nodeId) =>
      typed.set(nodeId, schema),
    );
    // in the order the lambdas were given
    return new Map(
      [...lambdas.keys()].map((nodeId) => [
        nodeId,
        typed.get(nodeId) as Schema | CubeEngineError,
      ]),
    );
  }

  /** Types every lambda in one batch call on a text model: one entry per key, whatever fails */
  private async typeAll(
    model: ModelContext,
    lambdas: ReadonlyMap<NodeId, IR>,
  ): Promise<Map<NodeId, Schema | CubeEngineError>> {
    if (lambdas.size) {
      try {
        this.checkTablesModel(model);
      } catch (error) {
        return new Map(
          [...lambdas.keys()].map((nodeId) => [
            nodeId,
            V1_toCubeEngineError(error, nodeId, CubeEngineErrorKind.COMPILE),
          ]),
        );
      }
    }
    return this.typeOn(model, lambdas);
  }

  /** Types every lambda in one batch call on a model context: one entry per key, whatever fails */
  private async typeOn(
    context: ModelContext | PlainObject,
    lambdas: ReadonlyMap<NodeId, IR>,
  ): Promise<Map<NodeId, Schema | CubeEngineError>> {
    const typed = new Map<NodeId, Schema | CubeEngineError>();
    if (!lambdas.size) {
      return typed;
    }
    const failAll = (error: unknown): Map<NodeId, CubeEngineError> =>
      new Map(
        [...lambdas.keys()].map((nodeId) => [
          nodeId,
          V1_toCubeEngineError(error, nodeId, CubeEngineErrorKind.COMPILE),
        ]),
      );
    let response: PlainObject;
    try {
      const body = stringifyLosslessJSON({
        model: context,
        lambdas: Object.fromEntries(
          [...lambdas].map(([nodeId, ir]) => [
            nodeId,
            V1_serializeCubeLambda(ir),
          ]),
        ),
      });
      // sent as text, so numbers keep every digit; the client sends a string body as it is
      response = (await this.client.batchLambdasRelationType(
        body as unknown as PlainObject,
      )) as unknown as PlainObject;
    } catch (error) {
      return failAll(error);
    }
    // the engine answers `result`; legend-graph's response type says `results` (LG-1)
    const results = (response.result ?? response.results ?? {}) as PlainObject;
    const errors = (response.errors ?? {}) as PlainObject;
    // own keys only: a node id like `__proto__` mustn't read Object.prototype
    lambdas.forEach((_, nodeId) => {
      const relationType = Object.hasOwn(results, nodeId)
        ? results[nodeId]
        : undefined;
      if (relationType) {
        try {
          typed.set(nodeId, V1_buildCubeSchema(relationType as PlainObject));
        } catch (error) {
          typed.set(
            nodeId,
            new CubeEngineError(
              CubeEngineErrorKind.COMPILE,
              (error as Error).message,
              nodeId,
            ),
          );
        }
        return;
      }
      typed.set(
        nodeId,
        V1_buildCubeEngineError(
          Object.hasOwn(errors, nodeId) ? errors[nodeId] : undefined,
          nodeId,
          CubeEngineErrorKind.COMPILE,
        ) ??
          new CubeEngineError(
            CubeEngineErrorKind.NETWORK,
            `The engine gave no type for this node`,
            nodeId,
          ),
      );
    });
    return typed;
  }

  async execute(
    model: ModelContext,
    executionLambda: IR,
    options?: { abortController?: AbortController | undefined },
  ): Promise<CubeResult> {
    const captureId = captureNodeOf(executionLambda);
    const startedAt = Date.now();
    const family = familyOf(model);
    const problem = foreignSourceProblemOf(family, executionLambda);
    if (problem) {
      throw new CubeEngineError(
        CubeEngineErrorKind.EXECUTION,
        problem,
        captureId,
      );
    }
    const context =
      family === CubeSourceFamily.DATA_PRODUCT
        ? await this.dataProductExecutionContext(
            model,
            executionLambda,
            captureId,
          )
        : family === CubeSourceFamily.INGEST
          ? await this.ingestExecutionContext(model, executionLambda, captureId)
          : model._type === CUBE_DIRECT_MODEL_TYPE
            ? await this.directExecutionContext(
                model,
                executionLambda,
                captureId,
                options?.abortController,
              )
            : model;
    let text: string;
    try {
      if (
        model._type !== CUBE_DIRECT_MODEL_TYPE &&
        family === CubeSourceFamily.TABLES
      ) {
        this.checkTablesModel(model);
      }
      const body = stringifyLosslessJSON({
        clientVersion: EXECUTION_CLIENT_VERSION,
        function: V1_serializeCubeLambda(executionLambda),
        model: context,
        context: { _type: 'BaseExecutionContext' },
        parameterValues: [],
      });
      // `returnAsResponse` leaves the body unread, so it can be read losslessly
      const response = (await this.client.runQuery(
        body as unknown as PlainObject,
        {
          returnAsResponse: true,
          abortController: options?.abortController,
        },
      )) as Response;
      text = await response.text();
    } catch (error) {
      throw V1_toCubeEngineError(
        error,
        captureId,
        CubeEngineErrorKind.EXECUTION,
      );
    }
    try {
      return {
        ...V1_readCubeExecutionResult(text),
        durationMs: Date.now() - startedAt,
      };
    } catch (error) {
      if (error instanceof V1_CubeUnreadableResultError) {
        throw new CubeEngineError(
          CubeEngineErrorKind.EXECUTION,
          error.message,
          captureId,
        );
      }
      throw error;
    }
  }

  /**
   * The model a run on a data product cube runs on (PLAN §6.8): its project at
   * the saved version, and a lakehouse runtime at Cube's fixed path, in the
   * viewer's environment, with the cube's warehouse, else the default
   */
  private async dataProductExecutionContext(
    model: ModelContext,
    executionLambda: IR,
    captureId: NodeId | undefined,
  ): Promise<PlainObject> {
    const project = this.dataProductProjectOf(model, captureId);
    if (V1_collectCubeStoreAccessors(executionLambda).length) {
      throw new CubeEngineError(
        CubeEngineErrorKind.EXECUTION,
        TABLES_IN_DATA_PRODUCT_CUBE,
        captureId,
      );
    }
    if (!this.lakehouseEnvironment) {
      throw new CubeEngineError(
        CubeEngineErrorKind.UNSUPPORTED_MODEL,
        NO_LAKEHOUSE,
        captureId,
      );
    }
    let environment: string;
    try {
      environment = await this.lakehouseEnvironment.resolveEnvironment(project);
    } catch (error) {
      throw error instanceof CubeEngineError
        ? new CubeEngineError(error.kind, error.detail, captureId)
        : new CubeEngineError(
            CubeEngineErrorKind.EXECUTION,
            error instanceof Error ? error.message : String(error),
            captureId,
          );
    }
    return V1_buildCubeDataProductExecutionContext(
      project,
      environment,
      getEffectiveCubeWarehouse(project, this.getRememberedWarehouse()),
    );
  }

  /**
   * The model a run on an ingest cube runs on (PLAN §6.7): the definitions it
   * reads, as the ingest servers serve them, and a lakehouse runtime at
   * Cube's fixed path, in the environment of the cube's class, with the
   * cube's warehouse, else the one the viewer last picked, else the default
   */
  private async ingestExecutionContext(
    model: ModelContext,
    executionLambda: IR,
    captureId: NodeId | undefined,
  ): Promise<PlainObject> {
    const settings = this.ingestSettingsOf(model, captureId);
    const accessors = V1_collectCubeIngestAccessors(executionLambda);
    const problem = V1_checkCubeIngestAccessors(accessors, settings);
    if (problem) {
      throw new CubeEngineError(
        CubeEngineErrorKind.EXECUTION,
        problem,
        captureId,
      );
    }
    const source = this.ingestDefinitions;
    if (!source) {
      throw new CubeEngineError(
        CubeEngineErrorKind.UNSUPPORTED_MODEL,
        NO_INGEST,
        captureId,
      );
    }
    const definitions = await this.ingestDefinitionsOf(
      V1_getCubeIngestUrns(accessors),
      settings,
    );
    const elements: PlainObject[] = [];
    definitions.forEach((read) => {
      if (read instanceof CubeEngineError) {
        throw toIngestError(read, CubeEngineErrorKind.EXECUTION, captureId);
      }
      elements.push(read);
    });
    let environment: string;
    try {
      environment = await source.getRuntimeEnvironment(
        settings.environmentType,
      );
    } catch (error) {
      throw toIngestError(error, CubeEngineErrorKind.EXECUTION, captureId);
    }
    return V1_buildCubeIngestExecutionContext(
      elements,
      environment,
      getEffectiveCubeWarehouse(settings, this.getRememberedWarehouse()),
    );
  }

  /**
   * The model a run on a direct-connection cube runs on: the tables it uses,
   * read from its database when this session hasn't read them. A run stopped
   * meanwhile goes no further
   */
  private async directExecutionContext(
    model: ModelContext,
    executionLambda: IR,
    captureId: NodeId | undefined,
    abortController: AbortController | undefined,
  ): Promise<PlainObject> {
    const connection = this.directConnectionOf(model, captureId);
    const accessors = V1_collectCubeStoreAccessors(executionLambda);
    const foreign = accessors.find(
      (path) => path[0] !== CUBE_DIRECT_DATABASE_PATH,
    );
    if (foreign) {
      throw foreignTableError(
        foreign,
        CubeEngineErrorKind.EXECUTION,
        captureId,
      );
    }
    let built: { context: PlainObject; missing: ReadonlySet<string> };
    try {
      built = await this.directContextFor(
        connection,
        accessors.map(directTableOf),
        false,
      );
    } catch (error) {
      throw V1_toCubeExplorationError(
        error,
        CubeEngineErrorKind.EXECUTION,
        captureId,
      );
    }
    const problem = tableProblemOf(
      accessors,
      built.missing,
      CubeEngineErrorKind.EXECUTION,
      captureId,
    );
    if (problem) {
      throw problem;
    }
    if (abortController?.signal.aborted) {
      throw new CubeEngineError(
        CubeEngineErrorKind.EXECUTION,
        'The run was stopped',
        captureId,
      );
    }
    return built.context;
  }

  async renderPure(lambdaIR: IR): Promise<string> {
    try {
      // sent as text, as typing and execution are: the serialized lambda holds
      // lossless numbers, which plain JSON.stringify would write as objects
      return await this.client.JSONToGrammar_lambda(
        stringifyLosslessJSON(
          V1_serializeCubeLambda(lambdaIR),
        ) as unknown as PlainObject,
        V1_RenderStyle.PRETTY,
      );
    } catch (error) {
      throw V1_toCubeEngineError(error, undefined, CubeEngineErrorKind.COMPILE);
    }
  }
}
