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
  createModelSchema,
  deserialize,
  optional,
  primitive,
  serialize,
} from 'serializr';
import {
  type V1_AccessPoint,
  type V1_DataProductIcon,
  V1_AccessPointGroup,
  V1_DATA_PRODUCT_ELEMENT_PROTOCOL_TYPE,
  V1_DataProduct,
  V1_DataProductDiagram,
  V1_DataProductEmbeddedImageIcon,
  V1_DataProductLibraryIcon,
  V1_DataProductLink,
  V1_DataProductRuntimeInfo,
  V1_ElementScope,
  V1_Email,
  V1_LakehouseAccessPoint,
  V1_ModelAccessPointGroup,
  V1_SupportInfo,
  V1_UnknownAccessPoint,
  V1_UnknownDataProductIcon,
  type V1_DataProductType,
  V1_InternalDataProductType,
  V1_ExternalDataProductType,
  V1_DataProductTypeValue,
} from '../../../model/packageableElements/dataProduct/V1_DataProduct.js';
import {
  UnsupportedOperationError,
  usingConstantValueSchema,
  usingModelSchema,
  customList,
  type PlainObject,
  customListWithSchema,
  optionalCustomUsingModelSchema,
  optionalCustom,
  optionalCustomList,
} from '@finos/legend-shared';
import { V1_rawLambdaModelSchema } from './V1_RawValueSpecificationSerializationHelper.js';
import {
  V1_packageableElementPointerModelSchema,
  V1_stereotypePtrModelSchema,
  V1_taggedValueModelSchema,
} from './V1_CoreSerializationHelper.js';
import { V1_MappingIncludeDataProduct } from '../../../model/packageableElements/dataProduct/V1_MappingIncludeDataProduct.js';

export enum V1_AccessPointType {
  LAKEHOUSE = 'lakehouseAccessPoint',
  EQUAL_TO_JSON = 'equalToJson',
  EQUAL_TO_TDS = 'equalToTDS',
}

export enum V1_AccessPointGrouptype {
  DEFAULT_ACCESS_POINT_GROUP = 'defaultAccessPointGroup',
  MODEL_ACCESS_POINT_GROUP = 'modelAccessPointGroup',
}

export enum V1_DataProductIconType {
  LIBRARY_ICON = 'libraryIcon',
  EMBEDDED_IMAGE_ICON = 'embeddedImageIcon',
}

export enum V1_DataProductIconLibraryId {
  REACT_ICONS = 'react-icons',
}

export const V1_lakehouseAccessPointModelSchema = createModelSchema(
  V1_LakehouseAccessPoint,
  {
    _type: usingConstantValueSchema(V1_AccessPointType.LAKEHOUSE),
    classification: optional(primitive()),
    description: optional(primitive()),
    func: usingModelSchema(V1_rawLambdaModelSchema),
    id: primitive(),
    reproducible: optional(primitive()),
    targetEnvironment: primitive(),
  },
);

const V1_serializeAccessPoint = (
  protocol: V1_AccessPoint,
): PlainObject<V1_AccessPoint> => {
  if (protocol instanceof V1_LakehouseAccessPoint) {
    return serialize(V1_lakehouseAccessPointModelSchema, protocol);
  } else if (protocol instanceof V1_UnknownAccessPoint) {
    return protocol.content;
  }
  throw new UnsupportedOperationError(
    `Can't serialize access point type`,
    protocol,
  );
};

const V1_deserializeAccessPoint = (
  json: PlainObject<V1_AccessPoint>,
): V1_AccessPoint => {
  switch (json._type) {
    case V1_AccessPointType.LAKEHOUSE:
      return deserialize(V1_lakehouseAccessPointModelSchema, json);
    default: {
      const unknown = new V1_UnknownAccessPoint();
      unknown.content = json;
      unknown.id = json.id as string;
      return unknown;
    }
  }
};

export const V1_DataProductRuntimeInfoModelSchema = createModelSchema(
  V1_DataProductRuntimeInfo,
  {
    description: optional(primitive()),
    id: primitive(),
    runtime: usingModelSchema(V1_packageableElementPointerModelSchema),
  },
);

