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
  usingConstantValueSchema,
  type PlainObject,
} from '@finos/legend-shared';
import { PACKAGEABLE_ELEMENT_TYPE } from '../../utils/ModelClassifierUtils.js';
import {
  createModelSchema,
  custom,
  deserialize,
  optional,
  primitive,
  serialize,
} from 'serializr';

export abstract class ElementEditorInitialConfiguration {
  abstract type: PACKAGEABLE_ELEMENT_TYPE;
}

export class IngestElementEditorInitialConfiguration extends ElementEditorInitialConfiguration {
  deployOnOpen?: boolean;
  type = PACKAGEABLE_ELEMENT_TYPE.INGEST_DEFINITION;

  static readonly serialization = new SerializationFactory(
    createModelSchema(IngestElementEditorInitialConfiguration, {
      _type: usingConstantValueSchema(
        PACKAGEABLE_ELEMENT_TYPE.INGEST_DEFINITION,
      ),
      deployOnOpen: optional(primitive()),
    }),
  );
}

export class DataProductElementEditorInitialConfiguration extends ElementEditorInitialConfiguration {
  deployOnOpen?: boolean;
  type = PACKAGEABLE_ELEMENT_TYPE._DATA_PRODUCT;

  static readonly serialization = new SerializationFactory(
    createModelSchema(DataProductElementEditorInitialConfiguration, {
      _type: usingConstantValueSchema(PACKAGEABLE_ELEMENT_TYPE._DATA_PRODUCT),
      deployOnOpen: optional(primitive()),
    }),
  );
}

const serializeElementEditorInitialConfiguration = (
  protocol: ElementEditorInitialConfiguration,
): PlainObject<ElementEditorInitialConfiguration> => {
  if (protocol instanceof IngestElementEditorInitialConfiguration) {
    return serialize(
      IngestElementEditorInitialConfiguration.serialization.schema,
      protocol,
    );
  } else if (protocol instanceof DataProductElementEditorInitialConfiguration) {
    return serialize(
      DataProductElementEditorInitialConfiguration.serialization.schema,
      protocol,
    );
  }
  throw new UnsupportedOperationError(
    `Can't serialize element config`,
    protocol,
  );
};

const deseralizeElementEditorInitialConfiguration = (
  json: PlainObject<ElementEditorInitialConfiguration>,
): ElementEditorInitialConfiguration => {
  switch (json._type) {
    case PACKAGEABLE_ELEMENT_TYPE.INGEST_DEFINITION:
      return deserialize(
        IngestElementEditorInitialConfiguration.serialization.schema,
        json,
      );
    case PACKAGEABLE_ELEMENT_TYPE._DATA_PRODUCT:
      return deserialize(
        DataProductElementEditorInitialConfiguration.serialization.schema,
        json,
      );
    default: {
      throw new UnsupportedOperationError(
        `Can't deserialize element config`,
        json,
      );
    }
  }
};

export class EditorInitialConfiguration {
  elementEditorConfiguration?: ElementEditorInitialConfiguration;

  static readonly serialization = new SerializationFactory(
    createModelSchema(EditorInitialConfiguration, {
      elementEditorConfiguration: optional(
        custom(
          serializeElementEditorInitialConfiguration,
          deseralizeElementEditorInitialConfiguration,
        ),
      ),
    }),
  );
}
