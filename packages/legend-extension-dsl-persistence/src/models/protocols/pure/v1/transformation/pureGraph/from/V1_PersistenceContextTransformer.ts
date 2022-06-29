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

import type { PersistenceContext } from '../../../../../../metamodels/pure/model/packageableElements/persistence/DSLPersistence_PersistenceContext.js';
import type { PersistencePlatform } from '../../../../../../metamodels/pure/model/packageableElements/persistence/DSLPersistence_PersistencePlatform.js';
import {
  ConnectionValue,
  PrimitiveTypeValue,
  type ServiceParameter,
  type ServiceParameterValue,
} from '../../../../../../metamodels/pure/model/packageableElements/persistence/DSLPersistence_ServiceParameter.js';
import { V1_PersistenceContext } from '../../../model/packageableElements/persistence/V1_DSLPersistence_PersistenceContext.js';
import { V1_PersistencePlatform } from '../../../model/packageableElements/persistence/V1_DSLPersistence_PersistencePlatform.js';
import {
  V1_ConnectionValue,
  V1_PrimitiveTypeValue,
  V1_ServiceParameter,
  type V1_ServiceParameterValue,
} from '../../../model/packageableElements/persistence/V1_DSLPersistence_ServiceParameter.js';
import {
  type V1_GraphTransformerContext,
  V1_initPackageableElement,
  V1_transformConnection,
} from '@finos/legend-graph';
import { UnsupportedOperationError } from '@finos/legend-shared';

/**********
 * persistence platform
 **********/

export const V1_transformPersistencePlatform = (
  element: PersistencePlatform,
  context: V1_GraphTransformerContext,
): V1_PersistencePlatform => new V1_PersistencePlatform();

/**********
 * service parameter
 **********/

export const V1_transformServiceParameterValue = (
  element: ServiceParameterValue,
  context: V1_GraphTransformerContext,
): V1_ServiceParameterValue => {
  if (element instanceof PrimitiveTypeValue) {
    const protocol = new V1_PrimitiveTypeValue();
    //TODO: ledav -- transform value specification
    return protocol;
  } else if (element instanceof ConnectionValue) {
    const protocol = new V1_ConnectionValue();
    protocol.connection = V1_transformConnection(
      element.connection,
      true,
      context,
    );
    return protocol;
  }
  throw new UnsupportedOperationError(
    `Can't transform service parameter value '${element}'`,
  );
};

export const V1_transformServiceParameter = (
  element: ServiceParameter,
  context: V1_GraphTransformerContext,
): V1_ServiceParameter => {
  const protocol = new V1_ServiceParameter();
  protocol.name = element.name;
  protocol.value = V1_transformServiceParameterValue(element.value, context);
  return protocol;
};

/**********
 * persistence context
 **********/

export const V1_transformPersistenceContext = (
  element: PersistenceContext,
  context: V1_GraphTransformerContext,
): V1_PersistenceContext => {
  const protocol = new V1_PersistenceContext();
  V1_initPackageableElement(protocol, element);
  protocol.persistence = element.persistence.valueForSerialization ?? '';
  protocol.platform = V1_transformPersistencePlatform(
    element.platform,
    context,
  );
  protocol.serviceParameters = element.serviceParameters.map((sp) =>
    V1_transformServiceParameter(sp, context),
  );
  if (element.sinkConnection) {
    protocol.sinkConnection = V1_transformConnection(
      element.sinkConnection,
      true,
      context,
    );
  }
  return protocol;
};
