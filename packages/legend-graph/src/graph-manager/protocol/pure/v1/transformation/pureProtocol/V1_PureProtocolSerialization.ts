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
  list,
  createModelSchema,
  primitive,
  custom,
  optional,
  serialize,
  deserialize,
  object,
} from 'serializr';
import {
  type PlainObject,
  usingConstantValueSchema,
  UnsupportedOperationError,
  assertErrorThrown,
  usingModelSchema,
} from '@finos/legend-shared';
import { V1_PureModelContextData } from '../../model/context/V1_PureModelContextData.js';
import { V1_PureModelContextPointer } from '../../model/context/V1_PureModelContextPointer.js';
import type { V1_PackageableElement } from '../../model/packageableElements/V1_PackageableElement.js';
import {
  V1_serializePackageableElement,
  V1_deserializePackageableElement,
} from '../../transformation/pureProtocol/V1_PackageableElementSerialization.js';
import { V1_PureModelContextComposite } from '../../model/context/V1_PureModelContextComposite.js';
import { V1_Protocol } from '../../model/V1_Protocol.js';
import { V1_LegendSDLC } from '../../model/context/V1_SDLC.js';
import type { V1_PureModelContext } from '../../model/context/V1_PureModelContext.js';
import { V1_packageableElementPointerModelSchema } from '../../transformation/pureProtocol/serializationHelpers/V1_CoreSerializationHelper.js';
import type { PureProtocolProcessorPlugin } from '../../../PureProtocolProcessorPlugin.js';
import type { Entity } from '@finos/legend-storage';
import { GraphDataDeserializationError } from '../../../../../../graph-manager/GraphManagerUtils.js';
import { V1_PureModelContextText } from '../../model/context/V1_PureModelContextText.js';
import type {
  ClassifierPathMappingMap,
  SubtypeInfo,
} from '../../../../../action/protocol/ProtocolInfo.js';

enum V1_SDLCType {
  ALLOY = 'alloy',
}

export enum V1_PureModelContextType {
  DATA = 'data',
  POINTER = 'pointer',
  COMPOSITE = 'composite',
  TEXT = 'text',
}

export const V1_entitiesToPureModelContextData = async (
  entities: Entity[] | undefined,
  graph: V1_PureModelContextData,
  plugins: PureProtocolProcessorPlugin[],
  subtypeInfo?: SubtypeInfo | undefined,
  classifierPathMappingMap?: ClassifierPathMappingMap | undefined,
  /**
   * FIXME: to be deleted when most users have migrated to using full function signature as function name
   * Currently, SDLC store many functions in legacy form (entity path does
   * not contain full function signature). However, since they store function
   * entity in text, when they parse the content to return JSON for entity
   * content, the content is then updated to have proper `name` for function
   * entities, this means that there's now a mismatch in the path constructed
   * from entity content and the entity path, which is a contract that SDLC
   * should maintain but currently not because of this change
   * See https://github.com/finos/legend-sdlc/pull/515
   *
   * For that reason, during this migration, we want to respect entity path
   * instead of the path constructed from entity content to properly
   * reflect the renaming of function in local changes.
   */
  TEMPORARY__entityPathIndex?: Map<string, string>,
): Promise<void> => {
  try {
    if (entities?.length) {
      const entityToElement = (entity: Entity): V1_PackageableElement => {
        const element = V1_deserializePackageableElement(
          entity.content,
          plugins,
          subtypeInfo,
          classifierPathMappingMap,
          entity.classifierPath,
        );
        TEMPORARY__entityPathIndex?.set(element.path, entity.path);
        return element;
      };
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
                    entityToElement(e),
                  );
                } catch (error) {
                  assertErrorThrown(error);
                  reject(error);
                }
              }, 0),
            ),
        ),
      );
    }
  } catch (error) {
    assertErrorThrown(error);
    // wrap all de-serializer error so we can handle them downstream
    throw new GraphDataDeserializationError(error);
  }
};

export const V1_legendSDLCSerializationModelSchema = createModelSchema(
  V1_LegendSDLC,
  {
    _type: usingConstantValueSchema(V1_SDLCType.ALLOY),
    baseVersion: optional(primitive()),
    version: primitive(),
    groupId: primitive(),
    artifactId: primitive(),
    packageableElementPointers: list(
      usingModelSchema(V1_packageableElementPointerModelSchema),
    ),
  },
);

