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
  type V1_EntitlementsDataProductLite,
  type V1_EntitlementsLakehouseEnvironmentType,
  V1_EntitlementsDataProductLiteModelSchema,
  V1_SdlcDeploymentDataProductOrigin,
} from '@finos/legend-graph';
import {
  type DepotServerClient,
  StoreProjectData,
} from '@finos/legend-server-depot';
import type { LakehouseContractServerClient } from '@finos/legend-server-lakehouse';
import { isNonNullable, type PlainObject } from '@finos/legend-shared';
import { StoredFileGeneration } from '@finos/legend-storage';
import { deserialize } from 'serializr';
import {
  type CubeDataProductProject,
  CubeDataProductEnvironmentType,
} from '../../../CubeDataProduct.js';
import {
  type CubeAccessPointLocation,
  type CubeDataProductCatalog,
  CubeDataProductCandidate,
  type CubeDataProductDescription,
} from '../../../CubeDataProductCatalog.js';
import {
  CubeEngineError,
  CubeEngineErrorKind,
  type NodeId,
} from '../../../CubeEngine.js';
import {
  V1_findCubeAccessPointSchema,
  V1_readCubeDataProductDescription,
} from './V1_CubeDataProductArtifact.js';

// The deployed data products, as Legend Query lists and reads them: the
// lakehouse's lite list per class (DataProductSelectorState), then a
// product's deployed artifact (getGenerationFilesByType) and its definition
// at the deployed version, from the depot. Cube pages the lite list itself
// (PLAN §6.8): the client's own loop never ends on a page that says more
// follow without saying where, or on a repeated cursor, and can't be stopped

/** The generation type of a data product's artifact */
const DATA_PRODUCT_GENERATION_TYPE = 'dataProduct';

/** The classes Cube lists, Production first, as Data Cube's selection offers */
const ENVIRONMENT_TYPES = [
  CubeDataProductEnvironmentType.PRODUCTION,
  CubeDataProductEnvironmentType.PRODUCTION_PARALLEL,
];

/** The lite list's page size, as the lakehouse client's own loop uses */
const LITE_PAGE_SIZE = 1000;
/** Past this many pages a list is taken to be stuck */
const LITE_PAGE_CAP = 50;

export const V1_CUBE_DATA_PRODUCT_LIST_ERROR = {
  UNREADABLE_PAGE: "The lakehouse's answer isn't a page of data products",
  NO_CURSOR:
    'The lakehouse said more data products follow, but not where the next page starts',
  REPEATED_CURSOR: 'The lakehouse sent the same page of data products twice',
  TOO_MANY_PAGES: `The lakehouse's data product list runs past ${LITE_PAGE_CAP} pages`,
} as const;

const toMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const isPlainObject = (value: unknown): value is PlainObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Stops a list between pages once its search is dropped */
const throwIfAborted = (signal: AbortSignal | undefined): void => {
  if (signal?.aborted) {
    throw signal.reason instanceof Error
      ? signal.reason
      : new Error('The data product list was stopped');
  }
};

/** A lite row as Cube lists it; none for an ad hoc or incomplete one */
const toCandidate = (
  row: V1_EntitlementsDataProductLite,
  environmentType: CubeDataProductEnvironmentType,
): CubeDataProductCandidate | undefined => {
  const { origin } = row;
  if (
    !(origin instanceof V1_SdlcDeploymentDataProductOrigin) ||
    !origin.group ||
    !origin.artifact ||
    !origin.version ||
    !row.fullPath ||
    row.lakehouseEnvironment?.type.toUpperCase() !== environmentType
  ) {
    return undefined;
  }
  return new CubeDataProductCandidate({
    id: row.id,
    deploymentId: String(row.deploymentId),
    dataProductPath: row.fullPath,
    title: row.title ?? row.id,
    // a wire null is no description
    description: row.description ?? undefined,
    groupId: origin.group,
    artifactId: origin.artifact,
    versionId: origin.version,
    environmentType,
    producerEnvironmentName: row.lakehouseEnvironment.producerEnvironmentName,
  });
};

/** A lite row read on its own: one that can't be read is dropped, never failing the list */
const toLiteCandidate = (
  row: PlainObject,
  environmentType: CubeDataProductEnvironmentType,
): CubeDataProductCandidate | undefined => {
  try {
    return toCandidate(
      deserialize(V1_EntitlementsDataProductLiteModelSchema, row),
      environmentType,
    );
  } catch {
    return undefined;
  }
};

