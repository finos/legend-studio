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

export const getIngestUrnEnvSegment = (
  classification: V1_IngestEnvironmentClassification,
): string => CLASSIFICATION_TO_URN_ENV[classification];

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

/**
 * Build the (best-guess) ingest definition URN for a single artifact dataset.
 * Returns the first candidate URN produced by {@link buildCandidateIngestUrns};
 * for an alloy-git deployed data product (SDLC origin with GAV coordinates) that
 * is the canonical alloy-git URN, otherwise it falls back to the rest-api URN
 * derived from the producer (AppDir or Kerberos).
 */
export const buildIngestDefinitionUrnFromDataset = (
  dataset: V1_Dataset,
  classification: V1_IngestEnvironmentClassification,
  gavCoordinates: ProjectGAVCoordinates | undefined,
  deploymentId: number,
): string | undefined => {
  const path = dataset.ingestDefinition.path;
  const splitIdx = path.lastIndexOf(ELEMENT_PATH_DELIMITER);
  if (splitIdx === -1) {
    return undefined;
  }
  const pkg = path.substring(0, splitIdx);
  const name = path.substring(splitIdx + ELEMENT_PATH_DELIMITER.length);
  const datasetTail = `${pkg}${ELEMENT_PATH_DELIMITER}${name}`;
  const producer = dataset.ingestDefinition.producer;
  const datasetInfo: LakehouseIngestDatasetInfo = {
    gavCoordinates: gavCoordinates ?? {
      groupId: '',
      artifactId: '',
      versionId: '',
    },
    deploymentId,
    ingestDefinitionPackage: pkg,
    ingestDefinitionName: name,
    datasetName: dataset.dataset,
    producerType:
      producer instanceof V1_AppDirProducer
        ? V1_ProducerType.APP_DIR
        : V1_ProducerType.KERBEROS,
    appDirId:
      producer instanceof V1_AppDirProducer ? producer.appDirId : undefined,
    kerberos:
      producer instanceof V1_KerberosProducer ? producer.kerberos : undefined,
  };
  return buildCandidateIngestUrns(
    datasetInfo,
    getIngestUrnEnvSegment(classification),
    datasetTail,
  )[0];
};

/**
 * Build the marketplace operations path for inspecting a single ingest
 * definition. Returns a location-relative path (no origin) so callers can
 * resolve it against the current application base address via the navigation
 * service, keeping the link on the same marketplace instance.
 */
export const buildIngestDefinitionOperationsPath = (
  ingestEnvironmentUrn: string,
  ingestDefinitionUrn: string,
  producerUrn: string,
): string =>
  `/operations/ingestEnv/${ingestEnvironmentUrn}/ingestDefinition/${ingestDefinitionUrn}?producerUrn=${encodeURIComponent(producerUrn)}`;

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

export interface APGCoordinates {
  deploymentId: number;
  dataProductName: string;
  accessPointGroupId: string;
}

export interface MissingIngestsClientProvider {
  readonly lakehouseContractServerClient: LakehouseContractServerClient;
  readonly depotServerClient: DepotServerClient;
  readonly lakehouseIngestServerClient: LakehouseIngestServerClient;
  readonly lakehousePlatformServerClient: LakehousePlatformServerClient;
}

export interface ResolvedMissingIngestsContext {
  accessPointGroupId: string;
  deploymentId: number;
  dataProductName: string;
  gavCoordinates: ProjectGAVCoordinates;
  artifact: V1_DataProductArtifact;
  v1DataProduct?: V1_DataProduct | undefined;
}

export interface RunMissingIngestsCheckDeps {
  lakehouseIngestServerClient: LakehouseIngestServerClient;
  lakehousePlatformServerClient: LakehousePlatformServerClient;
  plugins: PureProtocolProcessorPlugin[];
  getGraphManager?: () => Promise<AbstractPureGraphManager>;
}

export async function runMissingIngestsCheckForArtifact(
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

    return await runMissingIngestsCheckForArtifact(
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
