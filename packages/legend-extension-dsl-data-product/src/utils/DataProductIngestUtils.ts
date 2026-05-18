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
  type AbstractPureGraphManager,
  type PureProtocolProcessorPlugin,
  type V1_Accessor,
  type V1_AccessPointImplementation,
  type V1_DataProduct,
  type V1_Dataset,
  type V1_EntitlementsDataProductDetails,
  type V1_PureGraphManager,
  CORE_PURE_PATH,
  V1_AdHocDeploymentDataProductOrigin,
  V1_AppDirLevel,
  V1_AppDirProducer,
  V1_DATA_PRODUCT_ELEMENT_PROTOCOL_TYPE,
  V1_dataProductModelSchema,
  V1_DataProductAccessor,
  V1_DataProductArtifact,
  V1_deserializeDataContractResponse,
  V1_entitlementsDataProductDetailsResponseToDataProductDetails,
  V1_IngestDefinitionAccessor,
  V1_IngestEnvironmentClassification,
  V1_KerberosProducer,
  V1_LakehouseAccessPoint,
  V1_ProducerType,
  V1_resolveAccessorsFromRawLambda,
  V1_ResourceType,
  V1_SdlcDeploymentDataProductOrigin,
  V1_transformDataContractToLiteDatacontract,
  ELEMENT_PATH_DELIMITER,
  RawLambda,
} from '@finos/legend-graph';
import {
  type ProjectGAVCoordinates,
  type Entity,
  StoredFileGeneration,
} from '@finos/legend-storage';
import {
  type LakehouseContractServerClient,
  type LakehouseIngestServerClient,
  type LakehousePlatformServerClient,
  IngestDeploymentServerConfig,
  ProducerEnvironment,
} from '@finos/legend-server-lakehouse';
import {
  type DepotServerClient,
  StoreProjectData,
  resolveVersion,
} from '@finos/legend-server-depot';
import {
  type PlainObject,
  assertErrorThrown,
  guaranteeNonNullable,
  isNonNullable,
} from '@finos/legend-shared';
import { deserialize } from 'serializr';

export interface LakehouseIngestDatasetInfo {
  gavCoordinates: ProjectGAVCoordinates;
  deploymentId: number;
  ingestDefinitionPackage: string;
  ingestDefinitionName: string;
  datasetName: string;
  producerType: V1_ProducerType;
  appDirId?: number | undefined;
  kerberos?: string | undefined;
}

const CLASSIFICATION_TO_URN_ENV: Record<
  V1_IngestEnvironmentClassification,
  string
> = {
  [V1_IngestEnvironmentClassification.PROD]: 'prod',
  [V1_IngestEnvironmentClassification.PROD_PARALLEL]: 'prod-parallel',
  [V1_IngestEnvironmentClassification.DEV]: 'non-prod',
};

export const buildCandidateIngestUrns = (
  datasetInfo: LakehouseIngestDatasetInfo,
  datasetEnv: string,
  datasetTail: string,
): string[] => {
  const candidates: string[] = [];
  const { groupId, artifactId } = datasetInfo.gavCoordinates;
  if (groupId && artifactId) {
    candidates.push(
      `urn:lakehouse:${datasetEnv}:ingest:definition:alloy-git:${groupId}~${artifactId}~${datasetTail}`,
    );
  }
  if (datasetInfo.appDirId !== undefined) {
    candidates.push(
      `urn:lakehouse:${datasetEnv}:ingest:definition:rest-api:${datasetInfo.deploymentId}~${datasetInfo.appDirId}~${datasetTail}`,
    );
  }
  if (datasetInfo.kerberos) {
    candidates.push(
      `urn:lakehouse:${datasetEnv}:ingest:definition:rest-api:${datasetInfo.kerberos}~${datasetTail}`,
    );
  }
  return candidates;
};

