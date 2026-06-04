/**
 * Copyright (c) 2020-present, Goldman Sachs
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
  ActionState,
  assertErrorThrown,
  guaranteeNonNullable,
  guaranteeType,
  HttpStatus,
  isNonNullable,
  NetworkClientError,
  type GeneratorFn,
  type PlainObject,
} from '@finos/legend-shared';
import { deserialize } from 'serializr';
import {
  type PureProtocolProcessorPlugin,
  type V1_DataProduct,
  type V1_EnrichedUserApprovalStatus,
  type V1_LiteDataContract,
  type V1_LiteDataContractWithUserStatus,
  type V1_PendingTasksResponse,
  type V1_TaskStatus,
  type V1_ContractUserEventRecord,
  type V1_TaskStatusChangeResponse,
  RawLambda,
  V1_DataProductAccessor,
  V1_deserializeDataContractResponse,
  type V1_DataRequestWithWorkflow,
  V1_entitlementsDataProductDetailsResponseToDataProductDetails,
  V1_IngestDefinitionAccessor,
  V1_LakehouseAccessPoint,
  V1_liteDataContractWithUserStatusModelSchema,
  V1_pendingTasksResponseModelSchema,
  V1_PureGraphManager,
  V1_resolveAccessorsFromRawLambda,
  V1_ResourceType,
  V1_SdlcDeploymentDataProductOrigin,
  V1_TaskStatusChangeResponseModelSchema,
  V1_transformDataContractToLiteDatacontract,
  V1_deserializeDataRequestsWithWorkflowResponse,
  type V1_DataRequestsWithWorkflowResponse,
} from '@finos/legend-graph';
import { DEFAULT_TAB_SIZE } from '@finos/legend-application';
import type { ContractErrorLayer } from '@finos/legend-extension-dsl-data-product';
import {
  makeObservable,
  flow,
  observable,
  flowResult,
  action,
  computed,
} from 'mobx';
import {
  TEST_USER,
  type LakehouseEntitlementsStore,
} from './LakehouseEntitlementsStore.js';
import { getDataProductFromDetails } from '../../../utils/LakehouseUtils.js';

export enum ContractSyncStatus {
  NEVER_SYNCED = 'NEVER_SYNCED',
  NOT_FULLY_SYNCED = 'NOT_FULLY_SYNCED',
}

export type LakehouseContractSyncStatusResponse = {
  status: string;
  unsyncedUsers?: { username: string }[];
  unsyncedAccessPoints?: { accessPointName: string }[];
  unsyncedTargetAccounts?: string[];
};

const collectIngestSpecPathsFromOriginDp = (
  rootDataProduct: V1_DataProduct,
  accessPointGroupId: string,
  graphManager: V1_PureGraphManager,
  plugins: PureProtocolProcessorPlugin[],
): Set<string> => {
  const dpPath = `${rootDataProduct.package}::${rootDataProduct.name}`;
  const targetApg = rootDataProduct.accessPointGroups.find(
    (apg) => apg.id === accessPointGroupId,
  );
  if (!targetApg) {
    throw new Error(
      `Access point group '${accessPointGroupId}' not found in data product '${dpPath}'`,
    );
  }
  const specs = new Set<string>();
  const visited = new Set<string>();
  const worklist: string[] = [accessPointGroupId];

  const collectFromApg = (apgId: string): void => {
    const apg = rootDataProduct.accessPointGroups.find((g) => g.id === apgId);
    if (!apg) {
      return;
    }
    for (const accessPoint of apg.accessPoints) {
      if (!(accessPoint instanceof V1_LakehouseAccessPoint)) {
        continue;
      }
      const visitKey = `${dpPath}::${accessPoint.id}`;
      if (visited.has(visitKey)) {
        continue;
      }
      visited.add(visitKey);

      const rawLambda = new RawLambda(
        accessPoint.func.parameters,
        accessPoint.func.body,
      );
      const accessors =
        V1_resolveAccessorsFromRawLambda(rawLambda, graphManager, plugins) ??
        [];
      for (const accessor of accessors) {
        if (accessor instanceof V1_IngestDefinitionAccessor) {
          const specPath = accessor.path[0];
          if (specPath) {
            specs.add(specPath);
          }
        } else if (accessor instanceof V1_DataProductAccessor) {
          const refDpPath = accessor.path[0];
          const refApId = accessor.path[1];
          if (!refDpPath || !refApId) {
            continue;
          }
          if (refDpPath !== dpPath) {
            continue;
          }
          const refApg = rootDataProduct.accessPointGroups.find((g) =>
            g.accessPoints.some((ap) => ap.id === refApId),
          );
          if (refApg && !worklist.includes(refApg.id)) {
            worklist.push(refApg.id);
          }
        }
      }
    }
  };

  while (worklist.length > 0) {
    const apgId = guaranteeNonNullable(worklist.shift());
    collectFromApg(apgId);
  }

  return specs;
};

export class ContractCreatedByUserDetails {
  readonly contractResultLite: V1_LiteDataContract;
  assignees: Set<string> = new Set();
  members: Map<string, V1_EnrichedUserApprovalStatus> = new Map();

  constructor(contract: V1_LiteDataContract) {
    this.contractResultLite = contract;

    makeObservable(this, {
      assignees: observable,
      members: observable,
      sortedAssigneeIds: computed,
      sortedMemberIds: computed,
      addAssignees: action,
      addMember: action,
    });
  }

  get sortedAssigneeIds(): string[] {
    return Array.from(this.assignees).toSorted();
  }

  get sortedMemberIds(): string[] {
    return Array.from(this.members.keys()).toSorted();
  }

  addAssignees(assignees: string[]): void {
    assignees.forEach((assignee) => this.assignees.add(assignee));
  }

  addMember(id: string, status: V1_EnrichedUserApprovalStatus): void {
    this.members.set(id, status);
  }
}

export class EntitlementsDashboardState {
  readonly lakehouseEntitlementsStore: LakehouseEntitlementsStore;
  pendingTasks: V1_ContractUserEventRecord[] | undefined;
  pendingTaskContractMap: Map<string, V1_LiteDataContract> = new Map();
  allContractsForUser: V1_LiteDataContractWithUserStatus[] | undefined;
  // The contracts createdBy user API returns an entry for each task, not just for each contract.
  // To consolidate this information, we store a map of contract ID to the contract details + the
  // consolidated user information from the tasks.
  allContractsCreatedByUserMap: Map<string, ContractCreatedByUserDetails> =
    new Map();
  dataRequestsCreatedByUser: V1_DataRequestWithWorkflow[] | undefined;
  selectedTaskIds: Set<string> = new Set();

  readonly initializationState = ActionState.create();
  readonly fetchingPendingTasksState = ActionState.create();
  readonly fetchingContractsForUserState = ActionState.create();
  readonly fetchingContractsByUserState = ActionState.create();
  readonly fetchingDataRequestsCreatedByUserState = ActionState.create();
  readonly changingState = ActionState.create();

  constructor(state: LakehouseEntitlementsStore) {
    this.lakehouseEntitlementsStore = state;

    makeObservable(this, {
      pendingTasks: observable,
      allContractsForUser: observable,
      allContractsCreatedByUserMap: observable,
      pendingTaskContractMap: observable,
      selectedTaskIds: observable,
      dataRequestsCreatedByUser: observable,
      pendingTaskContracts: computed,
      allContractsCreatedByUser: computed,
      setSelectedTaskIds: action,
      init: flow,
      approve: flow,
      deny: flow,
      fetchPendingTasks: flow,
      fetchPendingTaskContracts: flow,
      fetchContractsForUser: flow,
      fetchContractsCreatedByUser: flow,
      fetchContractDeploymentEnvironments: flow,
      updateContract: flow,
      fetchDataRequestsCreatedByUser: flow,
    });
  }

  get pendingTaskContracts(): V1_LiteDataContract[] {
    return Array.from(this.pendingTaskContractMap.values());
  }

  get allContractsCreatedByUser(): ContractCreatedByUserDetails[] {
    return Array.from(this.allContractsCreatedByUserMap.values());
  }

  setSelectedTaskIds(ids: Set<string>): void {
    this.selectedTaskIds = ids;
  }

  *init(token: string | undefined): GeneratorFn<void> {
    this.initializationState.inProgress();
    this.setSelectedTaskIds(new Set());
    try {
      this.fetchingPendingTasksState.inProgress();
      this.fetchingContractsForUserState.inProgress();
      this.fetchingContractsByUserState.inProgress();
      this.fetchingDataRequestsCreatedByUserState.inProgress();

      const [
        pendingTasksData,
        contractsForUser,
        contractsCreatedByUserMap,
        dataRequestsCreatedByUser,
      ] = (yield Promise.all([
        (async () => {
          try {
            const tasks = await flowResult(this.fetchPendingTasks(token));
            const taskContractMap = await flowResult(
              this.fetchPendingTaskContracts(token, tasks),
            );
            return { tasks, taskContractMap };
          } catch (error) {
            assertErrorThrown(error);
            this.lakehouseEntitlementsStore.applicationStore.alertUnhandledError(
              error,
            );
            return {
              tasks: [] as V1_ContractUserEventRecord[],
              taskContractMap: new Map<string, V1_LiteDataContract>(),
            };
          }
        })(),
        flowResult(this.fetchContractsForUser(token)),
        flowResult(this.fetchContractsCreatedByUser(token)),
        flowResult(this.fetchDataRequestsCreatedByUser(token)),
      ])) as [
        {
          tasks: V1_ContractUserEventRecord[];
          taskContractMap: Map<string, V1_LiteDataContract>;
        },
        V1_LiteDataContractWithUserStatus[],
        Map<string, ContractCreatedByUserDetails>,
        V1_DataRequestWithWorkflow[],
      ];

      const allContracts: V1_LiteDataContract[] = [
        ...Array.from(pendingTasksData.taskContractMap.values()),
        ...contractsForUser.map((c) => c.contractResultLite),
        ...Array.from(contractsCreatedByUserMap.values()).map(
          (c) => c.contractResultLite,
        ),
      ];
      const envMap = (yield flowResult(
        this.fetchContractDeploymentEnvironments(allContracts, token),
      )) as Map<number, string>;

      const {
        filteredTasks,
        filteredContractsForUser,
        filteredCreatedByUserMap,
      } = this.filterByUserEnvironment(
        pendingTasksData,
        contractsForUser,
        contractsCreatedByUserMap,
        envMap,
      );
      this.pendingTaskContractMap = pendingTasksData.taskContractMap;
      this.pendingTasks = filteredTasks;
      this.allContractsForUser = filteredContractsForUser;
      this.allContractsCreatedByUserMap = filteredCreatedByUserMap;
      this.dataRequestsCreatedByUser = dataRequestsCreatedByUser;

      this.fetchingPendingTasksState.complete();
      this.fetchingContractsForUserState.complete();
      this.fetchingContractsByUserState.complete();
      this.fetchingDataRequestsCreatedByUserState.complete();
    } catch (error) {
      assertErrorThrown(error);
      this.lakehouseEntitlementsStore.applicationStore.alertUnhandledError(
        error,
      );
    } finally {
      this.initializationState.complete();
    }
  }

  *fetchPendingTasks(
    token: string | undefined,
  ): GeneratorFn<V1_ContractUserEventRecord[]> {
    try {
      const rawTasks =
        (yield this.lakehouseEntitlementsStore.marketplaceBaseStore.pendingTasksCache.fetch(
          TEST_USER,
          token,
        )) as PlainObject<V1_PendingTasksResponse>;
      const tasks = deserialize(V1_pendingTasksResponseModelSchema, rawTasks);
      return [...tasks.dataOwner, ...tasks.privilegeManager];
    } catch (error) {
      assertErrorThrown(error);
      this.lakehouseEntitlementsStore.applicationStore.notificationService.notifyError(
        `Error fetching pending tasks: ${error.message}`,
      );
      return [];
    }
  }

  *fetchPendingTaskContracts(
    token: string | undefined,
    pendingTasks: V1_ContractUserEventRecord[],
  ): GeneratorFn<Map<string, V1_LiteDataContract>> {
    const pendingTaskContractIds = Array.from(
      new Set(pendingTasks.map((t) => t.dataContractId)),
    );
    const contractClient =
      this.lakehouseEntitlementsStore.lakehouseContractServerClient;
    const plugins =
      this.lakehouseEntitlementsStore.applicationStore.pluginManager.getPureProtocolProcessorPlugins();
    const pendingTaskContracts = (yield Promise.all(
      pendingTaskContractIds.map(async (contractId) => {
        try {
          const rawContractResponse = await contractClient.getDataContract(
            contractId,
            false,
            token,
          );
          const dataContract = V1_deserializeDataContractResponse(
            rawContractResponse,
            plugins,
          )[0]?.dataContract;
          if (!dataContract) {
            return undefined;
          }
          return V1_transformDataContractToLiteDatacontract(dataContract);
        } catch (error) {
          assertErrorThrown(error);
          return undefined;
        }
      }),
    )) as (V1_LiteDataContract | undefined)[];
    const resultMap = new Map<string, V1_LiteDataContract>();
    pendingTaskContractIds.forEach((contractId, idx) => {
      const contract = pendingTaskContracts[idx];
      if (contract) {
        resultMap.set(contractId, contract);
      }
    });
    return resultMap;
  }

  *fetchContractsForUser(
    token: string | undefined,
  ): GeneratorFn<V1_LiteDataContractWithUserStatus[]> {
    try {
      const rawContracts =
        (yield this.lakehouseEntitlementsStore.lakehouseContractServerClient.getContractsForUser(
          this.lakehouseEntitlementsStore.applicationStore.identityService
            .currentUser,
          token,
        )) as PlainObject<V1_LiteDataContractWithUserStatus>[];
      return rawContracts.map((rawContract) =>
        deserialize(
          V1_liteDataContractWithUserStatusModelSchema(
            this.lakehouseEntitlementsStore.applicationStore.pluginManager.getPureProtocolProcessorPlugins(),
          ),
          rawContract,
        ),
      );
    } catch (error) {
      assertErrorThrown(error);
      this.lakehouseEntitlementsStore.applicationStore.notificationService.notifyError(
        `Error fetching data contracts for user: ${error.message}`,
      );
      return [];
    }
  }

  *fetchContractsCreatedByUser(
    token: string | undefined,
  ): GeneratorFn<Map<string, ContractCreatedByUserDetails>> {
    try {
      const rawContracts =
        (yield this.lakehouseEntitlementsStore.lakehouseContractServerClient.getContractsCreatedByUser(
          this.lakehouseEntitlementsStore.applicationStore.identityService
            .currentUser,
          token,
        )) as PlainObject<V1_LiteDataContractWithUserStatus>[];
      const contracts = rawContracts.map((rawContract) =>
        deserialize(
          V1_liteDataContractWithUserStatusModelSchema(
            this.lakehouseEntitlementsStore.applicationStore.pluginManager.getPureProtocolProcessorPlugins(),
          ),
          rawContract,
        ),
      );
      const resultMap = new Map<string, ContractCreatedByUserDetails>();
      contracts.forEach((contract) => {
        if (!resultMap.has(contract.contractResultLite.guid)) {
          resultMap.set(
            contract.contractResultLite.guid,
            new ContractCreatedByUserDetails(contract.contractResultLite),
          );
        }
        const entry = guaranteeNonNullable(
          resultMap.get(contract.contractResultLite.guid),
        );
        entry.addAssignees(contract.pendingTaskWithAssignees?.assignees ?? []);
        entry.addMember(contract.user, contract.status);
      });
      return resultMap;
    } catch (error) {
      assertErrorThrown(error);
      this.lakehouseEntitlementsStore.applicationStore.notificationService.notifyError(
        `Error fetching data contracts created by user: ${error.message}`,
      );
      return new Map();
    }
  }

  *fetchDataRequestsCreatedByUser(
    token: string | undefined,
  ): GeneratorFn<V1_DataRequestWithWorkflow[]> {
    try {
      const raw =
        (yield this.lakehouseEntitlementsStore.lakehouseContractServerClient.getDataAccessRequestsCreatedBy(
          this.lakehouseEntitlementsStore.applicationStore.identityService
            .currentUser,
          token,
        )) as PlainObject<V1_DataRequestsWithWorkflowResponse>;
      return V1_deserializeDataRequestsWithWorkflowResponse(
        raw,
        this.lakehouseEntitlementsStore.applicationStore.pluginManager.getPureProtocolProcessorPlugins(),
      );
    } catch (error) {
      assertErrorThrown(error);
      this.lakehouseEntitlementsStore.applicationStore.notificationService.notifyError(
        `Error fetching data requests created by user: ${error.message}`,
      );
      return [];
    }
  }

  *fetchContractDeploymentEnvironments(
    allContracts: V1_LiteDataContract[],
    token: string | undefined,
  ): GeneratorFn<Map<number, string>> {
    const uniqueDIDToDataProduct = new Map<number, string>();
    for (const contract of allContracts) {
      uniqueDIDToDataProduct.set(contract.deploymentId, contract.resourceId);
    }

    const didToEnvType = new Map<number, string>();
    const contractClient =
      this.lakehouseEntitlementsStore.lakehouseContractServerClient;
    yield Promise.all(
      Array.from(uniqueDIDToDataProduct.entries()).map(
        async ([deploymentId, resourceId]) => {
          try {
            const raw = await contractClient.getDataProductByIdAndDID(
              resourceId,
              deploymentId,
              token,
            );
            const env =
              V1_entitlementsDataProductDetailsResponseToDataProductDetails(
                raw,
              )[0]?.lakehouseEnvironment?.type;
            if (env) {
              didToEnvType.set(deploymentId, env);
            }
          } catch (error) {
            assertErrorThrown(error);
          }
        },
      ),
    );
    return didToEnvType;
  }

  async getUnverifiedIngestDefinitions(
    contractId: string,
    token: string | undefined,
  ): Promise<string[]> {
    const entitlementsStore = this.lakehouseEntitlementsStore;
    const baseStore = entitlementsStore.marketplaceBaseStore;
    const applicationStore = entitlementsStore.applicationStore;
    const plugins =
      applicationStore.pluginManager.getPureProtocolProcessorPlugins();
    const contractClient = entitlementsStore.lakehouseContractServerClient;

    const PROD_ENV = 'prod';
    const SDLC_DEPLOYMENT = 'alloy-git';

    try {
      const liteContract = await (async () => {
        try {
          const rawContractResponse = await contractClient.getDataContract(
            contractId,
            false,
            token,
          );
          const dataContract = V1_deserializeDataContractResponse(
            rawContractResponse,
            plugins,
          )[0]?.dataContract;
          if (!dataContract) {
            return undefined;
          }
          return V1_transformDataContractToLiteDatacontract(dataContract);
        } catch (error) {
          assertErrorThrown(error);
          return undefined;
        }
      })();
      if (!liteContract) {
        return [];
      }

      const accessPointGroupId =
        liteContract.resourceType === V1_ResourceType.ACCESS_POINT_GROUP
          ? (liteContract.accessPointGroup ?? undefined)
          : undefined;
      if (!accessPointGroupId) {
        return [];
      }

      const dpDetails = await (async () => {
        try {
          const raw = await contractClient.getDataProductByIdAndDID(
            liteContract.resourceId,
            liteContract.deploymentId,
            token,
          );
          return V1_entitlementsDataProductDetailsResponseToDataProductDetails(
            raw,
          )[0];
        } catch (error) {
          assertErrorThrown(error);
          return undefined;
        }
      })();
      if (!dpDetails) {
        return [];
      }

      if (!(dpDetails.origin instanceof V1_SdlcDeploymentDataProductOrigin)) {
        return [];
      }

      const graphManager = new V1_PureGraphManager(
        applicationStore.pluginManager,
        applicationStore.logService,
        baseStore.remoteEngine,
      );
      await graphManager.initialize(
        {
          env: applicationStore.config.env,
          tabSize: DEFAULT_TAB_SIZE,
          clientConfig: {
            baseUrl: applicationStore.config.engineServerUrl,
          },
        },
        { engine: baseStore.remoteEngine },
      );

      const v1DataProduct = await getDataProductFromDetails(
        dpDetails,
        graphManager,
        baseStore,
      );
      if (!v1DataProduct) {
        return [];
      }

      const specs = collectIngestSpecPathsFromOriginDp(
        v1DataProduct,
        accessPointGroupId,
        graphManager,
        plugins,
      );
      if (specs.size === 0) {
        return [];
      }

      const ingestEnvironment =
        await baseStore.lakehouseDataProductService.getOrFetchEnvironmentForDID(
          liteContract.deploymentId,
          token,
        );
      const ingestServerUrl = ingestEnvironment?.ingestServerUrl;
      if (ingestServerUrl === undefined) {
        return [];
      }

      const sdlcOrigin = guaranteeType(
        dpDetails.origin,
        V1_SdlcDeploymentDataProductOrigin,
      );
      const gav = `${sdlcOrigin.group}~${sdlcOrigin.artifact}`;
      const specsToVerify = Array.from(specs, (specPath) => ({
        specPath,
        urn: `urn:lakehouse:${PROD_ENV}:ingest:definition:${SDLC_DEPLOYMENT}:${gav}~${specPath}`,
      }));

      const ingestClient = baseStore.lakehouseIngestServerClient;
      const settled = await Promise.all(
        specsToVerify.map(async (entry) => {
          try {
            await ingestClient.getIngestDefinitionDetail(
              entry.urn,
              ingestServerUrl,
              token,
            );
            return undefined;
          } catch (error) {
            assertErrorThrown(error);
            if (
              error instanceof NetworkClientError &&
              error.response.status === HttpStatus.NOT_FOUND
            ) {
              return entry.specPath;
            }
            return undefined;
          }
        }),
      );
      return settled.filter(isNonNullable);
    } catch (error) {
      assertErrorThrown(error);
      return [];
    }
  }

  async getContractSyncErrors(
    contractId: string,
    token: string | undefined,
  ): Promise<ContractErrorLayer | undefined> {
    try {
      const response =
        (await this.lakehouseEntitlementsStore.lakehouseContractServerClient.getContractSyncStatus(
          contractId,
          token,
        )) as LakehouseContractSyncStatusResponse;

      const status = response.status.toUpperCase();

      if (status === ContractSyncStatus.NEVER_SYNCED) {
        return { title: 'Sync Error: Contract Never Synced' };
      }

      if (status === ContractSyncStatus.NOT_FULLY_SYNCED) {
        const unsyncedUsers =
          response.unsyncedUsers?.map((user) => user.username) ?? [];
        const unsyncedAccessPoints =
          response.unsyncedAccessPoints?.map(
            (accessPoint) => accessPoint.accessPointName,
          ) ?? [];
        const unsyncedTargetAccounts = response.unsyncedTargetAccounts ?? [];

        const syncGroupingLayers: ContractErrorLayer[] = [
          { title: 'Users', errorItems: unsyncedUsers },
          { title: 'Target Accounts', errorItems: unsyncedTargetAccounts },
          { title: 'Access Points', errorItems: unsyncedAccessPoints },
        ].filter((layer) => layer.errorItems.length > 0);

        if (syncGroupingLayers.length === 0) {
          return undefined;
        }

        return {
          title: 'Unsynced Entities',
          childLayers: syncGroupingLayers,
        };
      }

      return undefined;
    } catch (error) {
      assertErrorThrown(error);
      return undefined;
    }
  }

  async getContractErrors(
    contractId: string,
    token: string | undefined,
    checkSyncStatus = false,
  ): Promise<ContractErrorLayer | undefined> {
    const [unverifiedIngestDefinitions, syncErrorsLayer] = await Promise.all([
      this.getUnverifiedIngestDefinitions(contractId, token),
      checkSyncStatus
        ? this.getContractSyncErrors(contractId, token)
        : Promise.resolve(undefined),
    ]);

    const childLayers: ContractErrorLayer[] = [
      unverifiedIngestDefinitions.length > 0
        ? {
            title: `Ingest${unverifiedIngestDefinitions.length === 1 ? '' : 's'} Not Found`,
            errorItems: unverifiedIngestDefinitions,
          }
        : undefined,
      syncErrorsLayer,
    ].filter(isNonNullable);

    return childLayers.length > 0
      ? { title: 'Contract Errors', childLayers }
      : undefined;
  }

  filterByUserEnvironment(
    pendingData: {
      tasks: V1_ContractUserEventRecord[];
      taskContractMap: Map<string, V1_LiteDataContract>;
    },
    contractsForUser: V1_LiteDataContractWithUserStatus[],
    contractsCreatedByUserMap: Map<string, ContractCreatedByUserDetails>,
    envMap: Map<number, string>,
  ): {
    filteredTasks: V1_ContractUserEventRecord[];
    filteredContractsForUser: V1_LiteDataContractWithUserStatus[];
    filteredCreatedByUserMap: Map<string, ContractCreatedByUserDetails>;
  } {
    const userEnv =
      this.lakehouseEntitlementsStore.marketplaceBaseStore.envState
        .lakehouseEnvironment;
    const envMatchesForDeploymentId = (deploymentId: number): boolean => {
      const env = envMap.get(deploymentId);
      return !env || env === userEnv;
    };

    const filteredTasks = pendingData.tasks.filter((task) => {
      const contract = pendingData.taskContractMap.get(task.dataContractId);
      return !contract || envMatchesForDeploymentId(contract.deploymentId);
    });
    const filteredContractsForUser = contractsForUser.filter((c) =>
      envMatchesForDeploymentId(c.contractResultLite.deploymentId),
    );
    const filteredCreatedByUserMap = new Map<
      string,
      ContractCreatedByUserDetails
    >();
    for (const [guid, details] of contractsCreatedByUserMap.entries()) {
      if (envMatchesForDeploymentId(details.contractResultLite.deploymentId)) {
        filteredCreatedByUserMap.set(guid, details);
      }
    }
    return {
      filteredTasks,
      filteredContractsForUser,
      filteredCreatedByUserMap,
    };
  }

  *updateContract(
    contractId: string,
    token: string | undefined,
  ): GeneratorFn<void> {
    const [newUserContracts, newCreatedByUserContracts] = (yield Promise.all([
      (async () => {
        const rawContracts =
          await this.lakehouseEntitlementsStore.lakehouseContractServerClient.getContractsForUser(
            this.lakehouseEntitlementsStore.applicationStore.identityService
              .currentUser,
            token,
          );
        return rawContracts.map((rawContract) =>
          deserialize(
            V1_liteDataContractWithUserStatusModelSchema(
              this.lakehouseEntitlementsStore.applicationStore.pluginManager.getPureProtocolProcessorPlugins(),
            ),
            rawContract,
          ),
        );
      })(),
      (async () => {
        const rawContracts =
          await this.lakehouseEntitlementsStore.lakehouseContractServerClient.getContractsCreatedByUser(
            this.lakehouseEntitlementsStore.applicationStore.identityService
              .currentUser,
            token,
          );
        return rawContracts.map((rawContract) =>
          deserialize(
            V1_liteDataContractWithUserStatusModelSchema(
              this.lakehouseEntitlementsStore.applicationStore.pluginManager.getPureProtocolProcessorPlugins(),
            ),
            rawContract,
          ),
        );
      })(),
    ])) as [
      V1_LiteDataContractWithUserStatus[],
      V1_LiteDataContractWithUserStatus[],
    ];

    // Update the contract for the user
    this.allContractsForUser = this.allContractsForUser
      ?.map((contract) =>
        contract.contractResultLite.guid === contractId
          ? newUserContracts.find(
              (c) => c.contractResultLite.guid === contractId,
            )
          : contract,
      )
      .filter(isNonNullable);

    // Update the contract + all related data for contract created by the user
    this.allContractsCreatedByUserMap.delete(contractId);
    const updatedCreatedByUserContracts = newCreatedByUserContracts.filter(
      (c) => c.contractResultLite.guid === contractId,
    );

    updatedCreatedByUserContracts.forEach((contract) => {
      if (
        !this.allContractsCreatedByUserMap.has(contract.contractResultLite.guid)
      ) {
        this.allContractsCreatedByUserMap.set(
          contract.contractResultLite.guid,
          new ContractCreatedByUserDetails(contract.contractResultLite),
        );
      }
      const entry = guaranteeNonNullable(
        this.allContractsCreatedByUserMap.get(contract.contractResultLite.guid),
      );
      entry.addAssignees(contract.pendingTaskWithAssignees?.assignees ?? []);
      entry.addMember(contract.user, contract.status);
    });
  }

  *approve(
    task: V1_ContractUserEventRecord,
    token: string | undefined,
  ): GeneratorFn<void> {
    try {
      this.changingState.inProgress();
      this.changingState.setMessage('Approving Task');
      const response =
        (yield this.lakehouseEntitlementsStore.lakehouseContractServerClient.approveTask(
          task.taskId,
          token,
        )) as PlainObject<V1_TaskStatusChangeResponse>;
      const change = deserialize(
        V1_TaskStatusChangeResponseModelSchema,
        response,
      );
      if (change.errorMessage) {
        throw new Error(
          `Unable to approve task: ${task.taskId}: ${change.errorMessage}`,
        );
      }
      task.status = change.status;
      this.pendingTasks = [...(this.pendingTasks ?? [])];
      this.lakehouseEntitlementsStore.marketplaceBaseStore.pendingTasksCache.invalidate();
      this.lakehouseEntitlementsStore.applicationStore.notificationService.notifySuccess(
        `Task has been Approved`,
      );
    } finally {
      this.changingState.complete();
      this.changingState.setMessage(undefined);
    }
  }

  *deny(
    task: V1_ContractUserEventRecord,
    token: string | undefined,
  ): GeneratorFn<void> {
    try {
      this.changingState.inProgress();
      this.lakehouseEntitlementsStore.applicationStore.alertService.setBlockingAlert(
        {
          message: 'Denying Task',
          prompt: 'Denying task...',
          showLoading: true,
        },
      );
      const response =
        (yield this.lakehouseEntitlementsStore.lakehouseContractServerClient.denyTask(
          task.taskId,
          token,
        )) as PlainObject<V1_TaskStatus>;
      const change = deserialize(
        V1_TaskStatusChangeResponseModelSchema,
        response,
      );
      if (change.errorMessage) {
        throw new Error(
          `Unable to deny task: ${task.taskId}: ${change.errorMessage}`,
        );
      }
      task.status = change.status;
      this.pendingTasks = [...(this.pendingTasks ?? [])];
      this.lakehouseEntitlementsStore.marketplaceBaseStore.pendingTasksCache.invalidate();
      this.lakehouseEntitlementsStore.applicationStore.notificationService.notifySuccess(
        `Task has been denied`,
      );
    } finally {
      this.changingState.complete();
      this.changingState.setMessage(undefined);
      this.lakehouseEntitlementsStore.applicationStore.alertService.setBlockingAlert(
        undefined,
      );
    }
  }
}
