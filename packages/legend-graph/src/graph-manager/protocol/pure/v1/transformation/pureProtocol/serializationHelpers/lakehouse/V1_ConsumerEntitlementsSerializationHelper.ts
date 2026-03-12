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
  customListWithSchema,
  optionalCustomListWithSchema,
  usingConstantValueSchema,
  usingModelSchema,
  type PlainObject,
} from '@finos/legend-shared';
import {
  createModelSchema,
  custom,
  deserialize,
  list,
  optional,
  primitive,
  raw,
  serialize,
} from 'serializr';
import {
  type V1_ContractUserEventPayload,
  V1_ContractEventPayloadType,
  V1_ContractUserEventDataProducerPayload,
  V1_ContractUserEventPrivilegeManagerPayload,
  V1_ContractUserEventRecord,
  V1_CreateContractPayload,
  V1_DataContract,
  V1_DataContractSubscriptions,
  V1_DataContractsResponse,
  V1_PendingTasksResponse,
  V1_TaskMetadata,
  V1_TaskResponse,
  V1_TaskStatusChangeResponse,
  V1_ContractUserStatusResponse,
  V1_LiteDataContractsResponse,
  V1_LiteDataContract,
  V1_DataContractApprovedUsersResponse,
  V1_TerminalOrderItem,
  V1_TerminalProvisionPayload,
  V1_LiteDataContractWithUserStatus,
  V1_LiteDataContractsPaginatedResponse,
} from '../../../../lakehouse/entitlements/V1_ConsumerEntitlements.js';
import type { PureProtocolProcessorPlugin } from '../../../../../PureProtocolProcessorPlugin.js';
import {
  V1_UserModelSchema,
  V1_paginationMetadataRecordModelSchema,
  V1_serializeOrganizationalScope,
  V1_deserializeOrganizationalScope,
  V1_contractUserMembershipModelSchema,
  V1_deseralizeConsumerEntitlementResource,
  V1_seralizeConsumerEntitlementResource,
} from './V1_CoreEntitlementsSerializationHelper.js';
import { V1_EntitlementsDataProductModelSchema } from './V1_EntitlementsDataProductSerializationHelper.js';
import { V1_pendingTaskWithAssigneesModelSchema } from './V1_EntitlementsTasksSerializationHelper.js';
import { V1_dataSubscriptionModelSchema } from './V1_SubscriptionSerializationHelper.js';
import {
  V1_AccessPointGroupReference,
  V1_DataBundle,
} from '../../../../lakehouse/entitlements/V1_CoreEntitlements.js';

export enum V1_AccessPointGroupReferenceType {
  AccessPointGroupReference = 'AccessPointGroupReference',
}

export const V1_AccessPointGroupReferenceModelSchema = createModelSchema(
  V1_AccessPointGroupReference,
  {
    _type: usingConstantValueSchema(
      V1_AccessPointGroupReferenceType.AccessPointGroupReference,
    ),
    dataProduct: usingModelSchema(V1_EntitlementsDataProductModelSchema),
    accessPointGroup: primitive(),
  },
);

export const V1_DataBundleModelSchema = createModelSchema(V1_DataBundle, {
  content: raw(),
});

export const V1_dataContractModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
) =>
  createModelSchema(V1_DataContract, {
    description: primitive(),
    guid: primitive(),
    version: primitive(),
    state: primitive(),
    resource: custom(
      V1_seralizeConsumerEntitlementResource,
      V1_deseralizeConsumerEntitlementResource,
    ),
    members: optional(
      list(usingModelSchema(V1_contractUserMembershipModelSchema)),
    ),
    consumer: custom(
      (val) => V1_serializeOrganizationalScope(val, plugins),
      (val) => V1_deserializeOrganizationalScope(val, plugins),
    ),
    createdBy: primitive(),
    createdAt: primitive(),
  });

export const V1_dataContractSubscriptionsModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
) =>
  createModelSchema(V1_DataContractSubscriptions, {
    dataContract: usingModelSchema(V1_dataContractModelSchema(plugins)),
    subscriptions: optional(
      list(usingModelSchema(V1_dataSubscriptionModelSchema)),
    ),
  });

export const V1_liteDataContractModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
) =>
  createModelSchema(V1_LiteDataContract, {
    description: primitive(),
    guid: primitive(),
    version: primitive(),
    state: primitive(),
    members: optional(
      list(usingModelSchema(V1_contractUserMembershipModelSchema)),
    ),
    consumer: custom(
      (val) => V1_serializeOrganizationalScope(val, plugins),
      (val) => V1_deserializeOrganizationalScope(val, plugins),
    ),
    createdAt: primitive(),
    createdBy: primitive(),
    resourceId: primitive(),
    resourceType: primitive(),
    deploymentId: primitive(),
    accessPointGroup: optional(primitive()),
  });

