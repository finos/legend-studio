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
  type Enumeration,
  type LightQuery,
  type PureProtocolProcessorPlugin,
  type V1_PureModelContextData,
  type V1_Variable,
  CORE_PURE_PATH,
  PRIMITIVE_TYPE,
  V1_deserializePackageableElement,
  V1_Enumeration,
  V1_PackageableType,
} from '@finos/legend-graph';
import {
  type DepotServerClient,
  ProjectVersionEntities,
  StoredEntity,
} from '@finos/legend-server-depot';
import {
  type PlainObject,
  assertErrorThrown,
  guaranteeType,
  NetworkClientError,
} from '@finos/legend-shared';

export const isVariableEnumerationType = (variable: V1_Variable) =>
  variable.genericType?.rawType instanceof V1_PackageableType &&
  !Object.values(PRIMITIVE_TYPE)
    .map((type) => type.toString())
    .includes(variable.genericType.rawType.fullPath);

export const fetchV1Enumeration = async (
  enumerationPath: string,
  query: LightQuery,
  systemModel: V1_PureModelContextData,
  depotServerClient: DepotServerClient,
  plugins: PureProtocolProcessorPlugin[],
): Promise<V1_Enumeration> => {
  // First, check if the enumeration exists in the system model
  const systemEnumeration = systemModel.elements.find(
    (element) =>
      element.path === enumerationPath && element instanceof V1_Enumeration,
  );
  if (systemEnumeration) {
    return systemEnumeration as V1_Enumeration;
  }

  // If not in the system model, fetch the enumeration from the depot server
  // First, try fetching it from the project entities. If the enumeration entity
  // does not exist in the project, then try getting it from the project's dependencies.
  try {
    const enumerationElement = (
      await depotServerClient.getVersionEntity(
        query.groupId,
        query.artifactId,
        query.versionId,
        enumerationPath,
      )
    ).content as PlainObject<Enumeration>;
    const enumeration = guaranteeType(
      V1_deserializePackageableElement(enumerationElement, plugins),
      V1_Enumeration,
    );
    return enumeration;
  } catch (error) {
    assertErrorThrown(error);
    if (error instanceof NetworkClientError && error.response.status === 404) {
      const projectEntitiesResponse =
        await depotServerClient.getDependencyEntities(
          query.groupId,
          query.artifactId,
          query.versionId,
          true,
          false,
          CORE_PURE_PATH.ENUMERATION,
        );
      const entities = projectEntitiesResponse
        .map((res) => ProjectVersionEntities.serialization.fromJson(res))
        .flatMap((projectVersionEntities) => projectVersionEntities.entities)
        // When the getDependencyEntities endpoint is provided with a classifierPath, the shape of its response
        // changes, and the entitities property actually contains an array of StoredEntity objects instead of an
        // array of Entity objects, so we need to convert them here.
        .flatMap(
          (entity) =>
            StoredEntity.serialization.fromJson(
              entity as unknown as PlainObject<StoredEntity>,
            ).entity,
        );
      const enumEntity = entities.find(
        (entity) => entity.path === enumerationPath,
      );
      if (enumEntity) {
        return guaranteeType(
          V1_deserializePackageableElement(enumEntity.content, plugins),
          V1_Enumeration,
        );
      } else {
        throw new Error(
          `Unable to find enum ${enumerationPath} in project or its dependencies`,
        );
      }
    } else {
      throw error;
    }
  }
};
