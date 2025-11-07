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

import { deserialize, serialize } from 'serializr';
import {
  UnsupportedOperationError,
  type PlainObject,
} from '@finos/legend-shared';
import {
  type DataProductSearchResultDetails,
  type LakehouseDataProductSearchResultOrigin,
  DataProductSearchResultDetailsType,
  LakehouseAdHocDataProductSearchResultOrigin,
  LakehouseDataProductSearchResultDetails,
  LakehouseDataProductSearchResultOriginType,
  LakehouseSDLCDataProductSearchResultOrigin,
  LegacyDataProductSearchResultDetails,
} from '../models/DataProductSearchResult.js';

export const deserializeLakehouseDataProductSearchResultOrigin = (
  json: PlainObject<LakehouseDataProductSearchResultOrigin> | null,
): LakehouseDataProductSearchResultOrigin | null => {
  if (json === null) {
    return null;
  }
  switch (json._type) {
    case LakehouseDataProductSearchResultOriginType.SDLC:
      return deserialize(
        LakehouseSDLCDataProductSearchResultOrigin.serialization.schema,
        json,
      );
    case LakehouseDataProductSearchResultOriginType.AD_HOC:
      return deserialize(
        LakehouseAdHocDataProductSearchResultOrigin.serialization.schema,
        json,
      );
    default: {
      throw new UnsupportedOperationError(
        `Cannot deserialize search result origin of type '${json._type}'`,
      );
    }
  }
};

export const serializeLakehouseDataProductSearchResultOrigin = (
  origin: LakehouseDataProductSearchResultOrigin | null,
): PlainObject<LakehouseDataProductSearchResultOrigin> => {
  if (origin instanceof LakehouseSDLCDataProductSearchResultOrigin) {
    return serialize(
      LakehouseSDLCDataProductSearchResultOrigin.serialization.schema,
      origin,
    );
  }
  if (origin instanceof LakehouseAdHocDataProductSearchResultOrigin) {
    return serialize(
      LakehouseAdHocDataProductSearchResultOrigin.serialization.schema,
      origin,
    );
  }
  throw new UnsupportedOperationError();
};

export const deserializeDataProductSearchResultDetails = (
  json: PlainObject<DataProductSearchResultDetails> | null,
): DataProductSearchResultDetails | null => {
  if (json === null) {
    return null;
  }
  switch (json._type) {
    case DataProductSearchResultDetailsType.LAKEHOUSE:
      return deserialize(
        LakehouseDataProductSearchResultDetails.serialization.schema,
        json,
      );
    case DataProductSearchResultDetailsType.LEGACY:
      return deserialize(
        LegacyDataProductSearchResultDetails.serialization.schema,
        json,
      );
    default: {
      throw new UnsupportedOperationError(
        `Cannot deserialize search result details of type '${json._type}'`,
      );
    }
  }
};

export const serializeDataProductSearchResultDetails = (
  details: DataProductSearchResultDetails | null,
): PlainObject<DataProductSearchResultDetails> => {
  if (details instanceof LakehouseDataProductSearchResultDetails) {
    return serialize(
      LakehouseDataProductSearchResultDetails.serialization.schema,
      details,
    );
  }
  if (details instanceof LegacyDataProductSearchResultDetails) {
    return serialize(
      LegacyDataProductSearchResultDetails.serialization.schema,
      details,
    );
  }
  throw new UnsupportedOperationError();
};