export const V1_dataProductDiagramModelSchema = createModelSchema(
  V1_DataProductDiagram,
  {
    title: primitive(),
    description: optional(primitive()),
    diagram: usingModelSchema(V1_packageableElementPointerModelSchema),
  },
);

export const V1_ElementScopeModelSchema = createModelSchema(V1_ElementScope, {
  element: usingModelSchema(V1_packageableElementPointerModelSchema),
  exclude: optional(primitive()),
});

export const V1_ModelAccessPointGroupModelSchema = createModelSchema(
  V1_ModelAccessPointGroup,
  {
    _type: usingConstantValueSchema(
      V1_AccessPointGrouptype.MODEL_ACCESS_POINT_GROUP,
    ),
    accessPoints: customList(
      V1_serializeAccessPoint,
      V1_deserializeAccessPoint,
    ),
    compatibleRuntimes: customListWithSchema(
      V1_DataProductRuntimeInfoModelSchema,
    ),
    defaultRuntime: primitive(),
    description: optional(primitive()),
    diagrams: customListWithSchema(V1_dataProductDiagramModelSchema),
    featuredElements: customListWithSchema(V1_ElementScopeModelSchema),
    id: primitive(),
    stereotypes: customListWithSchema(V1_stereotypePtrModelSchema),
    mapping: usingModelSchema(V1_packageableElementPointerModelSchema),
  },
);

export const V1_DefaultAccessPointGroupModelSchema = createModelSchema(
  V1_AccessPointGroup,
  {
    accessPoints: customList(
      V1_serializeAccessPoint,
      V1_deserializeAccessPoint,
    ),
    description: optional(primitive()),
    id: primitive(),
    stereotypes: customListWithSchema(V1_stereotypePtrModelSchema, {
      INTERNAL__forceReturnEmptyInTest: true,
    }),
  },
);

const V1_serializeAccessPointGroup = (
  protocol: V1_AccessPointGroup,
): PlainObject<V1_AccessPointGroup> => {
  if (protocol instanceof V1_ModelAccessPointGroup) {
    return serialize(V1_ModelAccessPointGroupModelSchema, protocol);
  }
  return serialize(V1_DefaultAccessPointGroupModelSchema, protocol);
};

const V1_deserializeAccessPointGroup = (
  json: PlainObject<V1_AccessPointGroup>,
): V1_AccessPointGroup => {
  switch (json._type) {
    case V1_AccessPointGrouptype.MODEL_ACCESS_POINT_GROUP:
      return deserialize(V1_ModelAccessPointGroupModelSchema, json);
    default: {
      return deserialize(V1_DefaultAccessPointGroupModelSchema, json);
    }
  }
};

export const V1_DataProductLibraryIconModelSchema = createModelSchema(
  V1_DataProductLibraryIcon,
  {
    _type: usingConstantValueSchema(V1_DataProductIconType.LIBRARY_ICON),
    iconId: primitive(),
    libraryId: primitive(),
  },
);

export const V1_DataProductEmbeddedImageIconModelSchema = createModelSchema(
  V1_DataProductEmbeddedImageIcon,
  {
    _type: usingConstantValueSchema(V1_DataProductIconType.EMBEDDED_IMAGE_ICON),
    imageUrl: primitive(),
  },
);

const V1_deserializeDataProductIcon = (
  json: PlainObject<V1_DataProductIcon>,
): V1_DataProductIcon => {
  switch (json._type) {
    case V1_DataProductIconType.LIBRARY_ICON:
      return deserialize(V1_DataProductLibraryIconModelSchema, json);
    case V1_DataProductIconType.EMBEDDED_IMAGE_ICON:
      return deserialize(V1_DataProductEmbeddedImageIconModelSchema, json);
    default: {
      const unknown = new V1_UnknownDataProductIcon();
      unknown.content = json;
      return unknown;
    }
  }
};

const V1_serializeDataProductIcon = (
  protocol: V1_DataProductIcon,
): PlainObject<V1_DataProductIcon> => {
  if (protocol instanceof V1_DataProductLibraryIcon) {
    return serialize(V1_DataProductLibraryIconModelSchema, protocol);
  } else if (protocol instanceof V1_DataProductEmbeddedImageIcon) {
    return serialize(V1_DataProductEmbeddedImageIconModelSchema, protocol);
  }
  throw new UnsupportedOperationError(
    `Can't serialize data product icon type`,
    protocol,
  );
};