export const V1_dataContractsResponseModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
) =>
  createModelSchema(V1_DataContractsResponse, {
    dataContracts: optional(
      customListWithSchema(V1_dataContractSubscriptionsModelSchema(plugins)),
    ),
    subscriptions: optional(
      customListWithSchema(V1_dataSubscriptionModelSchema),
    ),
  });

const V1_liteDataContractsResponseModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
) =>
  createModelSchema(V1_LiteDataContractsResponse, {
    dataContracts: optional(
      customListWithSchema(V1_liteDataContractModelSchema(plugins)),
    ),
  });

export const V1_liteDataContractsPaginatedResponseModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
) =>
  createModelSchema(V1_LiteDataContractsPaginatedResponse, {
    liteDataContractsResponse: usingModelSchema(
      V1_liteDataContractsResponseModelSchema(plugins),
    ),
    paginationMetadataRecord: usingModelSchema(
      V1_paginationMetadataRecordModelSchema,
    ),
  });

export const V1_liteDataContractWithUserStatusModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
) =>
  createModelSchema(V1_LiteDataContractWithUserStatus, {
    contractResultLite: usingModelSchema(
      V1_liteDataContractModelSchema(plugins),
    ),
    status: primitive(),
    pendingTaskWithAssignees: optional(
      usingModelSchema(V1_pendingTaskWithAssigneesModelSchema),
    ),
    user: primitive(),
  });

export const V1_contractUserEventPrivilegeManagerPayloadModelSchema =
  createModelSchema(V1_ContractUserEventPrivilegeManagerPayload, {
    type: primitive(),
    managerIdentity: primitive(),
    candidateIdentity: primitive(),
    taskId: primitive(),
    eventTimestamp: primitive(),
  });

export const V1_contractUserEventDataProducerPayloadModelSchema =
  createModelSchema(V1_ContractUserEventDataProducerPayload, {
    type: primitive(),
    dataProducerIdentity: primitive(),
    candidateIdentity: primitive(),
    taskId: primitive(),
    eventTimestamp: primitive(),
  });

const V1_deserializeContractUserEventPayload = (
  json: PlainObject<V1_ContractUserEventPayload>,
): V1_ContractUserEventPayload => {
  if (
    [
      V1_ContractEventPayloadType.DATA_PRODUCER_APPROVED,
      V1_ContractEventPayloadType.DATA_PRODUCER_REJECTED,
    ].includes((json as unknown as V1_ContractUserEventPayload).type)
  ) {
    return deserialize(
      V1_contractUserEventDataProducerPayloadModelSchema,
      json,
    );
  } else {
    return deserialize(
      V1_contractUserEventPrivilegeManagerPayloadModelSchema,
      json,
    );
  }
};

const V1_serializeContractUserEventPayload = (
  payload: V1_ContractUserEventPayload,
): PlainObject<V1_ContractUserEventPayload> => {
  if (payload instanceof V1_ContractUserEventDataProducerPayload) {
    return serialize(
      V1_contractUserEventDataProducerPayloadModelSchema,
      payload,
    );
  } else {
    return serialize(
      V1_contractUserEventPrivilegeManagerPayloadModelSchema,
      payload,
    );
  }
};

export const V1_contractUserEventRecordModelSchema = createModelSchema(
  V1_ContractUserEventRecord,
  {
    taskId: primitive(),
    dataContractId: primitive(),
    status: primitive(),
    consumer: primitive(),
    eventPayload: custom(
      V1_serializeContractUserEventPayload,
      V1_deserializeContractUserEventPayload,
    ),
    type: primitive(),
    effectiveFrom: primitive(),
    effectiveTo: primitive(),
    isEscalated: primitive(),
  },
);
export const V1_taskMetadataModelSchema = createModelSchema(V1_TaskMetadata, {
  rec: usingModelSchema(V1_contractUserEventRecordModelSchema),
  assignees: list(primitive()),
});

export const V1_taskResponseModelSchema = createModelSchema(V1_TaskResponse, {
  tasks: customListWithSchema(V1_taskMetadataModelSchema),
});

export const V1_pendingTasksResponseModelSchema = createModelSchema(
  V1_PendingTasksResponse,
  {
    privilegeManager: customListWithSchema(
      V1_contractUserEventRecordModelSchema,
    ),
    dataOwner: customListWithSchema(V1_contractUserEventRecordModelSchema),
  },
);

