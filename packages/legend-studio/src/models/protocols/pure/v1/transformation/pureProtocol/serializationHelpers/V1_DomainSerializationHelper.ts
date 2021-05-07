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
  serialize,
  custom,
  deserialize,
  optional,
  SKIP,
} from 'serializr';
import {
  deserializeArray,
  serializeArray,
  usingConstantValueSchema,
  usingModelSchema,
} from '@finos/legend-studio-shared';
import { V1_multiplicitySchema } from '../../../transformation/pureProtocol/serializationHelpers/V1_CoreSerializationHelper';
import { V1_Enumeration } from '../../../model/packageableElements/domain/V1_Enumeration';
import { V1_Profile } from '../../../model/packageableElements/domain/V1_Profile';
import {
  V1_Measure,
  V1_Unit,
} from '../../../model/packageableElements/domain/V1_Measure';
import { V1_Class } from '../../../model/packageableElements/domain/V1_Class';
import { V1_Association } from '../../../model/packageableElements/domain/V1_Association';
import { V1_ConcreteFunctionDefinition } from '../../../model/packageableElements/function/V1_ConcreteFunctionDefinition';
import { V1_EnumValue } from '../../../model/packageableElements/domain/V1_EnumValue';
import { V1_StereotypePtr } from '../../../model/packageableElements/domain/V1_StereotypePtr';
import { V1_TagPtr } from '../../../model/packageableElements/domain/V1_TagPtr';
import { V1_TaggedValue } from '../../../model/packageableElements/domain/V1_TaggedValue';
import { V1_Property } from '../../../model/packageableElements/domain/V1_Property';
import { V1_DerivedProperty } from '../../../model/packageableElements/domain/V1_DerivedProperty';
import { V1_PropertyPointer } from '../../../model/packageableElements/domain/V1_PropertyPointer';
import { V1_Constraint } from '../../../model/packageableElements/domain/V1_Constraint';
import {
  V1_rawLambdaModelSchema,
  V1_rawVariableModelSchema,
} from './V1_RawValueSpecificationSerializationHelper';

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

export const V1_enumValueSchema = createModelSchema(V1_EnumValue, {
  stereotypes: custom(
    (values) =>
      serializeArray(
        values,
        (value) => serialize(V1_stereotypePtrSchema, value),
        true,
      ),
    (values) =>
      deserializeArray(
        values,
        (v: V1_StereotypePtr) => deserialize(V1_stereotypePtrSchema, v),
        false,
      ),
  ),
  taggedValues: custom(
    (values) =>
      serializeArray(
        values,
        (value) => serialize(V1_taggedValueSchema, value),
        true,
      ),
    (values) =>
      deserializeArray(
        values,
        (v: V1_StereotypePtr) => deserialize(V1_taggedValueSchema, v),
        false,
      ),
  ),
  value: primitive(),
});

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

export const V1_enumerationSchema = createModelSchema(V1_Enumeration, {
  _type: usingConstantValueSchema(V1_ENUMERATION_ELEMENT_PROTOCOL_TYPE),
  name: primitive(),
  package: primitive(),
  stereotypes: custom(
    (values) =>
      serializeArray(
        values,
        (value) => serialize(V1_stereotypePtrSchema, value),
        true,
      ),
    (values) =>
      deserializeArray(
        values,
        (v: V1_StereotypePtr) => deserialize(V1_stereotypePtrSchema, v),
        false,
      ),
  ),
  taggedValues: custom(
    (values) =>
      serializeArray(
        values,
        (value) => serialize(V1_taggedValueSchema, value),
        true,
      ),
    (values) =>
      deserializeArray(
        values,
        (v: V1_StereotypePtr) => deserialize(V1_taggedValueSchema, v),
        false,
      ),
  ),
  values: list(usingModelSchema(V1_enumValueSchema)),
});

export const V1_propertySchema = createModelSchema(V1_Property, {
  multiplicity: usingModelSchema(V1_multiplicitySchema),
  name: primitive(),
  stereotypes: custom(
    (values) =>
      serializeArray(
        values,
        (value) => serialize(V1_stereotypePtrSchema, value),
        true,
      ),
    (values) =>
      deserializeArray(
        values,
        (v: V1_StereotypePtr) => deserialize(V1_stereotypePtrSchema, v),
        false,
      ),
  ),
  taggedValues: custom(
    (values) =>
      serializeArray(
        values,
        (value) => serialize(V1_taggedValueSchema, value),
        true,
      ),
    (values) =>
      deserializeArray(
        values,
        (v: V1_StereotypePtr) => deserialize(V1_taggedValueSchema, v),
        false,
      ),
  ),
  type: primitive(),
});

export const V1_derivedPropertySchema = createModelSchema(V1_DerivedProperty, {
  body: raw(),
  name: primitive(),
  parameters: raw(),
  returnMultiplicity: usingModelSchema(V1_multiplicitySchema),
  returnType: primitive(),
  stereotypes: custom(
    (values) =>
      serializeArray(
        values,
        (value) => serialize(V1_stereotypePtrSchema, value),
        true,
      ),
    (values) =>
      deserializeArray(
        values,
        (v: V1_StereotypePtr) => deserialize(V1_stereotypePtrSchema, v),
        false,
      ),
  ),
  taggedValues: custom(
    (values) =>
      serializeArray(
        values,
        (value) => serialize(V1_taggedValueSchema, value),
        true,
      ),
    (values) =>
      deserializeArray(
        values,
        (v: V1_StereotypePtr) => deserialize(V1_taggedValueSchema, v),
        false,
      ),
  ),
});

