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
  UnsupportedOperationError,
  usingConstantValueSchema,
  usingModelSchema,
  type PlainObject,
} from '@finos/legend-shared';
import {
  type V1_ConsumerEntitlementResource,
  type V1_ContractUserEventPayload,
  V1_AccessPoint_Entitlements,
  V1_AccessPointGroupReference,
  V1_ContractEventPayloadType,
  V1_ContractUserEventDataProducerPayload,
  V1_ContractUserEventPrivilegeManagerPayload,
  V1_ContractUserEventRecord,
  V1_CreateContractPayload,
  V1_DataBundle,
  V1_DataContract,
  V1_DataContractRecord,
  V1_DataContractsRecord,
  V1_DataProduct_Entitlements,
  V1_PendingTasksRespond,
  V1_TaskMetadata,
  V1_TaskResponse,
  V1_TaskStatusChangeResponse,
} from '../../../lakehouse/entitlements/V1_ConsumerEntitlements.js';
import {
  createModelSchema,
  custom,
  deserialize,
  list,
  optional,
  primitive,
  serialize,
  SKIP,
} from 'serializr';
import {
  V1_AdhocTeam,
  V1_AppDirNode,
  V1_UnknownOrganizationalScopeType,
  V1_User,
  type V1_OrganizationalScope,
} from '../../../lakehouse/entitlements/V1_CoreEntitlements.js';
import type { PureProtocolProcessorPlugin } from '../../../../PureProtocolProcessorPlugin.js';
import type { DSL_Lakehouse_PureProtocolProcessorPlugin_Extension } from '../../../../extensions/DSL_Lakehouse_PureProtocolProcessorPlugin_Extension.js';

enum V1_OrganizationalScopeType {
  AdHocTeam = 'AdHocTeam',
}

enum V1_AccessPointGroupReferenceType {
  AccessPointGroupReference = 'AccessPointGroupReference',
}

export const V1_UserModelSchema = createModelSchema(V1_User, {
  name: primitive(),
  userType: primitive(),
});

export const V1_AccessPoint_EntitlementsModelSchema = createModelSchema(
  V1_AccessPoint_Entitlements,
  {
    name: primitive(),
    guid: primitive(),
    groups: list(primitive()),
  },
);

export const V1_AppDirNodeModelSchema = createModelSchema(V1_AppDirNode, {
  appDirId: primitive(),
  level: primitive(),
});

export const V1_DataProduct_EntitlementsModelSchema = createModelSchema(
  V1_DataProduct_Entitlements,
  {
    name: primitive(),
    guid: primitive(),
    accessPoints: customListWithSchema(V1_AccessPoint_EntitlementsModelSchema),
    owner: usingModelSchema(V1_AppDirNodeModelSchema),
  },
);

export const V1_AccessPointGroupReferenceModelSchema = createModelSchema(
  V1_AccessPointGroupReference,
  {
    dataProduct: usingModelSchema(V1_DataProduct_EntitlementsModelSchema),
    accessPointGroup: primitive(),
  },
);

export const V1_AdhocTeamModelSchema = createModelSchema(V1_AdhocTeam, {
  _type: usingConstantValueSchema(V1_OrganizationalScopeType.AdHocTeam),
  users: customListWithSchema(V1_UserModelSchema),
});

const V1_deserializeOrganizationalScope = (
  json: PlainObject<V1_OrganizationalScope>,
  plugins: PureProtocolProcessorPlugin[],
): V1_OrganizationalScope => {
  switch (json._type) {
    case V1_OrganizationalScopeType.AdHocTeam:
      return deserialize(V1_AdhocTeamModelSchema, json);
    default: {
      const extraOrganizationalScopeDeserializers = plugins.flatMap(
        (plugin) =>
          (
            plugin as DSL_Lakehouse_PureProtocolProcessorPlugin_Extension
          ).V1_getExtraOrganizationalScopeDeserializers?.() ?? [],
      );
      for (const deserializer of extraOrganizationalScopeDeserializers) {
        const protocol = deserializer(json);
        if (protocol) {
          return protocol;
        }
      }

      // Fall back to create unknown stub if not supported
      const org = new V1_UnknownOrganizationalScopeType();
      org.content = json;
      return org;
    }
  }
};

const V1_serializeOrganizationalScope = (
  json: V1_OrganizationalScope,
  plugins: PureProtocolProcessorPlugin[],
): PlainObject<V1_OrganizationalScope> => {
  if (json instanceof V1_AdhocTeam) {
    return serialize(V1_AdhocTeamModelSchema, json);
  }
  const extraOrganizationalScopeSerializers = plugins.flatMap(
    (plugin) =>
      (
        plugin as DSL_Lakehouse_PureProtocolProcessorPlugin_Extension
      ).V1_getExtraOrganizationalScopeSerializers?.() ?? [],
  );
  for (const serializer of extraOrganizationalScopeSerializers) {
    const result = serializer(json);
    if (result) {
      return result;
    }
  }
  throw new UnsupportedOperationError();
};

const V1_deseralizeV1_ConsumerEntitlementResource = (
  json: PlainObject<V1_ConsumerEntitlementResource>,
): V1_ConsumerEntitlementResource => {
  switch (json._type) {
    case V1_AccessPointGroupReferenceType.AccessPointGroupReference:
      return deserialize(V1_AccessPointGroupReferenceModelSchema, json);
    default:
      const bundle = new V1_DataBundle();
      bundle.content = json;
      return bundle;
  }
};

export const V1_dataContractModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
) =>
  createModelSchema(V1_DataContract, {
    description: primitive(),
    guid: primitive(),
    version: primitive(),
    state: primitive(),
    resource: custom(() => SKIP, V1_deseralizeV1_ConsumerEntitlementResource),
    // members: V1_ContractUserMembership[] = [];
    consumer: custom(
      (val) => V1_serializeOrganizationalScope(val, plugins),
      (val) => V1_deserializeOrganizationalScope(val, plugins),
    ),
    createdBy: primitive(),
  });

export const V1_DataContractRecordModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
) =>
  createModelSchema(V1_DataContractRecord, {
    dataContract: usingModelSchema(V1_dataContractModelSchema(plugins)),
  });

export const V1_DataContractsRecordModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
) =>
  createModelSchema(V1_DataContractsRecord, {
    dataContracts: optional(
      customListWithSchema(V1_DataContractRecordModelSchema(plugins)),
    ),
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
  },
);
export const V1_taskMetadataModelSchema = createModelSchema(V1_TaskMetadata, {
  rec: usingModelSchema(V1_contractUserEventRecordModelSchema),
  assignees: list(primitive()),
});

export const V1_taskResponseModelSchema = createModelSchema(V1_TaskResponse, {
  tasks: customListWithSchema(V1_taskMetadataModelSchema),
});

export const V1_pendingTasksRespondModelSchema = createModelSchema(
  V1_PendingTasksRespond,
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

export const V1_DataContractsRecordModelSchemaToContracts = (
  json: PlainObject<V1_DataContractsRecord>,
  plugins: PureProtocolProcessorPlugin[],
): V1_DataContract[] => {
  const contracts = deserialize(
    V1_DataContractsRecordModelSchema(plugins),
    json,
  );
  return contracts.dataContracts?.map((e) => e.dataContract) ?? [];
};

export const V1_deserializeTaskResponse = (
  json: PlainObject<V1_TaskMetadata>,
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