export const collectDatasetsFromArtifact = (
  artifact: V1_DataProductArtifact,
  accessPointGroupId: string,
  dataProductName: string,
): V1_Dataset[] => {
  const targetApg = artifact.accessPointGroups.find(
    (apg) => apg.id === accessPointGroupId,
  );
  if (!targetApg) {
    throw new Error(
      `Access point group '${accessPointGroupId}' not found in data product '${dataProductName}'`,
    );
  }

  const apgToImplementationMap = new Map<
    string,
    V1_AccessPointImplementation
  >();
  for (const apg of artifact.accessPointGroups) {
    for (const apImplementation of apg.accessPointImplementations) {
      if (!apgToImplementationMap.has(apImplementation.id)) {
        apgToImplementationMap.set(apImplementation.id, apImplementation);
      }
    }
  }

  const collectedDatasets: V1_Dataset[] = [];
  const visitedAccessPointIds = new Set<string>();
  const apQueue: string[] = targetApg.accessPointImplementations.map(
    (apImplementation) => apImplementation.id,
  );

  while (apQueue.length > 0) {
    const apId = guaranteeNonNullable(apQueue.shift());
    if (visitedAccessPointIds.has(apId)) {
      continue;
    }

    const apImplementation = guaranteeNonNullable(
      apgToImplementationMap.get(apId),
      `Access point '${apId}' referenced by data product '${dataProductName}' was not found in the artifact`,
    );
    visitedAccessPointIds.add(apId);

    for (const dataset of apImplementation.dependencyDatasets) {
      const alreadyCollected = collectedDatasets.some(
        (d) =>
          d.ingestDefinition.path === dataset.ingestDefinition.path &&
          d.dataset === dataset.dataset,
      );
      if (!alreadyCollected) {
        collectedDatasets.push(dataset);
      }
    }

    for (const dep of apImplementation.dependencyAccessPoints) {
      if (dep.dataProductId !== dataProductName) {
        // TODO: Add cross DP support
        continue;
      }
      if (!visitedAccessPointIds.has(dep.accessPointId)) {
        apQueue.push(dep.accessPointId);
      }
    }
  }

  return collectedDatasets;
};

/**
 * Returns true when the artifact's access point group cannot be walked
 * structurally and we must fall back to lambda walking. This is the case when
 * the target group is missing, has no implementations, or every implementation
 * has neither dependency datasets nor dependency access points.
 */
export const isLegacyArtifact = (
  artifact: V1_DataProductArtifact,
  accessPointGroupId: string,
): boolean => {
  const apgEntry = artifact.accessPointGroups.find(
    (g) => g.id === accessPointGroupId,
  );
  return (
    !apgEntry ||
    apgEntry.accessPointImplementations.length === 0 ||
    apgEntry.accessPointImplementations.every(
      (impl) =>
        impl.dependencyDatasets.length === 0 &&
        impl.dependencyAccessPoints.length === 0,
    )
  );
};

/**
 * BFS over a data product's access point graph, resolving the lambda on each
 * `V1_LakehouseAccessPoint` to discover ingest spec paths and same-DP access
 * point references. The engine-bound part — turning a `RawLambda` into a list
 * of `V1_Accessor`s — is injected via `resolveAccessors` so this helper can be
 * unit-tested without booting a `V1_PureGraphManager`.
 *
 * - Ingest accessors contribute their path[0] to the returned set.
 * - Same-DP data product accessors enqueue the access point group containing
 *   the referenced access point.
 * - Cross-DP data product accessors are silently skipped (cross-DP
 *   verification is not yet supported).
 * - Access points are deduped by `${dpPath}::${apId}` to avoid cycles.
 */
