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
  RestDeploymentOwnership,
  RestUserListOwnership,
  type RestServiceOwnership,
} from '../../../../../../../graph/metamodel/pure/packageableElements/function/RestServiceOwnership.js';
import {
  V1_UserListOwnership,
  V1_DeploymentOwnership,
  type V1_RestServiceOwnership,
} from '../../../model/packageableElements/function/V1_RestServiceOwnership.js';
import { UnsupportedOperationError } from '@finos/legend-shared';

const transformDeploymentOwnership = (
  element: RestDeploymentOwnership,
): V1_DeploymentOwnership => {
  const ownership = new V1_DeploymentOwnership();
  ownership.id = element.id;
  return ownership;
};

const transformUserListOwnership = (
  element: RestUserListOwnership,
): V1_UserListOwnership => {
  const ownership = new V1_UserListOwnership();
  ownership.users = element.users;
  return ownership;
};

export const V1_transformRestServiceOwnership = (
  metamodel: RestServiceOwnership,
): V1_RestServiceOwnership => {
  if (metamodel instanceof RestDeploymentOwnership) {
    return transformDeploymentOwnership(metamodel);
  } else if (metamodel instanceof RestUserListOwnership) {
    return transformUserListOwnership(metamodel);
  }
  throw new UnsupportedOperationError(
    "Can't transform rest service ownership",
    metamodel,
  );
};
