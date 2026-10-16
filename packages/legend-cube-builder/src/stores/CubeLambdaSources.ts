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
  CubeLambdaReadError,
  DATA_PRODUCT_ACCESS_POINT_SOURCE_DEFINITION,
  DataProductAccessPointSource,
  INGEST_DATASET_SOURCE_DEFINITION,
  IngestDatasetSource,
  RELATIONAL_TABLE_SOURCE_DEFINITION,
  RelationalTableSource,
  Schema,
  type CubeContext,
  type CubeSourceStep,
  type IR,
} from '@finos/legend-cube';
import {
  createCubeDataProductModel,
  CUBE_DATA_PRODUCT_RUNTIME_PATH,
  CUBE_DEFAULT_CONSUMER_WAREHOUSE,
  getCubeDataProductProject,
  type CubeDataProductEnvironmentType,
} from '../graph-manager/CubeDataProduct.js';
import type { CubeDataProductCandidate } from '../graph-manager/CubeDataProductCatalog.js';
import {
  createCubeIngestModel,
  CUBE_INGEST_RUNTIME_PATH,
  getCubeIngestSettings,
} from '../graph-manager/CubeIngest.js';
import type { CubeIngestDataSet } from '../graph-manager/CubeIngestCatalog.js';
import { isCubeProjectHost } from './CubeHost.js';
import type { CubeEditorState } from './CubeEditorState.js';

// Import Pure's sources (PLAN §11.18): each accessor of a lambda bound to the
// source step the source dialog would add for it, typed as the dialog types
// one, before the steps are read. A host with a project (Studio) binds within
// it; another binds within the cube's own model or source, and asks for a
// source first when the lambda alone doesn't say where its sources are.

export const CUBE_LAMBDA_SOURCES_MESSAGE = {
  NONE: 'The query reads no source Cube knows: #>{…}#, #P{…}# or #I{…}#.',
  MIXED:
    'A cube reads one kind of source, and this query reads several: tables, data products or ingest data sets.',
  NOT_YET: 'Cube reads tables, data products and ingest data sets so far.',
  NO_INGEST: 'This page has no ingest data sets to read.',
  NO_DATA_PRODUCTS: 'This page has no data products to read.',
  INGEST_SETTINGS:
    'Add an ingest data set first, so Cube knows which deployment the query reads, then import it.',
  NO_DEFINITION: (definition: string): string =>
    `Cube finds no ingest definition ${definition}.`,
  NO_DATA_SET: (dataSet: string, definition: string): string =>
    `Ingest definition ${definition} has no data set "${dataSet}".`,
  DATA_SET_UNREADABLE: (
    dataSet: string,
    definition: string,
    reason: string,
  ): string => `Cube can't read ${definition}.${dataSet}: ${reason}`,
  NO_DATA_PRODUCT: (dataProduct: string): string =>
    `Cube finds no data product ${dataProduct}.`,
  DATA_PRODUCTS: (dataProduct: string): string =>
    `Several data products are ${dataProduct}: add an access point of the one the query reads first, then import it.`,
  NO_ACCESS_POINT: (accessPoint: string, dataProduct: string): string =>
    `Data product ${dataProduct} has no access point "${accessPoint}".`,
  ACCESS_POINT_UNREADABLE: (
    accessPoint: string,
    dataProduct: string,
    reason: string,
  ): string => `Cube can't read ${dataProduct}.${accessPoint}: ${reason}`,
  TABLE_MODEL:
    'Add a table first, so Cube knows the model the query reads, then import it.',
};

/** What the lambda's sources bind to: the cube's model and runtime, and the step of each */
export interface CubeLambdaBinding {
  readonly context: CubeContext;
  readonly bindSource: (source: IR) => CubeSourceStep;
}

const keyOf = (source: IR): string =>
  source.k === 'ingestAccessor' ||
  source.k === 'dataProductAccessor' ||
  source.k === 'storeAccessor'
    ? `${source.k}:${source.path.join('\u0000')}`
    : `${source.k}`;

const bindingOf = (
  context: CubeContext,
  steps: ReadonlyMap<string, CubeSourceStep>,
): CubeLambdaBinding => ({
  context,
  bindSource: (source) => {
    const step = steps.get(keyOf(source));
    if (!step) {
      throw new CubeLambdaReadError(CUBE_LAMBDA_SOURCES_MESSAGE.NOT_YET);
    }
    return step;
  },
});

/** The warehouse a new cube runs on: the project runtime's, the viewer's last, the default */
const newCubeWarehouse = async (
  editorState: CubeEditorState,
  ownWarehouse: string | undefined,
): Promise<string> => {
  if (ownWarehouse !== undefined) {
    return ownWarehouse;
  }
  const runtime = editorState.host.project
    ? await editorState.host.project.resolveRuntime()
    : undefined;
  return (
    runtime?.warehouse ??
    editorState.dataProductRuntime.rememberedWarehouse ??
    CUBE_DEFAULT_CONSUMER_WAREHOUSE
  );
};

