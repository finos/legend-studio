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

import type { V1_PersistenceContext } from '../../../model/packageableElements/persistence/V1_DSLPersistence_PersistenceContext.js';
import type { V1_PersistencePlatform } from '../../../model/packageableElements/persistence/V1_DSLPersistence_PersistencePlatform.js';
import {
  V1_ConnectionValue,
  V1_PrimitiveTypeValue,
  type V1_ServiceParameter,
  type V1_ServiceParameterValue,
} from '../../../model/packageableElements/persistence/V1_DSLPersistence_ServiceParameter.js';
import type { Persistence } from '../../../../../../metamodels/pure/model/packageableElements/persistence/DSLPersistence_Persistence.js';
import { PersistencePlatform } from '../../../../../../metamodels/pure/model/packageableElements/persistence/DSLPersistence_PersistencePlatform.js';
import {
  ConnectionValue,
  PrimitiveTypeValue,
  ServiceParameter,
  type ServiceParameterValue,
} from '../../../../../../metamodels/pure/model/packageableElements/persistence/DSLPersistence_ServiceParameter.js';
import { getOwnPersistenceContext } from '../../../../../../../graphManager/DSLPersistence_GraphManagerHelper.js';
import {
  type PackageableElementImplicitReference,
  V1_buildFullPath,
  V1_buildValueSpecification,
  type V1_GraphBuilderContext,
  V1_ProtocolToMetaModelConnectionBuilder,
} from '@finos/legend-graph';
import { UnsupportedOperationError } from '@finos/legend-shared';

/**********
 * persistence platform
 **********/

export const V1_buildPersistencePlatform = (
  protocol: V1_PersistencePlatform,
  context: V1_GraphBuilderContext,
): PersistencePlatform => new PersistencePlatform();

/**********
 * service parameter
 **********/

export const V1_buildServiceParameterValue = (
  protocol: V1_ServiceParameterValue,
  context: V1_GraphBuilderContext,
): ServiceParameterValue => {
  if (protocol instanceof V1_PrimitiveTypeValue) {
    const serviceParameterValue = new PrimitiveTypeValue();
    serviceParameterValue.primitiveType = V1_buildValueSpecification(
      protocol.primitiveType,
      context,
    );
    return serviceParameterValue;
  } else if (protocol instanceof V1_ConnectionValue) {
    const serviceParameterValue = new ConnectionValue();
    serviceParameterValue.connection =
      protocol.connection.accept_ConnectionVisitor(
        new V1_ProtocolToMetaModelConnectionBuilder(context),
      );
    return serviceParameterValue;
  }
  throw new UnsupportedOperationError(
    `Can't build service parameter value`,
    protocol,
  );
};

export const V1_buildServiceParameter = (
  protocol: V1_ServiceParameter,
  context: V1_GraphBuilderContext,
): ServiceParameter => {
  const serviceParameter = new ServiceParameter();
  serviceParameter.name = protocol.name;
  serviceParameter.value = V1_buildServiceParameterValue(
    protocol.value,
    context,
  );
  return serviceParameter;
};

/**********
 * persistence context
 **********/

export const V1_buildPersistenceContext = (
  protocol: V1_PersistenceContext,
  context: V1_GraphBuilderContext,
): void => {
  const path = V1_buildFullPath(protocol.package, protocol.name);
  const persistenceContext = getOwnPersistenceContext(
    path,
    context.currentSubGraph,
  );
  persistenceContext.persistence = context.resolveElement(
    protocol.persistence,
    false,
  ) as PackageableElementImplicitReference<Persistence>;
  persistenceContext.platform = V1_buildPersistencePlatform(protocol, context);
  persistenceContext.serviceParameters = protocol.serviceParameters.map((sp) =>
    V1_buildServiceParameter(sp, context),
  );
  if (protocol.sinkConnection) {
    persistenceContext.sinkConnection =
      protocol.sinkConnection.accept_ConnectionVisitor(
        new V1_ProtocolToMetaModelConnectionBuilder(context),
      );
  }
};