const V1_pureModelContextTextSchema = createModelSchema(
  V1_PureModelContextText,
  {
    _type: usingConstantValueSchema(V1_PureModelContextType.TEXT),
    serializer: usingModelSchema(V1_Protocol.serialization.schema),
    code: optional(primitive()),
  },
);

const V1_pureModelContextPointerModelSchema = createModelSchema(
  V1_PureModelContextPointer,
  {
    _type: usingConstantValueSchema(V1_PureModelContextType.POINTER),
    serializer: optional(usingModelSchema(V1_Protocol.serialization.schema)),
    sdlcInfo: usingModelSchema(V1_legendSDLCSerializationModelSchema),
  },
);

const V1_pureModelContextCompositeModelSchema = createModelSchema(
  V1_PureModelContextComposite,
  {
    _type: usingConstantValueSchema(V1_PureModelContextType.COMPOSITE),
    serializer: usingModelSchema(V1_Protocol.serialization.schema),
    // TODO: use `V1_pureModelContextDataPropSchema`
    data: object(V1_PureModelContextData),
    pointer: usingModelSchema(V1_pureModelContextPointerModelSchema),
  },
);

export const V1_setupPureModelContextDataSerialization = (
  plugins: PureProtocolProcessorPlugin[],
  subtypeInfo?: SubtypeInfo | undefined,
  classifierPathMappingMap?: ClassifierPathMappingMap | undefined,
): void => {
  createModelSchema(V1_PureModelContextData, {
    _type: usingConstantValueSchema(V1_PureModelContextType.DATA),
    origin: usingModelSchema(V1_pureModelContextPointerModelSchema),
    elements: list(
      custom(
        (element: V1_PackageableElement) =>
          V1_serializePackageableElement(element, plugins),
        (element: PlainObject<V1_PackageableElement>) =>
          V1_deserializePackageableElement(
            element,
            plugins,
            subtypeInfo,
            classifierPathMappingMap,
          ),
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
    const rawPMCD = V1_serializePureModelContextData(pureModelContext);
    if (pureModelContext.INTERNAL__rawDependencyEntities?.length) {
      rawPMCD.elements = [
        ...(rawPMCD as { elements: PlainObject[] }).elements,
        ...pureModelContext.INTERNAL__rawDependencyEntities.map(
          (e) => e.content,
        ),
      ];
    }
    return rawPMCD;
  } else if (pureModelContext instanceof V1_PureModelContextComposite) {
    return serialize(V1_pureModelContextCompositeModelSchema, pureModelContext);
  } else if (pureModelContext instanceof V1_PureModelContextText) {
    return serialize(V1_pureModelContextTextSchema, pureModelContext);
  }
  throw new UnsupportedOperationError(
    `Can't serialize Pure model context`,
    pureModelContext,
  );
};

export const V1_deserializePureModelContext = (
  json: PlainObject<V1_PureModelContext>,
): V1_PureModelContext => {
  switch (json._type) {
    case V1_PureModelContextType.POINTER:
      return deserialize(V1_pureModelContextPointerModelSchema, json);
    case V1_PureModelContextType.DATA:
      return V1_deserializePureModelContextData(json);
    case V1_PureModelContextType.COMPOSITE:
      return deserialize(V1_pureModelContextCompositeModelSchema, json);
    case V1_PureModelContextType.TEXT:
      return deserialize(V1_pureModelContextTextSchema, json);
    default:
      throw new UnsupportedOperationError(
        `Can't deserialize Pure model context`,
        json,
      );
  }
};

export const V1_pureModelContextDataPropSchema = custom(
  (val: V1_PureModelContextData) => V1_serializePureModelContextData(val),
  (val: PlainObject<V1_PureModelContextData>) =>
    V1_deserializePureModelContextData(val),
);

export const V1_pureModelContextPropSchema = custom(
  (val: V1_PureModelContext) => V1_serializePureModelContext(val),
  (val) => V1_deserializePureModelContext(val),
);
