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
  primitive,
  createModelSchema,
  list,
  raw,
  alias,
  optional,
  SKIP,
} from 'serializr';
import {
  customEquivalentList,
  customList,
  customListWithSchema,
  usingConstantValueSchema,
  usingModelSchema,
} from '@finos/legend-shared';
import { V1_multiplicitySchema } from '../../../transformation/pureProtocol/serializationHelpers/V1_CoreSerializationHelper.js';
import { V1_Enumeration } from '../../../model/packageableElements/domain/V1_Enumeration.js';
import { V1_Profile } from '../../../model/packageableElements/domain/V1_Profile.js';
import {
  V1_Measure,
  V1_Unit,
} from '../../../model/packageableElements/domain/V1_Measure.js';
import { V1_Class } from '../../../model/packageableElements/domain/V1_Class.js';
import { V1_Association } from '../../../model/packageableElements/domain/V1_Association.js';
import { V1_ConcreteFunctionDefinition } from '../../../model/packageableElements/function/V1_ConcreteFunctionDefinition.js';
import { V1_EnumValue } from '../../../model/packageableElements/domain/V1_EnumValue.js';
import { V1_StereotypePtr } from '../../../model/packageableElements/domain/V1_StereotypePtr.js';
import { V1_TagPtr } from '../../../model/packageableElements/domain/V1_TagPtr.js';
import { V1_TaggedValue } from '../../../model/packageableElements/domain/V1_TaggedValue.js';
import { V1_Property } from '../../../model/packageableElements/domain/V1_Property.js';
import { V1_DerivedProperty } from '../../../model/packageableElements/domain/V1_DerivedProperty.js';
import { V1_PropertyPointer } from '../../../model/packageableElements/domain/V1_PropertyPointer.js';
import { V1_Constraint } from '../../../model/packageableElements/domain/V1_Constraint.js';
import {
  V1_rawLambdaModelSchema,
  V1_rawVariableModelSchema,
} from './V1_RawValueSpecificationSerializationHelper.js';

export const V1_CLASS_ELEMENT_PROTOCOL_TYPE = 'class';
export const V1_PROFILE_ELEMENT_PROTOCOL_TYPE = 'profile';
export const V1_ENUMERATION_ELEMENT_PROTOCOL_TYPE = 'Enumeration';
export const V1_MEASURE_ELEMENT_PROTOCOL_TYPE = 'measure';
export const V1_UNIT_ELEMENT_PROTOCOL_TYPE = 'unit';
export const V1_ASSOCIATION_ELEMENT_PROTOCOL_TYPE = 'association';
export const V1_FUNCTION_ELEMENT_PROTOCOL_TYPE = 'function';

export const V1_propertyPointerModelSchema = createModelSchema(
  V1_PropertyPointer,
  {
    class: optional(primitive()),
    property: primitive(),
  },
);

// ------------------------------------- Profile -------------------------------------

export const V1_stereotypePtrSchema = createModelSchema(V1_StereotypePtr, {
  profile: primitive(),
  value: primitive(),
});

export const V1_tagPtrSchema = createModelSchema(V1_TagPtr, {
  profile: primitive(),
  value: primitive(),
});

export const V1_taggedValueSchema = createModelSchema(V1_TaggedValue, {
  tag: usingModelSchema(V1_tagPtrSchema),
  value: primitive(),
});

export const V1_profileSchema = createModelSchema(V1_Profile, {
  _type: usingConstantValueSchema(V1_PROFILE_ELEMENT_PROTOCOL_TYPE),
  name: primitive(),
  package: primitive(),
  stereotypes: list(primitive()),
  tags: list(primitive()),
});

// ------------------------------------- Enumeration -------------------------------------

export const V1_enumValueSchema = createModelSchema(V1_EnumValue, {
  stereotypes: customListWithSchema(V1_stereotypePtrSchema, {
    INTERNAL__forceReturnEmptyInTest: true,
  }),
  taggedValues: customListWithSchema(V1_taggedValueSchema, {
    INTERNAL__forceReturnEmptyInTest: true,
  }),
  value: primitive(),
});

export const V1_enumerationSchema = createModelSchema(V1_Enumeration, {
  _type: usingConstantValueSchema(V1_ENUMERATION_ELEMENT_PROTOCOL_TYPE),
  name: primitive(),
  package: primitive(),
  stereotypes: customListWithSchema(V1_stereotypePtrSchema, {
    INTERNAL__forceReturnEmptyInTest: true,
  }),
  taggedValues: customListWithSchema(V1_taggedValueSchema, {
    INTERNAL__forceReturnEmptyInTest: true,
  }),
  values: list(usingModelSchema(V1_enumValueSchema)),
});

// ------------------------------------- Measure -------------------------------------

export const V1_unitSchema = createModelSchema(V1_Unit, {
  _type: usingConstantValueSchema(V1_UNIT_ELEMENT_PROTOCOL_TYPE),
  conversionFunction: optional(usingModelSchema(V1_rawLambdaModelSchema)),
  measure: primitive(),
  name: primitive(),
  package: primitive(),
});

export const V1_measureSchema = createModelSchema(V1_Measure, {
  _type: usingConstantValueSchema(V1_MEASURE_ELEMENT_PROTOCOL_TYPE),
  canonicalUnit: optional(usingModelSchema(V1_unitSchema)),
  name: primitive(),
  nonCanonicalUnits: list(usingModelSchema(V1_unitSchema)),
  package: primitive(),
});

