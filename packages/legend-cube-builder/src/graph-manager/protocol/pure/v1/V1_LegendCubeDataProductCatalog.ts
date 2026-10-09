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
  type V1_LiteDataContractWithUserStatus,
  V1_EnrichedUserApprovalStatus,
  V1_EntitlementsDataProductLiteModelSchema,
  V1_liteDataContractWithUserStatusModelSchema,
  V1_ResourceType,
  V1_SdlcDeploymentDataProductOrigin,
} from '@finos/legend-graph';
import {
  type DepotServerClient,
  StoreProjectData,
} from '@finos/legend-server-depot';
import type { LakehouseContractServerClient } from '@finos/legend-server-lakehouse';
import {
  type MarketplaceServerClient,
  DataProductSearchResult,
  LakehouseDataProductSearchResultDetails,
  LakehouseSDLCDataProductSearchResultOrigin,
  SearchType,
} from '@finos/legend-server-marketplace';
import { isNonNullable, type PlainObject } from '@finos/legend-shared';
import { StoredFileGeneration } from '@finos/legend-storage';
import { deserialize } from 'serializr';
import {
  type CubeDataProductProject,
  CubeDataProductEnvironmentType,
} from '../../../CubeDataProduct.js';
import {
  CubeAccessPointGroupAccess,
  type CubeAccessPointLocation,
  type CubeDataProductCatalog,
  type CubeMarketplaceLinkTarget,
  CubeDataProductCandidate,
  type CubeDataProductDescription,
} from '../../../CubeDataProductCatalog.js';
import {
  CubeEngineError,
  CubeEngineErrorKind,
  type NodeId,
} from '../../../CubeEngine.js';
import {
  type V1_CubeEnterpriseStereotype,
  V1_findCubeAccessPointSchema,
  V1_readCubeDataProductDescription,
} from './V1_CubeDataProductArtifact.js';

// The deployed data products, as Legend Query lists and reads them: the
// lakehouse's lite list per class (DataProductSelectorState), then a
// product's deployed artifact (getGenerationFilesByType) and its definition
// at the deployed version, from the depot. Cube pages the lite list itself
// (PLAN §6.8): the client's own loop never ends on a page that says more
// follow without saying where, or on a repeated cursor, and can't be stopped.
// Given the marketplace's search API, a search runs there instead, as the
// marketplace's Lakehouse Access search does, and the list is never read

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
/** The products one marketplace search gives: its first page, of this size */
const SEARCH_PAGE_SIZE = 100;

export const V1_CUBE_DATA_PRODUCT_LIST_ERROR = {
  UNREADABLE_PAGE: "The lakehouse's answer isn't a page of data products",
  NO_CURSOR:
    'The lakehouse said more data products follow, but not where the next page starts',
  REPEATED_CURSOR: 'The lakehouse sent the same page of data products twice',
  TOO_MANY_PAGES: `The lakehouse's data product list runs past ${LITE_PAGE_CAP} pages`,
} as const;