export const V1_constraintSchema = createModelSchema(V1_Constraint, {
  enforcementLevel: optional(primitive()),
  externalId: optional(primitive()),
  functionDefinition: usingModelSchema(V1_rawLambdaModelSchema),
  messageFunction: custom(
    (value) => (value ? serialize(V1_rawLambdaModelSchema, value) : SKIP),
    (value) => deserialize(V1_rawLambdaModelSchema, value),
  ),
  name: primitive(),
});

export const V1_classSchema = createModelSchema(V1_Class, {
  _type: usingConstantValueSchema(V1_CLASS_ELEMENT_PROTOCOL_TYPE),
  constraints: custom(
    (values) =>
      serializeArray(
        values,
        (value) => serialize(V1_constraintSchema, value),
        true,
      ),
    (values) =>
      deserializeArray(
        values,
        (v: V1_StereotypePtr) => deserialize(V1_constraintSchema, v),
        false,
      ),
  ),
  name: primitive(),
  // NOTE: we don't process milestoning at the moment so this is added to ensure
  // consistency between the protocol in Studio and Engine only.
  originalMilestonedProperties: custom(
    (values) => serializeArray([], () => SKIP, true),
    (values) => deserializeArray([], () => SKIP, false),
  ), // @MARKER: GRAMMAR ROUNDTRIP --- omit this information during protocol transformation as it can be interpreted while building the graph
  package: primitive(),
  properties: custom(
    (values) =>
      serializeArray(
        values,
        (value) => serialize(V1_propertySchema, value),
        true,
      ),
    (values) =>
      deserializeArray(
        values,
        (v: V1_StereotypePtr) => deserialize(V1_propertySchema, v),
        false,
      ),
  ),
  derivedProperties: alias(
    'qualifiedProperties', // 'derived properties' used to be called 'qualified properties'
    custom(
      (values) =>
        serializeArray(
          values,
          (value) => serialize(V1_derivedPropertySchema, value),
          true,
        ),
      (values) =>
        deserializeArray(
          values,
          (v: V1_StereotypePtr) => deserialize(V1_derivedPropertySchema, v),
          false,
        ),
    ),
  ),
  stereotypes: custom(
    (values) =>
      serializeArray(
        values,
        (value) => serialize(V1_stereotypePtrSchema, value),
        true,
      ),
    (values) =>
      deserializeArray(
        values,
        (v: V1_StereotypePtr) => deserialize(V1_stereotypePtrSchema, v),
        false,
      ),
  ),
  superTypes: custom(
    (values) => serializeArray(values, (value) => value, true),
    (values) => deserializeArray(values, (v: string) => v, false),
  ),
  taggedValues: custom(
    (values) =>
      serializeArray(
        values,
        (value) => serialize(V1_taggedValueSchema, value),
        true,
      ),
    (values) =>
      deserializeArray(
        values,
        (v: V1_StereotypePtr) => deserialize(V1_taggedValueSchema, v),
        false,
      ),
  ),
});

export const V1_associationSchema = createModelSchema(V1_Association, {
  _type: usingConstantValueSchema(V1_ASSOCIATION_ELEMENT_PROTOCOL_TYPE),
  name: primitive(),
  package: primitive(),
  properties: list(usingModelSchema(V1_propertySchema)),
  derivedProperties: alias(
    'qualifiedProperties', // 'derived properties' used to be called 'qualified properties'
    custom(
      (values) =>
        serializeArray(
          values,
          (value) => serialize(V1_derivedPropertySchema, value),
          true,
        ),
      (values) =>
        deserializeArray(
          values,
          (v: V1_StereotypePtr) => deserialize(V1_derivedPropertySchema, v),
          false,
        ),
    ),
  ),
  stereotypes: custom(
    (values) =>
      serializeArray(
        values,
        (value) => serialize(V1_stereotypePtrSchema, value),
        true,
      ),
    (values) =>
      deserializeArray(
        values,
        (v: V1_StereotypePtr) => deserialize(V1_stereotypePtrSchema, v),
        false,
      ),
  ),
  taggedValues: custom(
    (values) =>
      serializeArray(
        values,
        (value) => serialize(V1_taggedValueSchema, value),
        true,
      ),
    (values) =>
      deserializeArray(
        values,
        (v: V1_StereotypePtr) => deserialize(V1_taggedValueSchema, v),
        false,
      ),
  ),
});

export const V1_functionSchema = createModelSchema(
  V1_ConcreteFunctionDefinition,
  {
    _type: usingConstantValueSchema(V1_FUNCTION_ELEMENT_PROTOCOL_TYPE),
    body: list(raw()),
    name: primitive(),
    package: primitive(),
    parameters: list(usingModelSchema(V1_rawVariableModelSchema)),
    returnMultiplicity: usingModelSchema(V1_multiplicitySchema),
    returnType: primitive(),
    stereotypes: custom(
      (values) =>
        serializeArray(
          values,
          (value) => serialize(V1_stereotypePtrSchema, value),
          true,
        ),
      (values) =>
        deserializeArray(
          values,
          (v: V1_StereotypePtr) => deserialize(V1_stereotypePtrSchema, v),
          false,
        ),
    ),
    taggedValues: custom(
      (values) =>
        serializeArray(
          values,
          (value) => serialize(V1_taggedValueSchema, value),
          true,
        ),
      (values) =>
        deserializeArray(
          values,
          (v: V1_StereotypePtr) => deserialize(V1_taggedValueSchema, v),
          false,
        ),
    ),
  },
);