// ------------------------------------- Class -------------------------------------

export const V1_propertySchema = createModelSchema(V1_Property, {
  aggregation: optional(primitive()),
  multiplicity: usingModelSchema(V1_multiplicitySchema),
  name: primitive(),
  stereotypes: customListWithSchema(V1_stereotypePtrSchema, {
    INTERNAL__forceReturnEmptyInTest: true,
  }),
  taggedValues: customListWithSchema(V1_taggedValueSchema, {
    INTERNAL__forceReturnEmptyInTest: true,
  }),
  type: primitive(),
});

export const V1_derivedPropertySchema = createModelSchema(V1_DerivedProperty, {
  body: raw(),
  name: primitive(),
  parameters: raw(),
  returnMultiplicity: usingModelSchema(V1_multiplicitySchema),
  returnType: primitive(),
  stereotypes: customListWithSchema(V1_stereotypePtrSchema, {
    INTERNAL__forceReturnEmptyInTest: true,
  }),
  taggedValues: customListWithSchema(V1_taggedValueSchema, {
    INTERNAL__forceReturnEmptyInTest: true,
  }),
});

export const V1_constraintSchema = createModelSchema(V1_Constraint, {
  enforcementLevel: optional(primitive()),
  externalId: optional(primitive()),
  functionDefinition: usingModelSchema(V1_rawLambdaModelSchema),
  messageFunction: optional(usingModelSchema(V1_rawLambdaModelSchema)),
  name: primitive(),
});

export const V1_classSchema = createModelSchema(V1_Class, {
  _type: usingConstantValueSchema(V1_CLASS_ELEMENT_PROTOCOL_TYPE),
  constraints: customListWithSchema(V1_constraintSchema, {
    INTERNAL__forceReturnEmptyInTest: true,
  }),
  name: primitive(),
  /**
   * Omit this information during protocol transformation as it can be
   * interpreted while building the graph; and will help grammar-roundtrip
   * tests (involving engine) to pass. Ideally, this requires grammar parser
   * and composer in engine to be more consistent.
   *
   * @discrepancy grammar-roundtrip
   */
  originalMilestonedProperties: customList(
    () => SKIP,
    () => SKIP,
    {
      INTERNAL__forceReturnEmptyInTest: true,
    },
  ),
  package: primitive(),
  properties: customListWithSchema(V1_propertySchema, {
    INTERNAL__forceReturnEmptyInTest: true,
  }),
  derivedProperties: alias(
    'qualifiedProperties', // 'derived properties' used to be called 'qualified properties'
    customListWithSchema(V1_derivedPropertySchema, {
      INTERNAL__forceReturnEmptyInTest: true,
    }),
  ),
  stereotypes: customListWithSchema(V1_stereotypePtrSchema, {
    INTERNAL__forceReturnEmptyInTest: true,
  }),
  superTypes: customEquivalentList({
    INTERNAL__forceReturnEmptyInTest: true,
  }),
  taggedValues: customListWithSchema(V1_taggedValueSchema, {
    INTERNAL__forceReturnEmptyInTest: true,
  }),
});

// ------------------------------------- Association -------------------------------------

export const V1_associationSchema = createModelSchema(V1_Association, {
  _type: usingConstantValueSchema(V1_ASSOCIATION_ELEMENT_PROTOCOL_TYPE),
  name: primitive(),
  /**
   * Omit this information during protocol transformation as it can be
   * interpreted while building the graph; and will help grammar-roundtrip
   * tests (involving engine) to pass. Ideally, this requires grammar parser
   * and composer in engine to be more consistent.
   *
   * @discrepancy grammar-roundtrip
   */
  originalMilestonedProperties: customList(
    () => SKIP,
    () => SKIP,
    {
      INTERNAL__forceReturnEmptyInTest: true,
    },
  ),
  package: primitive(),
  properties: list(usingModelSchema(V1_propertySchema)),
  derivedProperties: alias(
    'qualifiedProperties', // 'derived properties' used to be called 'qualified properties'
    customListWithSchema(V1_derivedPropertySchema, {
      INTERNAL__forceReturnEmptyInTest: true,
    }),
  ),
  stereotypes: customListWithSchema(V1_stereotypePtrSchema, {
    INTERNAL__forceReturnEmptyInTest: true,
  }),
  taggedValues: customListWithSchema(V1_taggedValueSchema, {
    INTERNAL__forceReturnEmptyInTest: true,
  }),
});

// ------------------------------------- Function -------------------------------------

export const V1_functionSchema = createModelSchema(
  V1_ConcreteFunctionDefinition,
  {
    _type: usingConstantValueSchema(V1_FUNCTION_ELEMENT_PROTOCOL_TYPE),
    body: list(raw()),
    name: primitive(),
    package: primitive(),
    parameters: list(usingModelSchema(V1_rawVariableModelSchema)),
    postConstraints: list(primitive()), // NOTE: these are not currently supported and just added to pass roundtrip test
    preConstraints: list(primitive()), // NOTE: these are not currently supported and just added to pass roundtrip test
    returnMultiplicity: usingModelSchema(V1_multiplicitySchema),
    returnType: primitive(),
    stereotypes: customListWithSchema(V1_stereotypePtrSchema, {
      INTERNAL__forceReturnEmptyInTest: true,
    }),
    taggedValues: customListWithSchema(V1_taggedValueSchema, {
      INTERNAL__forceReturnEmptyInTest: true,
    }),
  },
);