export const V1_CUBE_DATA_PRODUCT_SEARCH_ERROR = {
  UNREADABLE_PAGE: "The marketplace's answer isn't a page of search results",
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

/**
 * A search row as Cube lists it, the same candidate as its lite row's: none
 * for a DataSpace, an error, an ad hoc or incomplete one, or another class's
 */
const toSearchCandidate = (
  result: DataProductSearchResult,
  environmentType: CubeDataProductEnvironmentType,
): CubeDataProductCandidate | undefined => {
  const details = result.dataProductDetails;
  if (!(details instanceof LakehouseDataProductSearchResultDetails)) {
    return undefined;
  }
  const { origin } = details;
  const deploymentId: unknown = details.deploymentId;
  if (
    !(origin instanceof LakehouseSDLCDataProductSearchResultOrigin) ||
    !origin.groupId ||
    !origin.artifactId ||
    !origin.versionId ||
    !origin.path ||
    !details.dataProductId ||
    deploymentId === undefined ||
    deploymentId === null ||
    details.producerEnvironmentType?.toUpperCase() !== environmentType
  ) {
    return undefined;
  }
  return new CubeDataProductCandidate({
    id: details.dataProductId,
    deploymentId: String(deploymentId),
    dataProductPath: origin.path,
    title: result.dataProductTitle ?? details.dataProductId,
    description: result.dataProductDescription ?? undefined,
    groupId: origin.groupId,
    artifactId: origin.artifactId,
    versionId: origin.versionId,
    environmentType,
    producerEnvironmentName: details.producerEnvironmentName,
  });
};

/** A search row read on its own: one that can't be read, e.g. of an unknown type, is dropped, never failing the page */
const toSearchRowCandidate = (
  row: PlainObject,
  environmentType: CubeDataProductEnvironmentType,
): CubeDataProductCandidate | undefined => {
  try {
    return toSearchCandidate(
      DataProductSearchResult.serialization.fromJson(row),
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

/**
 * How far along approval a contract is, as the marketplace ranks a viewer's
 * contracts for one group, so a granted one is never hidden behind a
 * pending duplicate
 */
const APPROVAL_STAGE: Partial<Record<V1_EnrichedUserApprovalStatus, number>> = {
  [V1_EnrichedUserApprovalStatus.SUBMITTED_FOR_APPROVALS]: 1,
  [V1_EnrichedUserApprovalStatus.PENDING_CONSUMER_PRIVILEGE_MANAGER_APPROVAL]: 2,
  [V1_EnrichedUserApprovalStatus.PENDING_DATA_OWNER_APPROVAL]: 3,
  [V1_EnrichedUserApprovalStatus.APPROVED]: 4,
};

/** A contract's status as the access the marketplace shows for it */
const toGroupAccess = (
  status: V1_EnrichedUserApprovalStatus,
): CubeAccessPointGroupAccess => {
  switch (status) {
    case V1_EnrichedUserApprovalStatus.APPROVED:
      return CubeAccessPointGroupAccess.APPROVED;
    case V1_EnrichedUserApprovalStatus.SUBMITTED_FOR_APPROVALS:
      return CubeAccessPointGroupAccess.SUBMITTED_FOR_APPROVALS;
    case V1_EnrichedUserApprovalStatus.PENDING_CONSUMER_PRIVILEGE_MANAGER_APPROVAL:
      return CubeAccessPointGroupAccess.PENDING_MANAGER_APPROVAL;
    case V1_EnrichedUserApprovalStatus.PENDING_DATA_OWNER_APPROVAL:
      return CubeAccessPointGroupAccess.PENDING_DATA_OWNER_APPROVAL;
    case V1_EnrichedUserApprovalStatus.DENIED:
      return CubeAccessPointGroupAccess.DENIED;
    default:
      return CubeAccessPointGroupAccess.NO_ACCESS;
  }
};

/** What a host can add to the catalog: each part turns on what it serves */
export interface V1_CubeDataProductCatalogOptions {
  /** The marketplace's search API; with it, searches run there */
  readonly marketplaceServerClient?: MarketplaceServerClient | undefined;
  /** Builds a product's marketplace page, as the host's marketplace names it */
  readonly marketplaceLink?:
    | ((target: CubeMarketplaceLinkTarget) => string | undefined)
    | undefined;
  /** The viewer, whose contracts give their access to each group */
  readonly getCurrentUser?: (() => string) | undefined;
  /** The stereotype the host's marketplace marks groups open to everyone with */
  readonly enterpriseStereotype?: V1_CubeEnterpriseStereotype | undefined;
}

export class V1_LegendCubeDataProductCatalog implements CubeDataProductCatalog {
  readonly environmentTypes = ENVIRONMENT_TYPES;
  private readonly contractServerClient: LakehouseContractServerClient;
  private readonly depotServerClient: DepotServerClient;
  private readonly getAccessToken: () => string | undefined;
  private readonly options: V1_CubeDataProductCatalogOptions;
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
  /** The search answers whose page leaves out matches */
  private readonly cutShortAnswers = new WeakSet<
    readonly CubeDataProductCandidate[]
  >();

  constructor(
    contractServerClient: LakehouseContractServerClient,
    depotServerClient: DepotServerClient,
    getAccessToken: () => string | undefined,
    options: V1_CubeDataProductCatalogOptions = {},
  ) {
    this.contractServerClient = contractServerClient;
    this.depotServerClient = depotServerClient;
    this.getAccessToken = getAccessToken;
    this.options = options;
  }

  get searchesOnServer(): boolean {
    return this.options.marketplaceServerClient !== undefined;
  }

  get searchLimit(): number | undefined {
    return this.searchesOnServer ? SEARCH_PAGE_SIZE : undefined;
  }

  isCutShort(answer: readonly CubeDataProductCandidate[]): boolean {
    return this.cutShortAnswers.has(answer);
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
    const list = this.readList(environmentType, signal);
    const forget = (): void => {
      if (this.lists.get(environmentType) === list) {
        this.lists.delete(environmentType);
      }
    };
    const stopWatching = (): void =>
      signal?.removeEventListener('abort', forget);
    signal?.addEventListener('abort', forget, { once: true });
    // a failed list is read again on the next search: forgotten before its failure is seen
    list.then(stopWatching, () => {
      forget();
      stopWatching();
    });
    this.lists.set(environmentType, list);
    return list;
  }

  /** The class's list, along its pages; a stopped one fails with why it was stopped */
  private async readList(
    environmentType: CubeDataProductEnvironmentType,
    signal: AbortSignal | undefined,
  ): Promise<readonly CubeDataProductCandidate[]> {
    try {
      return (await this.readLiteRows(environmentType, signal))
        .map((row) => toLiteCandidate(row, environmentType))
        .filter(isNonNullable);
    } catch (error) {
      if (signal?.aborted) {
        throw error;
      }
      throw new CubeEngineError(
        CubeEngineErrorKind.NETWORK,
        `Cube couldn't list the data products\n${toMessage(error)}`,
      );
    }
  }

  /**
   * The products the marketplace matches, in its order: the first page of a
   * full text search in the class. A failed search fails; it never falls
   * back to the lakehouse's list
   */
  private async searchMarketplace(
    marketplaceServerClient: MarketplaceServerClient,
    search: {
      text: string;
      environmentType: CubeDataProductEnvironmentType;
    },
    signal: AbortSignal | undefined,
  ): Promise<readonly CubeDataProductCandidate[]> {
    const { environmentType } = search;
    try {
      const response: unknown =
        await marketplaceServerClient.lakehouseAccessSearch(
          search.text.trim(),
          environmentType as unknown as V1_EntitlementsLakehouseEnvironmentType,
          {
            searchType: SearchType.FULL_TEXT,
            pageSize: SEARCH_PAGE_SIZE,
            pageNumber: 1,
            // every deployment, as the lite list gives, none hidden as a duplicate
            showAll: true,
            ...(signal ? { signal } : {}),
          },
        );
      // a 200 carrying an error is no page
      const results = isPlainObject(response) ? response.results : undefined;
      if (!Array.isArray(results)) {
        throw new Error(V1_CUBE_DATA_PRODUCT_SEARCH_ERROR.UNREADABLE_PAGE);
      }
      const answer = results
        .filter(isPlainObject)
        .map((row) => toSearchRowCandidate(row, environmentType))
        .filter(isNonNullable);
      // counted before any row is dropped: a full page, or fewer rows than the matches
      const metadata = (response as PlainObject).metadata;
      const totalCount = isPlainObject(metadata)
        ? metadata.total_count
        : undefined;
      if (
        results.length >= SEARCH_PAGE_SIZE ||
        (typeof totalCount === 'number' && totalCount > results.length)
      ) {
        this.cutShortAnswers.add(answer);
      }
      return answer;
    } catch (error) {
      if (signal?.aborted) {
        throw error;
      }
      throw new CubeEngineError(
        CubeEngineErrorKind.NETWORK,
        `Cube couldn't search the data products\n${toMessage(error)}`,
      );
    }
  }

  async search(
    search: {
      text: string;
      environmentType: CubeDataProductEnvironmentType;
    },
    signal?: AbortSignal,
  ): Promise<readonly CubeDataProductCandidate[]> {
    if (this.options.marketplaceServerClient) {
      return this.searchMarketplace(
        this.options.marketplaceServerClient,
        search,
        signal,
      );
    }
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
          V1_readCubeDataProductDescription(
            candidate,
            artifact,
            definition,
            this.options.enterpriseStereotype,
          ),
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

  /** The product's page in the host's marketplace, as the host builds it; none without one */
  getMarketplaceLink(target: CubeMarketplaceLinkTarget): string | undefined {
    return this.options.marketplaceLink?.(target);
  }

  /**
   * The viewer's access to each of the product's groups, as the marketplace
   * shows it, from the viewer's contracts, read afresh each time: a group
   * marked open to everyone needs none; otherwise the contract for that
   * group of this deployment furthest along approval. A group with no
   * contract has no access only when the host marks open groups, since it
   * might be one otherwise
   */
  async getAccess(
    candidate: CubeDataProductCandidate,
    signal?: AbortSignal,
  ): Promise<ReadonlyMap<string, CubeAccessPointGroupAccess>> {
    const { getCurrentUser, enterpriseStereotype } = this.options;
    if (!getCurrentUser || !/^\d+$/u.test(candidate.deploymentId)) {
      return new Map();
    }
    const deploymentId = Number(candidate.deploymentId);
    const description = await this.describe(candidate);
    throwIfAborted(signal);
    let rows: unknown;
    try {
      rows = await this.contractServerClient.getContractsForUser(
        getCurrentUser(),
        this.getAccessToken(),
      );
    } catch (error) {
      throw new CubeEngineError(
        CubeEngineErrorKind.NETWORK,
        `Cube couldn't read your data contracts\n${toMessage(error)}`,
      );
    }
    throwIfAborted(signal);
    if (!Array.isArray(rows)) {
      throw new CubeEngineError(
        CubeEngineErrorKind.NETWORK,
        "Cube couldn't read your data contracts\nThe lakehouse's answer isn't a list of contracts",
      );
    }
    // a contract Cube can't read is left out, never failing the others
    const contracts = rows.flatMap(
      (row): V1_LiteDataContractWithUserStatus[] => {
        if (!isPlainObject(row) || !isPlainObject(row.contractResultLite)) {
          return [];
        }
        try {
          return [
            deserialize(V1_liteDataContractWithUserStatusModelSchema([]), row),
          ];
        } catch {
          return [];
        }
      },
    );
    const access = new Map<string, CubeAccessPointGroupAccess>();
    description.groups.forEach((group) => {
      if (group.isEnterprise) {
        access.set(group.id, CubeAccessPointGroupAccess.ENTERPRISE);
        return;
      }
      const best = contracts
        .filter(({ contractResultLite: contract }) => {
          return (
            contract.resourceType === V1_ResourceType.ACCESS_POINT_GROUP &&
            contract.accessPointGroup === group.id &&
            contract.resourceId === candidate.id &&
            contract.deploymentId === deploymentId
          );
        })
        .reduce<V1_LiteDataContractWithUserStatus | undefined>(
          (found, contract) =>
            !found ||
            (APPROVAL_STAGE[contract.status] ?? 0) >
              (APPROVAL_STAGE[found.status] ?? 0)
              ? contract
              : found,
          undefined,
        );
      if (best) {
        access.set(group.id, toGroupAccess(best.status));
      } else if (enterpriseStereotype) {
        access.set(group.id, CubeAccessPointGroupAccess.NO_ACCESS);
      }
    });
    return access;
  }
}