export const V1_EmailModelSchema = createModelSchema(V1_Email, {
  address: primitive(),
  title: primitive(),
});

const V1_DataProductLinkModelSchema = createModelSchema(V1_DataProductLink, {
  label: optional(primitive()),
  url: primitive(),
});

export const V1_SupportInfoModelSchema = createModelSchema(V1_SupportInfo, {
  documentation: optional(usingModelSchema(V1_DataProductLinkModelSchema)),
  emails: customListWithSchema(V1_EmailModelSchema),
  faqUrl: optional(usingModelSchema(V1_DataProductLinkModelSchema)),
  supportUrl: optional(usingModelSchema(V1_DataProductLinkModelSchema)),
  website: optional(usingModelSchema(V1_DataProductLinkModelSchema)),
});

export const V1_InternalDataProductTypeModelSchema = createModelSchema(
  V1_InternalDataProductType,
  {
    _type: usingConstantValueSchema(V1_DataProductTypeValue.INTERNAL),
  },
);

export const V1_ExternalDataProductTypeModelSchema = createModelSchema(
  V1_ExternalDataProductType,
  {
    _type: usingConstantValueSchema(V1_DataProductTypeValue.EXTERNAL),
    link: usingModelSchema(V1_DataProductLinkModelSchema),
  },
);

export const V1_deserializeDataProductType = (
  json: Record<string, unknown>,
): V1_DataProductType => {
  switch (json._type) {
    case V1_DataProductTypeValue.INTERNAL:
      return deserialize(V1_InternalDataProductTypeModelSchema, json);
    case V1_DataProductTypeValue.EXTERNAL:
      return deserialize(V1_ExternalDataProductTypeModelSchema, json);
    default:
      throw new Error(`Unknown V1_DataProductType type: ${json._type}`);
  }
};

export const V1_serializeDataProductType = (
  value: V1_DataProductType,
): PlainObject<V1_DataProductType> => {
  if (value instanceof V1_InternalDataProductType) {
    return serialize(V1_InternalDataProductTypeModelSchema, value);
  } else if (value instanceof V1_ExternalDataProductType) {
    return serialize(V1_ExternalDataProductTypeModelSchema, value);
  }
  throw new Error(`Unknown V1_DataProductType instance: ${value}`);
};

export const V1_dataProductModelSchema = createModelSchema(V1_DataProduct, {
  _type: usingConstantValueSchema(V1_DATA_PRODUCT_ELEMENT_PROTOCOL_TYPE),
  accessPointGroups: customList(
    V1_serializeAccessPointGroup,
    V1_deserializeAccessPointGroup,
  ),
  coverageRegions: optionalCustomList(
    (json) => (json as string).toLowerCase(),
    (json) => (json as unknown as string).toUpperCase(),
  ),

  deliveryFrequency: optionalCustom(
    (json) => (json as string).toLowerCase(),
    (json) => (json as string).toUpperCase(),
  ),
  description: optional(primitive()),
  icon: optionalCustom(
    V1_serializeDataProductIcon,
    V1_deserializeDataProductIcon,
  ),
  name: primitive(),
  package: primitive(),
  type: optionalCustom(
    V1_serializeDataProductType,
    V1_deserializeDataProductType,
  ),
  stereotypes: customListWithSchema(V1_stereotypePtrModelSchema),
  supportInfo: optionalCustomUsingModelSchema(V1_SupportInfoModelSchema),
  taggedValues: customListWithSchema(V1_taggedValueModelSchema),
  title: optional(primitive()),
});

export const V1_MAPPING_INCLUDE_DATAPRODUCT_TYPE = 'mappingIncludeDataProduct';

export const V1_mappingIncludeDataProductModelSchema = createModelSchema(
  V1_MappingIncludeDataProduct,
  {
    _type: usingConstantValueSchema(V1_MAPPING_INCLUDE_DATAPRODUCT_TYPE),
    includedDataProduct: primitive(),
  },
);
