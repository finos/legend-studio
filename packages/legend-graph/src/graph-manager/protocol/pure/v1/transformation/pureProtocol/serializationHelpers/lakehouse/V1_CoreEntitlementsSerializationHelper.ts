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
  customListWithSchema,
  UnsupportedOperationError,
  usingConstantValueSchema,
  type PlainObject,
} from '@finos/legend-shared';
import {
  createModelSchema,
  deserialize,
  primitive,
  raw,
  serialize,
} from 'serializr';
import {
  type V1_OrganizationalScope,
  V1_AdhocTeam,
  V1_AppDirNode,
  V1_PaginationMetadataRecord,
  V1_ProducerScope,
  V1_UnknownOrganizationalScopeType,
  V1_User,
} from '../../../../lakehouse/entitlements/V1_CoreEntitlements.js';
import type { PureProtocolProcessorPlugin } from '../../../../../PureProtocolProcessorPlugin.js';
import type { DSL_Lakehouse_PureProtocolProcessorPlugin_Extension } from '../../../../../extensions/DSL_Lakehouse_PureProtocolProcessorPlugin_Extension.js';

export enum V1_OrganizationalScopeType {
  AdHocTeam = 'AdHocTeam',
  Producer = 'Producer',
}

export const V1_UserModelSchema = createModelSchema(V1_User, {
  name: primitive(),
  userType: primitive(),
});

export const V1_AppDirNodeModelSchema = createModelSchema(V1_AppDirNode, {
  appDirId: primitive(),
  level: primitive(),
});

export const V1_paginationMetadataRecordModelSchema = createModelSchema(
  V1_PaginationMetadataRecord,
  {
    hasNextPage: primitive(),
    lastValuesMap: raw(),
    size: primitive(),
  },
);

export const V1_AdhocTeamModelSchema = createModelSchema(V1_AdhocTeam, {
  _type: usingConstantValueSchema(V1_OrganizationalScopeType.AdHocTeam),
  users: customListWithSchema(V1_UserModelSchema),
});

export const V1_ProducerScopeModelSchema = createModelSchema(V1_ProducerScope, {
  _type: usingConstantValueSchema(V1_OrganizationalScopeType.Producer),
  did: primitive(),
});

export const V1_deserializeOrganizationalScope = (
  json: PlainObject<V1_OrganizationalScope>,
  plugins: PureProtocolProcessorPlugin[],
): V1_OrganizationalScope => {
  switch (json._type) {
    case V1_OrganizationalScopeType.AdHocTeam:
      return deserialize(V1_AdhocTeamModelSchema, json);
    case V1_OrganizationalScopeType.Producer:
      return deserialize(V1_ProducerScopeModelSchema, json);
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

export const V1_serializeOrganizationalScope = (
  organizationalScope: V1_OrganizationalScope,
  plugins: PureProtocolProcessorPlugin[],
): PlainObject<V1_OrganizationalScope> => {
  if (organizationalScope instanceof V1_AdhocTeam) {
    return serialize(V1_AdhocTeamModelSchema, organizationalScope);
  }
  if (organizationalScope instanceof V1_ProducerScope) {
    return serialize(V1_ProducerScopeModelSchema, organizationalScope);
  }
  const extraOrganizationalScopeSerializers = plugins.flatMap(
    (plugin) =>
      (
        plugin as DSL_Lakehouse_PureProtocolProcessorPlugin_Extension
      ).V1_getExtraOrganizationalScopeSerializers?.() ?? [],
  );
  for (const serializer of extraOrganizationalScopeSerializers) {
    const result = serializer(organizationalScope);
    if (result) {
      return result;
    }
  }
  throw new UnsupportedOperationError(
    `Can't serialize unsupported organizational scope type: ${organizationalScope.constructor.name}`,
  );
};
