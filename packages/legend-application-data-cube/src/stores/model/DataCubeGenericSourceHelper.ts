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
  UnsupportedOperationError,
  usingConstantValueSchema,
  type PlainObject,
} from '@finos/legend-shared';
import type { DataCubeGenericSource } from './DataCubeGenericSource.js';
import { LegendSavedQuerySource } from './LegendSavedQuerySource.js';
import {
  createModelSchema,
  primitive,
  deserialize,
  serialize,
} from 'serializr';

enum SavedDataCubeQueryType {
  LEGEND_QUERY = 'LegendQuery',
}

export const legendSavedQuerySourceModelSchema = createModelSchema(
  LegendSavedQuerySource,
  {
    _type: usingConstantValueSchema(SavedDataCubeQueryType.LEGEND_QUERY),
    id: primitive(),
  },
);

export const buildDataCubeGenericSource = (
  content: PlainObject<object>,
): DataCubeGenericSource => {
  switch (content._type) {
    case SavedDataCubeQueryType.LEGEND_QUERY:
      return deserialize(legendSavedQuerySourceModelSchema, content);
    default:
  }
  throw new UnsupportedOperationError(
    `Can't de serialize saved data cube`,
    content._type,
  );
};

export const serializeDataCubeGenericSource = (
  genericSource: DataCubeGenericSource,
): PlainObject<DataCubeGenericSource> => {
  if (genericSource instanceof LegendSavedQuerySource) {
    return serialize(legendSavedQuerySourceModelSchema, genericSource);
  }
  throw new UnsupportedOperationError(`Can't serialize saved data cube`);
};