export const walkAccessPointGraphForIngestPaths = (
  v1DataProduct: V1_DataProduct,
  rootAccessPointGroupId: string,
  resolveAccessors: (lambda: RawLambda) => V1_Accessor[],
): Set<string> => {
  const dpPath = `${v1DataProduct.package}${ELEMENT_PATH_DELIMITER}${v1DataProduct.name}`;
  const targetApg = v1DataProduct.accessPointGroups.find(
    (apg) => apg.id === rootAccessPointGroupId,
  );
  if (!targetApg) {
    throw new Error(
      `Access point group '${rootAccessPointGroupId}' not found in data product '${dpPath}'`,
    );
  }

  const ingestSpecPaths = new Set<string>();
  const visitedAccessPointKeys = new Set<string>();
  const apgWorklist: string[] = [rootAccessPointGroupId];

  const collectFromApg = (apgId: string): void => {
    const apg = v1DataProduct.accessPointGroups.find((g) => g.id === apgId);
    if (!apg) {
      return;
    }
    for (const accessPoint of apg.accessPoints) {
      if (!(accessPoint instanceof V1_LakehouseAccessPoint)) {
        continue;
      }
      const accessPointKey = `${dpPath}${ELEMENT_PATH_DELIMITER}${accessPoint.id}`;
      if (visitedAccessPointKeys.has(accessPointKey)) {
        continue;
      }
      visitedAccessPointKeys.add(accessPointKey);

      const rawLambda = new RawLambda(
        accessPoint.func.parameters,
        accessPoint.func.body,
      );
      const accessors = resolveAccessors(rawLambda);
      for (const accessor of accessors) {
        if (accessor instanceof V1_IngestDefinitionAccessor) {
          const ingestSpecPath = accessor.path[0];
          if (ingestSpecPath) {
            ingestSpecPaths.add(ingestSpecPath);
          }
        } else if (accessor instanceof V1_DataProductAccessor) {
          const refDpPath = accessor.path[0];
          const refApId = accessor.path[1];
          if (!refDpPath || !refApId || refDpPath !== dpPath) {
            continue;
          }
          const refApg = v1DataProduct.accessPointGroups.find((g) =>
            g.accessPoints.some((ap) => ap.id === refApId),
          );
          if (refApg && !apgWorklist.includes(refApg.id)) {
            apgWorklist.push(refApg.id);
          }
        }
      }
    }
  };

  while (apgWorklist.length > 0) {
    const apgId = guaranteeNonNullable(apgWorklist.shift());
    collectFromApg(apgId);
  }

  return ingestSpecPaths;
};

/**
 * Identity of an access point group: a `(deploymentId, dataProductName)` pair
 * uniquely identifies a data product, and `accessPointGroupId` selects the
 * group within it.
 */
export interface APGCoordinates {
  deploymentId: number;
  dataProductName: string;
  accessPointGroupId: string;
}

/**
 * Structural port for the lakehouse clients the missing-ingest check needs.
 * `LegendMarketplaceBaseStore` satisfies this with no adapter code.
 */
export interface MissingIngestsClientProvider {
  readonly lakehouseContractServerClient: LakehouseContractServerClient;
  readonly depotServerClient: DepotServerClient;
  readonly lakehouseIngestServerClient: LakehouseIngestServerClient;
  readonly lakehousePlatformServerClient: LakehousePlatformServerClient;
}

interface ResolvedMissingIngestsContext {
  accessPointGroupId: string;
  deploymentId: number;
  dataProductName: string;
  gavCoordinates: ProjectGAVCoordinates;
  artifact: V1_DataProductArtifact;
  v1DataProduct?: V1_DataProduct | undefined;
}

interface RunMissingIngestsCheckDeps {
  lakehouseIngestServerClient: LakehouseIngestServerClient;
  lakehousePlatformServerClient: LakehousePlatformServerClient;
  plugins: PureProtocolProcessorPlugin[];
  getGraphManager?: () => Promise<AbstractPureGraphManager>;
}

/**
 * Core of the missing-ingest check. Returns ingest definition tails
 * (`package::name`) that this APG references but that could not be verified
 * against the producer's ingest server.
 *
 * On any thrown error returns `[]` rather than propagating; the missing-
 * ingest signal is advisory UI metadata, not a blocking error path.
 */