/** The cursor's deployment, a number or a string of digits; none for anything else, null and '' included */
const toCursorDeploymentId = (value: unknown): number | undefined => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }
  return typeof value === 'string' && /^\d+$/u.test(value)
    ? Number(value)
    : undefined;
};

export class V1_LegendCubeDataProductCatalog implements CubeDataProductCatalog {
  readonly environmentTypes = ENVIRONMENT_TYPES;
  private readonly contractServerClient: LakehouseContractServerClient;
  private readonly depotServerClient: DepotServerClient;
  private readonly getAccessToken: () => string | undefined;
  /** Each class's list, read once per page visit */
  private readonly lists = new Map<
    CubeDataProductEnvironmentType,
    Promise<readonly CubeDataProductCandidate[]>
  >();
  /** Each product's description, by its project, version and path */
  private readonly descriptions = new Map<
    string,
    Promise<CubeDataProductDescription>
  >();

  constructor(
    contractServerClient: LakehouseContractServerClient,
    depotServerClient: DepotServerClient,
    getAccessToken: () => string | undefined,
  ) {
    this.contractServerClient = contractServerClient;
    this.depotServerClient = depotServerClient;
    this.getAccessToken = getAccessToken;
  }

  /**
   * The class's lite rows, page by page along the lakehouse's cursor. Stops
   * with an error on a page that isn't one, on a missing or repeated cursor,
   * or past the page cap, and between pages once the search is dropped.
   */
  private async readLiteRows(
    environmentType: CubeDataProductEnvironmentType,
    signal: AbortSignal | undefined,
  ): Promise<PlainObject[]> {
    const rows: PlainObject[] = [];
    let cursor: { id: string; deploymentId: number } | undefined;
    for (let page = 1; page <= LITE_PAGE_CAP; page++) {
      throwIfAborted(signal);
      const response: unknown =
        await this.contractServerClient.getDataProductsLitePaginated(
          LITE_PAGE_SIZE,
          environmentType as unknown as V1_EntitlementsLakehouseEnvironmentType,
          cursor?.id,
          cursor?.deploymentId,
          this.getAccessToken(),
        );
      // a 200 carrying an error is no page
      const list = isPlainObject(response)
        ? response.liteDataProductsResponse
        : undefined;
      const products = isPlainObject(list) ? list.dataProducts : undefined;
      if (!Array.isArray(products)) {
        throw new Error(V1_CUBE_DATA_PRODUCT_LIST_ERROR.UNREADABLE_PAGE);
      }
      rows.push(...products.filter(isPlainObject));
      const metadata = (response as PlainObject).paginationMetadataRecord;
      if (!isPlainObject(metadata) || metadata.hasNextPage !== true) {
        return rows;
      }
      const last = metadata.lastValuesMap;
      const id = isPlainObject(last) ? last.id : undefined;
      const deploymentId = toCursorDeploymentId(
        isPlainObject(last) ? last.deployment_id : undefined,
      );
      if (typeof id !== 'string' || !id || deploymentId === undefined) {
        throw new Error(V1_CUBE_DATA_PRODUCT_LIST_ERROR.NO_CURSOR);
      }
      if (cursor?.id === id && cursor.deploymentId === deploymentId) {
        throw new Error(V1_CUBE_DATA_PRODUCT_LIST_ERROR.REPEATED_CURSOR);
      }
      cursor = { id, deploymentId };
    }
    throw new Error(V1_CUBE_DATA_PRODUCT_LIST_ERROR.TOO_MANY_PAGES);
  }

  /**
   * The class's list, read once per page visit. A list whose search is
   * dropped while it pages is forgotten at once, so the next search reads it
   * again rather than waiting on the stopped one.
   */
  private listOf(
    environmentType: CubeDataProductEnvironmentType,
    signal: AbortSignal | undefined,
  ): Promise<readonly CubeDataProductCandidate[]> {
    const cached = this.lists.get(environmentType);
    if (cached) {
      return cached;
    }
    let list: Promise<readonly CubeDataProductCandidate[]> | undefined;
    const forget = (): void => {
      if (this.lists.get(environmentType) === list) {
        this.lists.delete(environmentType);
      }
    };
    list = (async () => {
      signal?.addEventListener('abort', forget, { once: true });
      try {
        return (await this.readLiteRows(environmentType, signal))
          .map((row) => toLiteCandidate(row, environmentType))
          .filter(isNonNullable);
      } finally {
        signal?.removeEventListener('abort', forget);
      }
    })().catch((error: unknown) => {
      // read again on the next search
      forget();
      if (signal?.aborted) {
        throw error;
      }
      throw new CubeEngineError(
        CubeEngineErrorKind.NETWORK,
        `Cube couldn't list the data products\n${toMessage(error)}`,
      );
    });
    this.lists.set(environmentType, list);
    return list;
  }

