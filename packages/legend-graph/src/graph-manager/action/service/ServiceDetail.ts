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
  SerializationFactory,
  UnsupportedOperationError,
  isString,
  optionalCustom,
  type PlainObject,
} from '@finos/legend-shared';
import {
  createModelSchema,
  deserialize,
  list,
  optional,
  primitive,
} from 'serializr';

export enum ServiceOwnershipType {
  DEPLOYMENT_OWNERSHIP = 'deploymentOwnership',
  USER_LIST_OWNERSHIP = 'userListOwnership',
}

export abstract class ServiceOwnershipDetail {
  abstract readonly _type: ServiceOwnershipType;
}

export class UserListOwnershipDetail extends ServiceOwnershipDetail {
  override readonly _type = ServiceOwnershipType.USER_LIST_OWNERSHIP;
  users: string[] = [];
}

export class DeploymentOwnershipDetail extends ServiceOwnershipDetail {
  override readonly _type = ServiceOwnershipType.DEPLOYMENT_OWNERSHIP;
  identifier!: string;
}

const userListOwnershipDetailSchema = createModelSchema(
  UserListOwnershipDetail,
  {
    _type: primitive(),
    users: list(primitive()),
  },
);

const deploymentOwnershipDetailSchema = createModelSchema(
  DeploymentOwnershipDetail,
  {
    _type: primitive(),
    identifier: primitive(),
  },
);

const deserializeServiceOwnershipDetail = (
  json: PlainObject<ServiceOwnershipDetail>,
): ServiceOwnershipDetail => {
  switch (json._type) {
    case ServiceOwnershipType.DEPLOYMENT_OWNERSHIP:
      return deserialize(deploymentOwnershipDetailSchema, json);
    case ServiceOwnershipType.USER_LIST_OWNERSHIP:
      return deserialize(userListOwnershipDetailSchema, json);
    default:
      throw new UnsupportedOperationError(
        `Can't deserialize service ownership detail of type '${isString(json._type) ? json._type : 'unknown'}'`,
      );
  }
};

/**
 * Lightweight representation of a service returned by the
 * engine `/service/list/detailsFromCache` endpoint.
 *
 * Only the fields consumed by the marketplace UI are modelled here
 * to avoid coupling to the full protocol model.
 */
export class ServiceDetail {
  name!: string;
  title: string | undefined;
  pattern!: string;
  documentation!: string;
  ownership: ServiceOwnershipDetail | undefined;

  private static readonly _schema = createModelSchema(ServiceDetail, {
    name: primitive(),
    title: optional(primitive()),
    pattern: primitive(),
    documentation: primitive(),
    ownership: optionalCustom(
      () => {
        throw new UnsupportedOperationError(
          'Serialization of ServiceOwnershipDetail is not supported',
        );
      },
      (val) => deserializeServiceOwnershipDetail(val),
    ),
  });

  static readonly serialization = new SerializationFactory(
    ServiceDetail._schema,
  );

  /**
   * Deserialize a plain JSON object into a ServiceDetail, normalizing
   * the legacy `owners: string[]` field into a `UserListOwnershipDetail`
   * when no structured `ownership` is present.
   */
  static fromJson(json: PlainObject<ServiceDetail>): ServiceDetail {
    const detail = ServiceDetail.serialization.fromJson(json);
    if (
      !detail.ownership &&
      Array.isArray(json.owners) &&
      json.owners.length > 0
    ) {
      const userList = new UserListOwnershipDetail();
      userList.users = json.owners.filter(isString);
      detail.ownership = userList;
    }
    return detail;
  }
}