async function runMissingIngestsCheck(
  context: ResolvedMissingIngestsContext,
  deps: RunMissingIngestsCheckDeps,
  token: string | undefined,
): Promise<string[]> {
  const {
    accessPointGroupId,
    deploymentId,
    dataProductName,
    gavCoordinates,
    artifact,
    v1DataProduct,
  } = context;
  const {
    lakehouseIngestServerClient,
    lakehousePlatformServerClient,
    plugins,
    getGraphManager,
  } = deps;

  try {
    const isLegacy = isLegacyArtifact(artifact, accessPointGroupId);

    let datasetInfos: LakehouseIngestDatasetInfo[];
    if (isLegacy) {
      if (!v1DataProduct || !getGraphManager) {
        return [];
      }
      const graphManager = await getGraphManager();
      const ingestSpecPaths = walkAccessPointGraphForIngestPaths(
        v1DataProduct,
        accessPointGroupId,
        (lambda) =>
          V1_resolveAccessorsFromRawLambda(lambda, graphManager, plugins) ?? [],
      );
      datasetInfos = Array.from(ingestSpecPaths, (specPath) => {
        const sepIdx = specPath.lastIndexOf(ELEMENT_PATH_DELIMITER);
        return {
          gavCoordinates,
          deploymentId,
          ingestDefinitionPackage: specPath.slice(0, sepIdx),
          ingestDefinitionName: specPath.slice(
            sepIdx + ELEMENT_PATH_DELIMITER.length,
          ),
          datasetName: '',
          producerType: V1_ProducerType.APP_DIR,
        };
      });
    } else {
      const datasets = collectDatasetsFromArtifact(
        artifact,
        accessPointGroupId,
        dataProductName,
      );
      // TODO: Add cross-DP verification
      datasetInfos = datasets.map((dataset) => {
        const path = dataset.ingestDefinition.path;
        const sepIdx = path.lastIndexOf(ELEMENT_PATH_DELIMITER);
        const producer = dataset.ingestDefinition.producer;
        const isAppDir = producer instanceof V1_AppDirProducer;
        const isKerberos = producer instanceof V1_KerberosProducer;
        return {
          gavCoordinates,
          deploymentId,
          ingestDefinitionPackage: path.slice(0, sepIdx),
          ingestDefinitionName: path.slice(
            sepIdx + ELEMENT_PATH_DELIMITER.length,
          ),
          datasetName: dataset.dataset,
          producerType: isAppDir
            ? V1_ProducerType.APP_DIR
            : V1_ProducerType.KERBEROS,
          appDirId: isAppDir ? producer.appDirId : undefined,
          kerberos: isKerberos ? producer.kerberos : undefined,
        };
      });
    }

    if (datasetInfos.length === 0) {
      return [];
    }

    const ingestEnvironment =
      IngestDeploymentServerConfig.serialization.fromJson(
        await lakehousePlatformServerClient.findProducerServer(
          deploymentId,
          V1_AppDirLevel.DEPLOYMENT,
          token,
        ),
      );
    const ingestServerUrl = ingestEnvironment.ingestServerUrl;

    const producerEnvironment = ProducerEnvironment.serialization.fromJson(
      await lakehouseIngestServerClient.getProducerEnvironment(
        deploymentId,
        ingestServerUrl,
        token,
      ),
    );
    const producerEnvironmentUrn = producerEnvironment.producerEnvironmentUrn;

    const env =
      CLASSIFICATION_TO_URN_ENV[ingestEnvironment.environmentClassification];

    const serverUrns = await lakehouseIngestServerClient.getIngestDefinitions(
      producerEnvironmentUrn,
      ingestServerUrl,
      token,
    );
    const serverUrnSet = new Set(serverUrns);

    const verifications = await Promise.all(
      datasetInfos.map(async (datasetInfo) => {
        const tail = `${datasetInfo.ingestDefinitionPackage}${ELEMENT_PATH_DELIMITER}${datasetInfo.ingestDefinitionName}`;
        const candidates = buildCandidateIngestUrns(datasetInfo, env, tail);
        const matchedUrns = candidates.filter((urn) => serverUrnSet.has(urn));
        if (matchedUrns.length === 0) {
          // TODO: Remove after cross dp is supported
          // Loose path comparison if ingest is cross-dp
          const looseAlloyGitPrefix = `urn:lakehouse:${env}:ingest:definition:alloy-git:`;
          const looseTailSuffix = `~${tail}`;
          const hasLooseGavMatch = Array.from(serverUrnSet).some(
            (urn) =>
              urn.startsWith(looseAlloyGitPrefix) &&
              urn.endsWith(looseTailSuffix),
          );
          if (hasLooseGavMatch) {
            return undefined;
          }
          return tail;
        }
        const probeResults = await Promise.all(
          matchedUrns.map(async (urn) => {
            try {
              await lakehouseIngestServerClient.getIngestDefinitionDetail(
                urn,
                ingestServerUrl,
                token,
              );
              return true;
            } catch (error) {
              assertErrorThrown(error);
              return false;
            }
          }),
        );
        return probeResults.includes(false) ? tail : undefined;
      }),
    );
    return verifications.filter(isNonNullable);
  } catch (error) {
    assertErrorThrown(error);
    return [];
  }
}