const bindIngestDataSets = async (
  editorState: CubeEditorState,
  sources: readonly Extract<IR, { readonly k: 'ingestAccessor' }>[],
): Promise<CubeLambdaBinding> => {
  const catalog = editorState.host.ingestCatalog;
  if (!catalog) {
    throw new CubeLambdaReadError(CUBE_LAMBDA_SOURCES_MESSAGE.NO_INGEST);
  }
  const { context } = editorState.document;
  const current = context ? getCubeIngestSettings(context.model) : undefined;
  // a host with one class, or reading one project (Studio), whose one
  // producer is the project, reads it as the catalog's default class
  const environmentType =
    current?.environmentType ??
    (catalog.environmentTypes.length === 1 ||
    isCubeProjectHost(editorState.host)
      ? catalog.environmentTypes[0]
      : undefined);
  if (environmentType === undefined) {
    throw new CubeLambdaReadError(CUBE_LAMBDA_SOURCES_MESSAGE.INGEST_SETTINGS);
  }
  // the cube's ingest environment, else the viewer's own of the class
  const environment = {
    environmentType,
    name: current?.environment,
  };
  let producerDeploymentId = current?.producerDeploymentId;
  if (producerDeploymentId === undefined) {
    const producers = await catalog.listProducers(environment);
    producerDeploymentId =
      producers.length === 1 ? producers[0]?.deploymentId : undefined;
  }
  if (producerDeploymentId === undefined) {
    throw new CubeLambdaReadError(CUBE_LAMBDA_SOURCES_MESSAGE.INGEST_SETTINGS);
  }
  const { candidates } = await catalog.listDefinitions(
    environment,
    producerDeploymentId,
  );
  const steps = new Map<string, CubeSourceStep>();
  const described = new Map<string, readonly CubeIngestDataSet[]>();
  for (const source of sources) {
    const [definition, dataSetName] = source.path;
    const candidate = candidates.find((each) => each.definition === definition);
    if (!candidate) {
      throw new CubeLambdaReadError(
        CUBE_LAMBDA_SOURCES_MESSAGE.NO_DEFINITION(definition),
      );
    }
    const dataSets =
      described.get(candidate.urn) ??
      (await catalog.describe(candidate.urn, environment));
    described.set(candidate.urn, dataSets);
    const dataSet = dataSets.find((each) => each.name === dataSetName);
    if (!dataSet) {
      throw new CubeLambdaReadError(
        CUBE_LAMBDA_SOURCES_MESSAGE.NO_DATA_SET(dataSetName, definition),
      );
    }
    const { schema } = dataSet;
    if (!dataSet.isPickable || !schema) {
      throw new CubeLambdaReadError(
        CUBE_LAMBDA_SOURCES_MESSAGE.DATA_SET_UNREADABLE(
          dataSetName,
          definition,
          dataSet.disabledReason ?? '',
        ),
      );
    }
    steps.set(keyOf(source), {
      type: IngestDatasetSource.TYPE,
      create: (id) =>
        INGEST_DATASET_SOURCE_DEFINITION.resolve(
          INGEST_DATASET_SOURCE_DEFINITION.fromCoordinates(id, {
            ingestDefinitionUrn: candidate.urn,
            ingestDefinition: definition,
            dataSet: dataSetName,
          }),
          { kind: 'resolved', schema },
        ),
    });
  }
  const warehouse =
    current?.warehouse ??
    (await catalog.resolveEnvironment(environment)).warehouse;
  return bindingOf(
    {
      model: createCubeIngestModel({
        environmentType,
        environment: current?.environment,
        producerDeploymentId,
        warehouse: await newCubeWarehouse(editorState, warehouse),
      }),
      runtime: CUBE_INGEST_RUNTIME_PATH,
    },
    steps,
  );
};

