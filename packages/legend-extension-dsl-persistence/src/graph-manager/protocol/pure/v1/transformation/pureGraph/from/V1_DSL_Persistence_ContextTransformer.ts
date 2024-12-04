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

import type { PersistenceContext } from '../../../../../../../graph/metamodel/pure/model/packageableElements/persistence/DSL_Persistence_PersistenceContext.js';
import {
  type PersistencePlatform,
  DefaultPersistencePlatform,
} from '../../../../../../../graph/metamodel/pure/model/packageableElements/persistence/DSL_Persistence_PersistencePlatform.js';
import {
  ConnectionValue,
  PrimitiveTypeValue,
  type ServiceParameter,
  type ServiceParameterValue,
} from '../../../../../../../graph/metamodel/pure/model/packageableElements/persistence/DSL_Persistence_ServiceParameter.js';
import { V1_PersistenceContext } from '../../../model/packageableElements/persistence/V1_DSL_Persistence_PersistenceContext.js';
import {
  V1_DefaultPersistencePlatform,
  type V1_PersistencePlatform,
} from '../../../model/packageableElements/persistence/V1_DSL_Persistence_PersistencePlatform.js';
import {
  V1_ConnectionValue,
  V1_PrimitiveTypeValue,
  V1_ServiceParameter,
  type V1_ServiceParameterValue,
} from '../../../model/packageableElements/persistence/V1_DSL_Persistence_ServiceParameter.js';
import type { DSL_Persistence_PureProtocolProcessorPlugin_Extension } from '../../../../DSL_Persistence_PureProtocolProcessorPlugin_Extension.js';
import {
  type V1_GraphTransformerContext,
  V1_initPackageableElement,
  V1_PackageableElementPointer,
  V1_transformConnection,
  V1_transformRootValueSpecification,
} from '@finos/legend-graph';
import { UnsupportedOperationError } from '@finos/legend-shared';
import { V1_AwsGluePersistencePlatform } from '../../../model/packageableElements/persistence/V1_DSL_Persistence_AwsGluePersistencePlatform.js';
import { AwsGluePersistencePlatform } from '../../../../../../../graph/metamodel/pure/model/packageableElements/persistence/DSL_Persistence_AwsGluePersistencePlatform.js';

/**********
 * persistence platform
 **********/

export const V1_transformPersistencePlatform = (
  element: PersistencePlatform,
  context: V1_GraphTransformerContext,
): V1_PersistencePlatform => {
  if (element instanceof DefaultPersistencePlatform) {
    return new V1_DefaultPersistencePlatform();
  } else if (element instanceof AwsGluePersistencePlatform) {
    const protocol = new V1_AwsGluePersistencePlatform();
    protocol.dataProcessingUnits = element.dataProcessingUnits;
    return protocol;
  }
  const extraPersistencePlatformTransformers = context.plugins.flatMap(
    (plugin) =>
      (
        plugin as DSL_Persistence_PureProtocolProcessorPlugin_Extension
      ).V1_getExtraPersistencePlatformTransformers?.() ?? [],
  );
  for (const transformer of extraPersistencePlatformTransformers) {
    const protocol = transformer(element, context);
    if (protocol) {
      return protocol;
    }
  }
  throw new UnsupportedOperationError(
    `Can't transform persistence platform: no compatible transformer available from plugins`,
    element,
  );
};

/**********
 * service parameter
 **********/

export const V1_transformServiceParameterValue = (
  element: ServiceParameterValue,
  context: V1_GraphTransformerContext,
): V1_ServiceParameterValue => {
  if (element instanceof PrimitiveTypeValue) {
    const protocol = new V1_PrimitiveTypeValue();
    protocol.primitiveType = V1_transformRootValueSpecification(
      element.primitiveType,
    );
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
  protocol.persistence = new V1_PackageableElementPointer(
    'PERSISTENCE',
    element.persistence.valueForSerialization ?? '',
  );
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
