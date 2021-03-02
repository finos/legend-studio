/**
 * Copyright 2020 Goldman Sachs
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
  list,
  createModelSchema,
  primitive,
  custom,
  optional,
  SKIP,
  serialize,
  deserialize,
} from 'serializr';
import type { PlainObject } from '@finos/legend-studio-shared';
import {
  usingConstantValueSchema,
  getClass,
  UnsupportedOperationError,
  assertErrorThrown,
  usingModelSchema,
} from '@finos/legend-studio-shared';
import type { Entity } from '../../../../../sdlc/models/entity/Entity';
import { GraphDataParserError } from '../../../../../MetaModelUtility';
import { V1_PureModelContextData } from '../../model/context/V1_PureModelContextData';
import { V1_PureModelContextPointer } from '../../model/context/V1_PureModelContextPointer';
import type { V1_PackageableElement } from '../../model/packageableElements/V1_PackageableElement';
import {
  V1_deserializePackageableElement,
  V1_PackageableElementSerializer,
} from '../../transformation/pureProtocol/V1_PackageableElementSerialization';
import { V1_PureModelContextComposite } from '../../model/context/V1_PureModelContextComposite';
import { V1_Protocol } from '../../model/V1_Protocol';
import { V1_AlloySdlc } from '../../model/context/V1_AlloySdlc';
import type { V1_PureModelContext } from '../../model/context/V1_PureModelContext';
import { V1_packageableElementPointerDeserrializerSchema } from '../../transformation/pureProtocol/serializationHelpers/V1_CoreSerializationHelper';
import type { PureProtocolProcessorPlugin } from '../../../PureProtocolProcessorPlugin';

enum V1_SdlcType {
  ALLOY = 'alloy',
}

export enum V1_PureModelContextType {
  DATA = 'data',
  POINTER = 'pointer',
  COMPOSITE = 'composite',
}

export const V1_entitiesToPureModelContextData = async (
  entities: Entity[] | undefined,
  graph: V1_PureModelContextData,
  plugins: PureProtocolProcessorPlugin[],
): Promise<void> => {
  try {
    if (entities?.length) {
      graph.elements = await Promise.all<V1_PackageableElement>(
        entities.map(
          (e) =>
            new Promise((resolve, reject) =>
              setTimeout(() => {
                try {
                  resolve(
                    // NOTE: here we skip the check for classifier path, so there could be cases
                    // where the classifier path is different from the actua element protocol path
                    // we might need to do validation here. This can happen when the classifier
                    // path is changed in the backend. If we are to check for this, we might consider
                    // not throwing error but quitely print out warnings about elements that would not
                    // be built.
                    V1_deserializePackageableElement(
                      e.content as PlainObject<V1_PackageableElement>,
                      plugins,
                    ),
                  );
                } catch (error: unknown) {
                  assertErrorThrown(error);
                  reject(error);
                }
              }, 0),
            ),
        ),
      );
    }
  } catch (error: unknown) {
    assertErrorThrown(error);
    // wrap all de-serializer error so we can handle them downstream
    throw new GraphDataParserError(error);
  }
};

const alloySdlcSerializationModelSchema = createModelSchema(V1_AlloySdlc, {
  _type: usingConstantValueSchema(V1_SdlcType.ALLOY),
  baseVersion: optional(primitive()),
  version: primitive(),
  project: primitive(),
  packageableElementPointers: list(
    usingModelSchema(V1_packageableElementPointerDeserrializerSchema),
  ),
});

export const V1_pureModelContextDataPropSchema = custom(
  (value) =>
    value === undefined ? SKIP : serialize(V1_PureModelContextData, value),
  (value) => deserialize(V1_PureModelContextData, value),
);

const V1_pureModelContextPointerModelSchema = createModelSchema(
  V1_PureModelContextPointer,
  {
    _type: usingConstantValueSchema(V1_PureModelContextType.POINTER),
    serializer: usingModelSchema(V1_Protocol.serialization.schema),
    sdlcInfo: usingModelSchema(alloySdlcSerializationModelSchema),
  },
);

const V1_pureModelContextCompositeModelSchema = createModelSchema(
  V1_PureModelContextComposite,
  {
    _type: usingConstantValueSchema(V1_PureModelContextType.COMPOSITE),
    serializer: usingModelSchema(V1_Protocol.serialization.schema),
    data: V1_pureModelContextDataPropSchema,
    pointer: usingModelSchema(V1_pureModelContextPointerModelSchema),
  },
);

export const V1_setupPureModelContextDataSerialization = (
  plugins: PureProtocolProcessorPlugin[],
): void => {
  createModelSchema(V1_PureModelContextData, {
    _type: usingConstantValueSchema(V1_PureModelContextType.DATA),
    origin: usingModelSchema(V1_pureModelContextPointerModelSchema),
    elements: list(
      custom(
        (element: V1_PackageableElement) =>
          element.accept_PackageableElementVisitor(
            new V1_PackageableElementSerializer(plugins),
          ),
        (element: PlainObject<V1_PackageableElement>) =>
          V1_deserializePackageableElement(element, plugins),
      ),
    ),
    serializer: usingModelSchema(V1_Protocol.serialization.schema),
  });
};

export const V1_deserializePureModelContextData = (
  json: PlainObject<V1_PureModelContextData>,
): V1_PureModelContextData => deserialize(V1_PureModelContextData, json);

export const V1_serializePureModelContextData = (
  protocol: V1_PureModelContextData,
): PlainObject<V1_PureModelContextData> =>
  serialize(V1_PureModelContextData, protocol);

export const V1_serializePureModelContext = (
  pureModelContext: V1_PureModelContext,
): PlainObject<V1_PureModelContext> => {
  if (pureModelContext instanceof V1_PureModelContextPointer) {
    return serialize(V1_pureModelContextPointerModelSchema, pureModelContext);
  } else if (pureModelContext instanceof V1_PureModelContextData) {
    return V1_serializePureModelContextData(pureModelContext);
  } else if (pureModelContext instanceof V1_PureModelContextComposite) {
    return serialize(V1_pureModelContextCompositeModelSchema, pureModelContext);
  }
  throw new UnsupportedOperationError(
    `Can't serialize Pure model context of type '${
      getClass(pureModelContext).name
    }'`,
  );
};