/**
 * Resolves the `V1_DataProduct` referenced by `details` from its origin —
 * either the SDLC-deployed depot project or the in-line ad-hoc definition.
 * Returns `undefined` when the origin type is unsupported.
 */
export async function getDataProductFromDetails(
  details: V1_EntitlementsDataProductDetails,
  graphManager: V1_PureGraphManager,
  depotServerClient: DepotServerClient,
): Promise<V1_DataProduct | undefined> {
  if (details.origin instanceof V1_SdlcDeploymentDataProductOrigin) {
    const rawEntities = (await depotServerClient.getVersionEntities(
      details.origin.group,
      details.origin.artifact,
      resolveVersion(details.origin.version),
      CORE_PURE_PATH.DATA_PRODUCT,
    )) as {
      artifactId: string;
      entity: Entity;
      groupId: string;
      versionId: string;
      versionedEntity: boolean;
    }[];
    const entities = rawEntities.map((entity) =>
      deserialize(
        V1_dataProductModelSchema(
          graphManager.pluginManager.getPureProtocolProcessorPlugins(),
        ),
        entity.entity.content,
      ),
    );
    const matchingEntities = entities.filter(
      (entity) => entity.name.toLowerCase() === details.id.toLowerCase(),
    );
    if (matchingEntities.length === 0) {
      throw new Error(
        `No data product found with name ${details.id} in project`,
      );
    } else if (matchingEntities.length > 1) {
      throw new Error(
        `Multiple data products found with name ${details.id} in project`,
      );
    }
    return matchingEntities[0];
  } else if (details.origin instanceof V1_AdHocDeploymentDataProductOrigin) {
    const entities: Entity[] = await graphManager.pureCodeToEntities(
      details.origin.definition,
    );
    const elements = entities
      .filter((e) => e.classifierPath === CORE_PURE_PATH.DATA_PRODUCT)
      .map((entity) =>
        deserialize(
          V1_dataProductModelSchema(
            graphManager.pluginManager.getPureProtocolProcessorPlugins(),
          ),
          entity.content,
        ),
      );
    const matchingEntities = elements.filter(
      (element) => element.name.toLowerCase() === details.id.toLowerCase(),
    );
    if (matchingEntities.length > 1) {
      throw new Error(
        `Multiple data products found with name ${details.id} in deployed definition`,
      );
    }
    return guaranteeNonNullable(
      matchingEntities[0],
      `No data product found with name ${details.id} in deployed definition`,
    );
  } else {
    return undefined;
  }
}

/**
 * APG-driven entry point for the missing-ingest check. Fetches the data
 * product details and depot artifact for `apg`, resolves the `V1_DataProduct`
 * only for legacy artifacts, and runs the verification.
 *
 * Returns `[]` if the data product origin is not SDLC-deployed or any step
 * throws — the missing-ingest signal is advisory UI metadata, not a blocking
 * error path.
 */