export const V1_TaskStatusChangeResponseModelSchema = createModelSchema(
  V1_TaskStatusChangeResponse,
  {
    status: primitive(),
    errorType: primitive(),
    errorMessage: primitive(),
  },
);

export const V1_deserializeDataContractResponse = (
  json: PlainObject<V1_DataContractsResponse>,
  plugins: PureProtocolProcessorPlugin[],
): V1_DataContractSubscriptions[] => {
  const contracts = deserialize(
    V1_dataContractsResponseModelSchema(plugins),
    json,
  );
  return contracts.dataContracts ?? [];
};

export const V1_deserializeLiteDataContractsPaginatedResponse = (
  json: PlainObject<V1_LiteDataContractsResponse>,
  plugins: PureProtocolProcessorPlugin[],
): V1_LiteDataContractsPaginatedResponse => {
  return deserialize(
    V1_liteDataContractsPaginatedResponseModelSchema(plugins),
    json,
  );
};

export const V1_liteDataContractsResponseModelSchemaToContracts = (
  json: PlainObject<V1_LiteDataContractsResponse>,
  plugins: PureProtocolProcessorPlugin[],
): V1_LiteDataContract[] => {
  const contracts = deserialize(
    V1_liteDataContractsResponseModelSchema(plugins),
    json,
  );
  return contracts.dataContracts ?? [];
};

export const V1_deserializeTaskResponse = (
  json: PlainObject<V1_TaskResponse>,
): V1_TaskMetadata[] => {
  return deserialize(V1_taskResponseModelSchema, json).tasks ?? [];
};

export const V1_createContractPayloadModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
) =>
  createModelSchema(V1_CreateContractPayload, {
    description: primitive(),
    resourceId: primitive(),
    resourceType: primitive(),
    deploymentId: primitive(),
    accessPointGroup: optional(primitive()),
    consumer: custom(
      (val) => V1_serializeOrganizationalScope(val, plugins),
      (val) => V1_deserializeOrganizationalScope(val, plugins),
    ),
  });

export const V1_terminalOrderItemModelSchema = createModelSchema(
  V1_TerminalOrderItem,
  {
    providerName: primitive(),
    productName: primitive(),
    category: primitive(),
    price: primitive(),
    id: primitive(),
    perm_id: optional(primitive()),
  },
);

export const V1_serializeOrderItems = (
  val: Record<number, V1_TerminalOrderItem[]>,
): Record<number, PlainObject<V1_TerminalOrderItem>[]> => {
  const result: Record<number, PlainObject<V1_TerminalOrderItem>[]> = {};
  for (const [key, items] of Object.entries(val)) {
    result[Number(key)] = items.map(
      (item: V1_TerminalOrderItem): PlainObject<V1_TerminalOrderItem> =>
        serialize(V1_terminalOrderItemModelSchema, item),
    );
  }
  return result;
};

export const V1_deserializeOrderItems = (
  val: Record<string, PlainObject<V1_TerminalOrderItem>[]>,
): Record<number, V1_TerminalOrderItem[]> => {
  const result: Record<number, V1_TerminalOrderItem[]> = {};
  for (const [key, items] of Object.entries(val)) {
    result[Number(key)] = items.map(
      (item: PlainObject<V1_TerminalOrderItem>): V1_TerminalOrderItem =>
        deserialize(V1_terminalOrderItemModelSchema, item),
    );
  }
  return result;
};

export const V1_terminalProvisionPayloadModelSchema = createModelSchema(
  V1_TerminalProvisionPayload,
  {
    ordered_by: primitive(),
    kerberos: primitive(),
    order_items: custom(V1_serializeOrderItems, V1_deserializeOrderItems),
    business_justification: primitive(),
  },
);

export const V1_serializeTerminalProvisionPayload = (
  payload: V1_TerminalProvisionPayload,
): PlainObject<V1_TerminalProvisionPayload> => {
  return serialize(V1_terminalProvisionPayloadModelSchema, payload);
};

export const V1_deserializeTerminalProvisionPayload = (
  json: PlainObject<V1_TerminalProvisionPayload>,
): V1_TerminalProvisionPayload => {
  return deserialize(V1_terminalProvisionPayloadModelSchema, json);
};

export const V1_ContractUserStatusResponseModelSchema = createModelSchema(
  V1_ContractUserStatusResponse,
  {
    status: primitive(),
  },
);

export const V1_DataContractApprovedUsersResponseModelSchema =
  createModelSchema(V1_DataContractApprovedUsersResponse, {
    approvedUsers: optionalCustomListWithSchema(V1_UserModelSchema),
  });