  async search(
    search: {
      text: string;
      environmentType: CubeDataProductEnvironmentType;
    },
    signal?: AbortSignal,
  ): Promise<readonly CubeDataProductCandidate[]> {
    const text = search.text.trim().toLowerCase();
    return (await this.listOf(search.environmentType, signal)).filter(
      (candidate) =>
        [candidate.title, candidate.id, candidate.description ?? '']
          .join('\n')
          .toLowerCase()
          .includes(text),
    );
  }

  /** The product's deployed artifact: the generation file at its path */
  private async readArtifact(
    candidate: CubeDataProductCandidate,
  ): Promise<unknown> {
    const project = new StoreProjectData();
    project.groupId = candidate.groupId;
    project.artifactId = candidate.artifactId;
    const files = (
      await this.depotServerClient.getGenerationFilesByType(
        project,
        candidate.versionId,
        DATA_PRODUCT_GENERATION_TYPE,
        candidate.dataProductPath,
      )
    ).map((file) => StoredFileGeneration.serialization.fromJson(file));
    const content = files.find(
      (file) => file.path === candidate.dataProductPath,
    )?.file.content;
    if (content === undefined) {
      throw new Error(
        `The data product ${candidate.dataProductPath} has no deployed artifact at ${candidate.groupId}:${candidate.artifactId}:${candidate.versionId}`,
      );
    }
    return JSON.parse(content) as unknown;
  }

  /** The product's definition at the deployed version */
  private async readDefinition(
    candidate: CubeDataProductCandidate,
  ): Promise<unknown> {
    const entity = await this.depotServerClient.getVersionEntity(
      candidate.groupId,
      candidate.artifactId,
      candidate.versionId,
      candidate.dataProductPath,
    );
    return entity.content;
  }

  describe(
    candidate: CubeDataProductCandidate,
  ): Promise<CubeDataProductDescription> {
    const key = JSON.stringify([
      candidate.groupId,
      candidate.artifactId,
      candidate.versionId,
      candidate.dataProductPath,
    ]);
    let description = this.descriptions.get(key);
    if (!description) {
      description = Promise.all([
        this.readArtifact(candidate),
        this.readDefinition(candidate),
      ])
        .then(([artifact, definition]) =>
          V1_readCubeDataProductDescription(candidate, artifact, definition),
        )
        .catch((error: unknown) => {
          this.descriptions.delete(key);
          throw new CubeEngineError(
            CubeEngineErrorKind.NETWORK,
            `Cube couldn't read the data product ${candidate.dataProductPath}\n${toMessage(error)}`,
          );
        });
      this.descriptions.set(key, description);
    }
    return description;
  }

  async resolveSchemas(
    project: CubeDataProductProject,
    sources: ReadonlyMap<NodeId, CubeAccessPointLocation>,
  ): Promise<Map<NodeId, Schema | CubeEngineError>> {
    const resolved = new Map<NodeId, Schema | CubeEngineError>();
    await Promise.all(
      [...sources].map(async ([nodeId, location]) => {
        try {
          const description = await this.describe(
            new CubeDataProductCandidate({
              id: location.dataProduct,
              deploymentId: '',
              dataProductPath: location.dataProduct,
              title: location.dataProduct,
              groupId: project.groupId,
              artifactId: project.artifactId,
              versionId: project.versionId,
              environmentType: project.environmentType,
            }),
          );
          const schema = V1_findCubeAccessPointSchema(description, location);
          resolved.set(
            nodeId,
            typeof schema === 'string'
              ? new CubeEngineError(CubeEngineErrorKind.COMPILE, schema, nodeId)
              : schema,
          );
        } catch (error) {
          resolved.set(
            nodeId,
            error instanceof CubeEngineError
              ? new CubeEngineError(error.kind, error.detail, nodeId)
              : new CubeEngineError(
                  CubeEngineErrorKind.NETWORK,
                  toMessage(error),
                  nodeId,
                ),
          );
        }
      }),
    );
    return new Map(
      [...sources.keys()].map((nodeId) => [
        nodeId,
        resolved.get(nodeId) as Schema | CubeEngineError,
      ]),
    );
  }

  /** Links come later: the host has no marketplace link yet */
  getMarketplaceLink(): string | undefined {
    return undefined;
  }
}