export async function getUnverifiedIngestDefinitionsForAPG(
  apg: APGCoordinates,
  clientProvider: MissingIngestsClientProvider,
  plugins: PureProtocolProcessorPlugin[],
  getGraphManager: () => Promise<AbstractPureGraphManager>,
  token: string | undefined,
): Promise<string[]> {
  const {
    lakehouseContractServerClient,
    depotServerClient,
    lakehouseIngestServerClient,
    lakehousePlatformServerClient,
  } = clientProvider;

  try {
    const dpDetails = guaranteeNonNullable(
      V1_entitlementsDataProductDetailsResponseToDataProductDetails(
        await lakehouseContractServerClient.getDataProductByIdAndDID(
          apg.dataProductName,
          apg.deploymentId,
          token,
        ),
      )[0],
      `No data product details found for resource '${apg.dataProductName}' (deployment '${apg.deploymentId}')`,
    );

    if (!(dpDetails.origin instanceof V1_SdlcDeploymentDataProductOrigin)) {
      return [];
    }
    const sdlcOrigin = dpDetails.origin;
    const gavCoordinates: ProjectGAVCoordinates = {
      groupId: sdlcOrigin.group,
      artifactId: sdlcOrigin.artifact,
      versionId: sdlcOrigin.version,
    };

    const { groupId, artifactId, versionId } = gavCoordinates;
    const storeProject = StoreProjectData.serialization.fromJson(
      await depotServerClient.getProject(groupId, artifactId),
    );
    const files = (
      await depotServerClient.getGenerationFilesByType(
        storeProject,
        resolveVersion(versionId),
        V1_DATA_PRODUCT_ELEMENT_PROTOCOL_TYPE,
      )
    ).map((rawFile) => StoredFileGeneration.serialization.fromJson(rawFile));
    const fileGen = guaranteeNonNullable(
      files.find((e) => e.path === dpDetails.fullPath)?.file.content,
      `No data product artifact found at path '${dpDetails.fullPath}' for project '${groupId}:${artifactId}:${versionId}'`,
    );
    const rawArtifactJson = JSON.parse(fileGen) as PlainObject;
    const artifact =
      V1_DataProductArtifact.serialization.fromJson(rawArtifactJson);

    const v1DataProduct = isLegacyArtifact(artifact, apg.accessPointGroupId)
      ? await getDataProductFromDetails(
          dpDetails,
          (await getGraphManager()) as V1_PureGraphManager,
          depotServerClient,
        )
      : undefined;

    return await runMissingIngestsCheck(
      {
        accessPointGroupId: apg.accessPointGroupId,
        deploymentId: apg.deploymentId,
        dataProductName: apg.dataProductName,
        gavCoordinates,
        artifact,
        v1DataProduct,
      },
      {
        lakehouseIngestServerClient,
        lakehousePlatformServerClient,
        plugins,
        getGraphManager,
      },
      token,
    );
  } catch (error) {
    assertErrorThrown(error);
    return [];
  }
}

/**
 * Resolves a data contract id to the `APGCoordinates` it targets, or
 * `undefined` if the contract does not target an access point group (or any
 * step throws).
 */
export async function getContractAPGCoordinates(
  contractId: string,
  contractClient: LakehouseContractServerClient,
  plugins: PureProtocolProcessorPlugin[],
  token: string | undefined,
): Promise<APGCoordinates | undefined> {
  try {
    const rawContractResponse = await contractClient.getDataContract(
      contractId,
      false,
      token,
    );
    const dataContract = guaranteeNonNullable(
      V1_deserializeDataContractResponse(rawContractResponse, plugins)[0]
        ?.dataContract,
      `No data contract found for id '${contractId}'`,
    );
    const liteContract =
      V1_transformDataContractToLiteDatacontract(dataContract);
    if (
      liteContract.resourceType !== V1_ResourceType.ACCESS_POINT_GROUP ||
      !liteContract.accessPointGroup
    ) {
      return undefined;
    }
    return {
      deploymentId: liteContract.deploymentId,
      dataProductName: liteContract.resourceId,
      accessPointGroupId: liteContract.accessPointGroup,
    };
  } catch (error) {
    assertErrorThrown(error);
    return undefined;
  }
}
