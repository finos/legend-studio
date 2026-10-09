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
  V1_SdlcDeploymentDataProductOrigin,
  V1_entitlementsDataProductLiteResponseToDataProductLite,
} from '@finos/legend-graph';
import {
  type DepotServerClient,
  StoreProjectData,
} from '@finos/legend-server-depot';
import type { LakehouseContractServerClient } from '@finos/legend-server-lakehouse';
import { isNonNullable } from '@finos/legend-shared';
import { StoredFileGeneration } from '@finos/legend-storage';
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
// at the deployed version, from the depot

/** The generation type of a data product's artifact */
const DATA_PRODUCT_GENERATION_TYPE = 'dataProduct';

/** The classes Cube lists, Production first, as Data Cube's selection offers */
const ENVIRONMENT_TYPES = [
  CubeDataProductEnvironmentType.PRODUCTION,
  CubeDataProductEnvironmentType.PRODUCTION_PARALLEL,
];

const toMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

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
    description: row.description,
    groupId: origin.group,
    artifactId: origin.artifact,
    versionId: origin.version,
    environmentType,
    producerEnvironmentName: row.lakehouseEnvironment.producerEnvironmentName,
  });
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

  private listOf(
    environmentType: CubeDataProductEnvironmentType,
  ): Promise<readonly CubeDataProductCandidate[]> {
    let list = this.lists.get(environmentType);
    if (!list) {
      list = (async () =>
        V1_entitlementsDataProductLiteResponseToDataProductLite(
          await this.contractServerClient.getAllLiteDataProducts(
            environmentType as unknown as V1_EntitlementsLakehouseEnvironmentType,
            undefined,
            this.getAccessToken(),
          ),
        )
          .map((row) => toCandidate(row, environmentType))
          .filter(isNonNullable))().catch((error: unknown) => {
        // read again on the next search
        this.lists.delete(environmentType);
        throw new CubeEngineError(
          CubeEngineErrorKind.NETWORK,
          `Cube couldn't list the data products\n${toMessage(error)}`,
        );
      });
      this.lists.set(environmentType, list);
    }
    return list;
  }

  async search(search: {
    text: string;
    environmentType: CubeDataProductEnvironmentType;
  }): Promise<readonly CubeDataProductCandidate[]> {
    const text = search.text.trim().toLowerCase();
    return (await this.listOf(search.environmentType)).filter((candidate) =>
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
