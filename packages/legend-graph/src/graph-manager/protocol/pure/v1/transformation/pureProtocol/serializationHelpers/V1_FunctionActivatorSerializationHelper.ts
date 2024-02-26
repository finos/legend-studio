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
  usingConstantValueSchema,
  usingModelSchema,
  type PlainObject,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import { V1_SnowflakeAppDeploymentConfiguration } from '../../../engine/functionActivator/V1_SnowflakeAppDeploymentConfiguration.js';
import {
  createModelSchema,
  deserialize,
  list,
  primitive,
  serialize,
} from 'serializr';
import { V1_connectionPointerModelSchema } from './V1_ConnectionSerializationHelper.js';
import {
  V1_DeploymentOwner,
  V1_UserList,
  type V1_Ownership,
} from '../../../model/packageableElements/function/V1_Ownership.js';
import { V1_HostedServiceDeploymentConfiguration } from '../../../engine/functionActivator/V1_HostedServiceDeploymentConfiguration.js';

const V1_SNOWFLAKE_APP_DEPLOYMENT_CONFIGURATION_APP_TYPE =
  'snowflakeDeploymentConfiguration';
const V1_HOSTED_SERVICE_DEPLOYMENT_CONFIGURATION_APP_TYPE =
  'hostedServiceDeploymentConfiguration';

export const V1_SnowflakeAppDeploymentConfigurationAppModelSchema =
  createModelSchema(V1_SnowflakeAppDeploymentConfiguration, {
    _type: usingConstantValueSchema(
      V1_SNOWFLAKE_APP_DEPLOYMENT_CONFIGURATION_APP_TYPE,
    ),
    activationConnection: usingModelSchema(V1_connectionPointerModelSchema),
  });

export const V1_HostedServiceDeploymentConfigurationAppModelSchema =
  createModelSchema(V1_HostedServiceDeploymentConfiguration, {
    _type: usingConstantValueSchema(
      V1_HOSTED_SERVICE_DEPLOYMENT_CONFIGURATION_APP_TYPE,
    ),
    host: primitive(),
    port: primitive(),
    path: primitive(),
  });

enum V1_OwnershipType {
  DEPLOYMENT_OWNERSHIP = 'DeploymentOwner',
  USERLIST_OWNERSHIP = 'userList',
}

const deploymentOwnershipSchema = createModelSchema(V1_DeploymentOwner, {
  _type: usingConstantValueSchema(V1_OwnershipType.DEPLOYMENT_OWNERSHIP),
  id: primitive(),
});

const userListOwnershipSchema = createModelSchema(V1_UserList, {
  _type: usingConstantValueSchema(V1_OwnershipType.USERLIST_OWNERSHIP),
  users: list(primitive()),
});

export const V1_deserializeDeploymentOwnership = (
  json: PlainObject<V1_DeploymentOwner>,
): V1_DeploymentOwner => deserialize(deploymentOwnershipSchema, json);

export const V1_serializeDeploymentOwership = (
  protocol: V1_DeploymentOwner,
): PlainObject<V1_DeploymentOwner> =>
  serialize(deploymentOwnershipSchema, protocol);

export const V1_serializeOwnership = (
  protocol: V1_Ownership,
): PlainObject<V1_Ownership> => {
  if (protocol instanceof V1_DeploymentOwner) {
    return serialize(deploymentOwnershipSchema, protocol);
  } else if (protocol instanceof V1_UserList) {
    return serialize(userListOwnershipSchema, protocol);
  }
  throw new UnsupportedOperationError(
    `Can't serialize function activator ownership`,
    protocol,
  );
};

export const V1_deserializeOwnership = (
  json: PlainObject<V1_Ownership>,
): V1_Ownership => {
  switch (json._type) {
    case V1_OwnershipType.DEPLOYMENT_OWNERSHIP:
      return deserialize(deploymentOwnershipSchema, json);
    case V1_OwnershipType.USERLIST_OWNERSHIP:
      return deserialize(userListOwnershipSchema, json);
    default:
      throw new UnsupportedOperationError(
        `Can't deserialize rest service ownership of type '${json._type}'`,
      );
  }
};