const bindDataProducts = async (
  editorState: CubeEditorState,
  sources: readonly Extract<IR, { readonly k: 'dataProductAccessor' }>[],
): Promise<CubeLambdaBinding> => {
  const catalog = editorState.host.dataProductCatalog;
  if (!catalog) {
    throw new CubeLambdaReadError(CUBE_LAMBDA_SOURCES_MESSAGE.NO_DATA_PRODUCTS);
  }
  const { context } = editorState.document;
  const current = context
    ? getCubeDataProductProject(context.model)
    : undefined;
  const environmentType = (current?.environmentType ??
    catalog.environmentTypes[0]) as CubeDataProductEnvironmentType;
  const products = new Map<string, CubeDataProductCandidate>();
  const steps = new Map<string, CubeSourceStep>();
  for (const source of sources) {
    const [dataProduct, accessPointId] = source.path;
    let candidate = products.get(dataProduct);
    if (!candidate) {
      // a catalog searches titles and ids, not paths: by the product's name,
      // then the whole list, each matched on its path
      let found: CubeDataProductCandidate[] = [];
      for (const text of [dataProduct.split('::').at(-1) ?? dataProduct, '']) {
        found = (await catalog.search({ text, environmentType })).filter(
          (each) =>
            each.dataProductPath === dataProduct &&
            (!current ||
              (each.groupId === current.groupId &&
                each.artifactId === current.artifactId &&
                each.versionId === current.versionId)),
        );
        if (found.length) {
          break;
        }
      }
      if (found.length > 1) {
        throw new CubeLambdaReadError(
          CUBE_LAMBDA_SOURCES_MESSAGE.DATA_PRODUCTS(dataProduct),
        );
      }
      candidate = found[0];
      if (!candidate) {
        throw new CubeLambdaReadError(
          CUBE_LAMBDA_SOURCES_MESSAGE.NO_DATA_PRODUCT(dataProduct),
        );
      }
      products.set(dataProduct, candidate);
    }
    const product = candidate;
    const { groups } = await catalog.describe(product);
    const group = groups.find((each) =>
      each.accessPoints.some((point) => point.id === accessPointId),
    );
    const accessPoint = group?.accessPoints.find(
      (point) => point.id === accessPointId,
    );
    if (!group || !accessPoint) {
      throw new CubeLambdaReadError(
        CUBE_LAMBDA_SOURCES_MESSAGE.NO_ACCESS_POINT(accessPointId, dataProduct),
      );
    }
    const { schema } = accessPoint;
    if (accessPoint.disabledReason !== undefined || !schema) {
      throw new CubeLambdaReadError(
        CUBE_LAMBDA_SOURCES_MESSAGE.ACCESS_POINT_UNREADABLE(
          accessPointId,
          dataProduct,
          accessPoint.disabledReason ?? '',
        ),
      );
    }
    steps.set(keyOf(source), {
      type: DataProductAccessPointSource.TYPE,
      create: (id) =>
        DATA_PRODUCT_ACCESS_POINT_SOURCE_DEFINITION.resolve(
          DATA_PRODUCT_ACCESS_POINT_SOURCE_DEFINITION.fromCoordinates(id, {
            dataProduct,
            accessPointGroup: group.id,
            accessPoint: accessPointId,
            dataProductId: product.id,
            deploymentId: product.deploymentId,
          }),
          { kind: 'resolved', schema },
        ),
    });
  }
  const [first] = [...products.values()];
  if (!first) {
    throw new CubeLambdaReadError(CUBE_LAMBDA_SOURCES_MESSAGE.NONE);
  }
  return bindingOf(
    {
      model: createCubeDataProductModel({
        groupId: first.groupId,
        artifactId: first.artifactId,
        versionId: first.versionId,
        environmentType: first.environmentType,
        warehouse: await newCubeWarehouse(editorState, current?.warehouse),
      }),
      runtime: CUBE_DATA_PRODUCT_RUNTIME_PATH,
    },
    steps,
  );
};

/** Tables of the cube's own model, typed by the engine in one call */
const bindTables = async (
  editorState: CubeEditorState,
  sources: readonly Extract<IR, { readonly k: 'storeAccessor' }>[],
): Promise<CubeLambdaBinding> => {
  const { context } = editorState.document;
  if (!context) {
    throw new CubeLambdaReadError(CUBE_LAMBDA_SOURCES_MESSAGE.TABLE_MODEL);
  }
  const typed = await editorState.host.engine.resolveSchemas(
    context.model,
    new Map(sources.map((source) => [keyOf(source), source.path])),
  );
  const steps = new Map<string, CubeSourceStep>();
  sources.forEach((source) => {
    const [database, schema, table] = source.path;
    const columns = typed.get(keyOf(source));
    steps.set(keyOf(source), {
      type: RelationalTableSource.TYPE,
      create: (id) => {
        const node = RELATIONAL_TABLE_SOURCE_DEFINITION.fromCoordinates(id, {
          database,
          schema,
          table,
        });
        // a table the engine can't type is read anyway, and shows its error
        return columns instanceof Schema
          ? RELATIONAL_TABLE_SOURCE_DEFINITION.resolve(node, {
              kind: 'resolved',
              schema: columns,
            })
          : node;
      },
    });
  });
  return bindingOf(context, steps);
};

/**
 * The cube's model and runtime and the step of each source, for a lambda's
 * sources, all of one kind (PLAN §11.18). Throws a `CubeLambdaReadError` that
 * names a source Cube can't bind, or what to add first.
 */
export const bindCubeLambdaSources = async (
  editorState: CubeEditorState,
  sources: readonly IR[],
): Promise<CubeLambdaBinding> => {
  const kinds = new Set(sources.map((source) => source.k));
  if (!kinds.size) {
    throw new CubeLambdaReadError(CUBE_LAMBDA_SOURCES_MESSAGE.NONE);
  }
  if (kinds.size > 1) {
    throw new CubeLambdaReadError(CUBE_LAMBDA_SOURCES_MESSAGE.MIXED);
  }
  if (sources.every((source) => source.k === 'ingestAccessor')) {
    return bindIngestDataSets(editorState, sources);
  }
  if (sources.every((source) => source.k === 'dataProductAccessor')) {
    return bindDataProducts(editorState, sources);
  }
  if (sources.every((source) => source.k === 'storeAccessor')) {
    return bindTables(editorState, sources);
  }
  throw new CubeLambdaReadError(CUBE_LAMBDA_SOURCES_MESSAGE.NOT_YET);
};
