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
  type ModelSchema,
  serialize,
  custom,
  deserialize,
} from 'serializr';
import {
  customList,
  customListWithSchema,
  optionalCustom,
  usingConstantValueSchema,
  usingModelSchema,
  isString,
  type PlainObject,
} from '@finos/legend-shared';
import {
  V1_multiplicityModelSchema,
  V1_packageableElementPointerModelSchema,
  V1_serializePackageableElementPointer,
  V1_stereotypePtrModelSchema,
  V1_taggedValueModelSchema,
} from '../../../transformation/pureProtocol/serializationHelpers/V1_CoreSerializationHelper.js';
import { V1_Enumeration } from '../../../model/packageableElements/domain/V1_Enumeration.js';
import {
  V1_Profile,
  V1_ProfileStereotype,
  V1_ProfileTag,
} from '../../../model/packageableElements/domain/V1_Profile.js';
import {
  V1_Measure,
  V1_Unit,
} from '../../../model/packageableElements/domain/V1_Measure.js';
import { V1_Class } from '../../../model/packageableElements/domain/V1_Class.js';
import { V1_Association } from '../../../model/packageableElements/domain/V1_Association.js';
import { V1_ConcreteFunctionDefinition } from '../../../model/packageableElements/function/V1_ConcreteFunctionDefinition.js';
import { V1_EnumValue } from '../../../model/packageableElements/domain/V1_EnumValue.js';
import { V1_Property } from '../../../model/packageableElements/domain/V1_Property.js';
import { V1_DerivedProperty } from '../../../model/packageableElements/domain/V1_DerivedProperty.js';
import { V1_PropertyPointer } from '../../../model/packageableElements/domain/V1_PropertyPointer.js';
import { V1_Constraint } from '../../../model/packageableElements/domain/V1_Constraint.js';
import {
  V1_rawLambdaModelSchema,
  V1_rawVariableModelSchema,
} from './V1_RawValueSpecificationSerializationHelper.js';
import { V1_INTERNAL__UnknownFunctionActivator } from '../../../model/packageableElements/function/V1_INTERNAL__UnknownFunctionActivator.js';
import { V1_SnowflakeApp } from '../../../model/packageableElements/function/V1_SnowflakeApp.js';
import {
  V1_HostedServiceDeploymentConfigurationAppModelSchema,
  V1_SnowflakeAppDeploymentConfigurationAppModelSchema,
  V1_deserializeDeploymentOwnership,
  V1_serializeDeploymentOwership,
  V1_serializeOwnership,
  V1_deserializeOwnership,
  V1_PostDeploymentActionSchema,
} from './V1_FunctionActivatorSerializationHelper.js';
import {
  V1_deserializeTestSuite,
  V1_serializeTestSuite,
} from './V1_TestSerializationHelper.js';
import type { PureProtocolProcessorPlugin } from '../../../../PureProtocolProcessorPlugin.js';
import type { V1_TestSuite } from '../../../model/test/V1_TestSuite.js';
import { V1_DefaultValue } from '../../../model/packageableElements/domain/V1_DefaultValue.js';
import { V1_HostedService } from '../../../model/packageableElements/function/V1_HostedService.js';
import {
  V1_deserializeGenericType,
  V1_genericTypeModelSchema,
} from './V1_TypeSerializationHelper.js';
import { PackageableElementPointerType } from '../../../../../../../graph/MetaModelConst.js';
import type { V1_PackageableElementPointer } from '../../../model/packageableElements/V1_PackageableElement.js';

export const V1_CLASS_ELEMENT_PROTOCOL_TYPE = 'class';
export const V1_PROFILE_ELEMENT_PROTOCOL_TYPE = 'profile';
export const V1_ENUMERATION_ELEMENT_PROTOCOL_TYPE = 'Enumeration';
export const V1_MEASURE_ELEMENT_PROTOCOL_TYPE = 'measure';
export const V1_UNIT_ELEMENT_PROTOCOL_TYPE = 'unit';
export const V1_ASSOCIATION_ELEMENT_PROTOCOL_TYPE = 'association';
export const V1_FUNCTION_ELEMENT_PROTOCOL_TYPE = 'function';
export const V1_SNOWFLAKE_APP_TYPE = 'snowflakeApp';
export const V1_HOSTED_SERVICE_TYPE = 'hostedService';

export const V1_propertyPointerModelSchema = createModelSchema(
  V1_PropertyPointer,
  {
    class: optional(primitive()),
    property: primitive(),
  },
);

const V1_ProfileStereotypeSchema = createModelSchema(V1_ProfileStereotype, {
  value: primitive(),
});

const V1_ProfileTagSchema = createModelSchema(V1_ProfileTag, {
  value: primitive(),
});

export const V1_serializeProfileStereotypeSchema = (
  json: PlainObject<V1_ProfileStereotype> | string,
): V1_ProfileTag => {
  if (isString(json)) {
    return new V1_ProfileStereotype(json);
  }
  return deserialize(V1_ProfileStereotypeSchema, json);
};

export const V1_serializeProfileTagSchema = (
  json: PlainObject<V1_ProfileTag> | string,
): V1_ProfileTag => {
  if (isString(json)) {
    return new V1_ProfileTag(json);
  }
  return deserialize(V1_ProfileTagSchema, json);
};

export const V1_profileModelSchema = createModelSchema(V1_Profile, {
  _type: usingConstantValueSchema(V1_PROFILE_ELEMENT_PROTOCOL_TYPE),
  name: primitive(),
  package: primitive(),
  stereotypes: customList(
    (val: V1_ProfileStereotype) => serialize(V1_ProfileStereotypeSchema, val),
    (val) => V1_serializeProfileStereotypeSchema(val),

    { INTERNAL__forceReturnEmptyInTest: true },
  ),
  tags: customList(
    (val: V1_ProfileTag) => serialize(V1_ProfileTagSchema, val),
    (val) => V1_serializeProfileTagSchema(val),

    { INTERNAL__forceReturnEmptyInTest: true },
  ),
});

// ------------------------------------- Enumeration -------------------------------------

export const V1_enumValueModelSchema = createModelSchema(V1_EnumValue, {
  stereotypes: customListWithSchema(V1_stereotypePtrModelSchema, {
    INTERNAL__forceReturnEmptyInTest: true,
  }),
  taggedValues: customListWithSchema(V1_taggedValueModelSchema, {
    INTERNAL__forceReturnEmptyInTest: true,
  }),
  value: primitive(),
});

export const V1_enumerationModelSchema = createModelSchema(V1_Enumeration, {
  _type: usingConstantValueSchema(V1_ENUMERATION_ELEMENT_PROTOCOL_TYPE),
  name: primitive(),
  package: primitive(),
  stereotypes: customListWithSchema(V1_stereotypePtrModelSchema, {
    INTERNAL__forceReturnEmptyInTest: true,
  }),
  taggedValues: customListWithSchema(V1_taggedValueModelSchema, {
    INTERNAL__forceReturnEmptyInTest: true,
  }),
  values: list(usingModelSchema(V1_enumValueModelSchema)),
});

// ------------------------------------- Measure -------------------------------------

export const V1_unitModelSchema = createModelSchema(V1_Unit, {
  _type: usingConstantValueSchema(V1_UNIT_ELEMENT_PROTOCOL_TYPE),
  conversionFunction: optional(usingModelSchema(V1_rawLambdaModelSchema)),
  measure: primitive(),
  name: primitive(),
  package: primitive(),
});

export const V1_measureModelSchema = createModelSchema(V1_Measure, {
  _type: usingConstantValueSchema(V1_MEASURE_ELEMENT_PROTOCOL_TYPE),
  canonicalUnit: optional(usingModelSchema(V1_unitModelSchema)),
  name: primitive(),
  nonCanonicalUnits: list(usingModelSchema(V1_unitModelSchema)),
  package: primitive(),
});

export const V1_snowflakeAppModelSchema = createModelSchema(V1_SnowflakeApp, {
  _type: usingConstantValueSchema(V1_SNOWFLAKE_APP_TYPE),
  description: optional(primitive()),
  applicationName: primitive(),
  function: usingModelSchema(V1_packageableElementPointerModelSchema),
  name: primitive(),
  package: primitive(),
  permissionScheme: optional(primitive()),
  actions: list(usingModelSchema(V1_PostDeploymentActionSchema)),
  usageRole: optional(primitive()),
  stereotypes: customListWithSchema(V1_stereotypePtrModelSchema, {
    INTERNAL__forceReturnEmptyInTest: true,
  }),
  taggedValues: customListWithSchema(V1_taggedValueModelSchema, {
    INTERNAL__forceReturnEmptyInTest: true,
  }),
  activationConfiguration: usingModelSchema(
    V1_SnowflakeAppDeploymentConfigurationAppModelSchema,
  ),
  ownership: optionalCustom(
    (val) => V1_serializeDeploymentOwership(val),
    (val) => V1_deserializeDeploymentOwnership(val),
  ),
});

export const V1_HostedServiceModelSchema = createModelSchema(V1_HostedService, {
  _type: usingConstantValueSchema(V1_HOSTED_SERVICE_TYPE),
  documentation: optional(primitive()),
  pattern: primitive(),
  autoActivateUpdates: primitive(),
  storeModel: primitive(),
  generateLineage: primitive(),
  function: usingModelSchema(V1_packageableElementPointerModelSchema),
  name: primitive(),
  package: primitive(),
  stereotypes: customListWithSchema(V1_stereotypePtrModelSchema, {
    INTERNAL__forceReturnEmptyInTest: true,
  }),
  taggedValues: customListWithSchema(V1_taggedValueModelSchema, {
    INTERNAL__forceReturnEmptyInTest: true,
  }),
  ownership: optionalCustom(
    (val) => V1_serializeOwnership(val),
    (val) => V1_deserializeOwnership(val),
  ),
  actions: list(usingModelSchema(V1_PostDeploymentActionSchema)),
  activationConfiguration: optional(
    usingModelSchema(V1_HostedServiceDeploymentConfigurationAppModelSchema),
  ),
});

// ------------------------------------- Class -------------------------------------

export const V1_defaultValueModelSchema = createModelSchema(V1_DefaultValue, {
  value: raw(),
});
export const V1_propertyModelSchema = createModelSchema(V1_Property, {
  aggregation: optional(primitive()),
  defaultValue: optional(usingModelSchema(V1_defaultValueModelSchema)),
  genericType: custom(
    (val) => serialize(V1_genericTypeModelSchema, val),
    (val) => V1_deserializeGenericType(val),
    {
      beforeDeserialize: function (callback, jsonValue, jsonParentValue) {
        /** @backwardCompatibility */
        if (
          jsonParentValue.type !== undefined &&
          jsonParentValue.genericType === undefined
        ) {
          callback(null, jsonParentValue.type);
        } else {
          callback(null, jsonParentValue.genericType);
        }
      },
    },
  ),
  multiplicity: usingModelSchema(V1_multiplicityModelSchema),
  name: primitive(),
  stereotypes: customListWithSchema(V1_stereotypePtrModelSchema, {
    INTERNAL__forceReturnEmptyInTest: true,
  }),
  taggedValues: customListWithSchema(V1_taggedValueModelSchema, {
    INTERNAL__forceReturnEmptyInTest: true,
  }),
});

export const V1_derivedPropertyModelSchema = createModelSchema(
  V1_DerivedProperty,
  {
    body: raw(),
    name: primitive(),
    parameters: raw(),
    returnGenericType: custom(
      (val) => serialize(V1_genericTypeModelSchema, val),
      (val) => V1_deserializeGenericType(val),
      {
        beforeDeserialize: function (callback, jsonValue, jsonParentValue) {
          /** @backwardCompatibility */
          if (
            jsonParentValue.returnType !== undefined &&
            jsonParentValue.returnGenericType === undefined
          ) {
            callback(null, jsonParentValue.returnType);
          } else {
            callback(null, jsonParentValue.returnGenericType);
          }
        },
      },
    ),
    returnMultiplicity: usingModelSchema(V1_multiplicityModelSchema),
    stereotypes: customListWithSchema(V1_stereotypePtrModelSchema, {
      INTERNAL__forceReturnEmptyInTest: true,
    }),
    taggedValues: customListWithSchema(V1_taggedValueModelSchema, {
      INTERNAL__forceReturnEmptyInTest: true,
    }),
  },
);

export const V1_constraintModelSchema = createModelSchema(V1_Constraint, {
  enforcementLevel: optional(primitive()),
  externalId: optional(primitive()),
  functionDefinition: usingModelSchema(V1_rawLambdaModelSchema),
  messageFunction: optional(usingModelSchema(V1_rawLambdaModelSchema)),
  name: primitive(),
});

export const V1_classModelSchema = createModelSchema(V1_Class, {
  _type: usingConstantValueSchema(V1_CLASS_ELEMENT_PROTOCOL_TYPE),
  constraints: customListWithSchema(V1_constraintModelSchema, {
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
  properties: customListWithSchema(V1_propertyModelSchema, {
    INTERNAL__forceReturnEmptyInTest: true,
  }),
  derivedProperties: alias(
    'qualifiedProperties', // 'derived properties' used to be called 'qualified properties'
    customListWithSchema(V1_derivedPropertyModelSchema, {
      INTERNAL__forceReturnEmptyInTest: true,
    }),
  ),
  stereotypes: customListWithSchema(V1_stereotypePtrModelSchema, {
    INTERNAL__forceReturnEmptyInTest: true,
  }),
  superTypes: customList(
    (val: V1_PackageableElementPointer) =>
      serialize(V1_packageableElementPointerModelSchema, val),
    (val) =>
      V1_serializePackageableElementPointer(
        val,
        PackageableElementPointerType.DATA,
      ),

    { INTERNAL__forceReturnEmptyInTest: true },
  ),
  taggedValues: customListWithSchema(V1_taggedValueModelSchema, {
    INTERNAL__forceReturnEmptyInTest: true,
  }),
});

// ------------------------------------- Association -------------------------------------

export const V1_associationModelSchema = createModelSchema(V1_Association, {
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
  properties: list(usingModelSchema(V1_propertyModelSchema)),
  derivedProperties: alias(
    'qualifiedProperties', // 'derived properties' used to be called 'qualified properties'
    customListWithSchema(V1_derivedPropertyModelSchema, {
      INTERNAL__forceReturnEmptyInTest: true,
    }),
  ),
  stereotypes: customListWithSchema(V1_stereotypePtrModelSchema, {
    INTERNAL__forceReturnEmptyInTest: true,
  }),
  taggedValues: customListWithSchema(V1_taggedValueModelSchema, {
    INTERNAL__forceReturnEmptyInTest: true,
  }),
});

// ------------------------------------- Function -------------------------------------

export const V1_functionModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_ConcreteFunctionDefinition> =>
  createModelSchema(V1_ConcreteFunctionDefinition, {
    _type: usingConstantValueSchema(V1_FUNCTION_ELEMENT_PROTOCOL_TYPE),
    body: list(raw()),
    name: primitive(),
    package: primitive(),
    parameters: list(usingModelSchema(V1_rawVariableModelSchema)),
    postConstraints: list(primitive()), // NOTE: these are not currently supported and just added to pass roundtrip test
    preConstraints: list(primitive()), // NOTE: these are not currently supported and just added to pass roundtrip test
    returnGenericType: custom(
      (val) => serialize(V1_genericTypeModelSchema, val),
      (val) => V1_deserializeGenericType(val),
      {
        beforeDeserialize: function (callback, jsonValue, jsonParentValue) {
          /** @backwardCompatibility */
          if (
            jsonParentValue.returnType !== undefined &&
            jsonParentValue.returnGenericType === undefined
          ) {
            callback(null, jsonParentValue.returnType);
          } else {
            callback(null, jsonValue);
          }
        },
      },
    ),
    returnMultiplicity: usingModelSchema(V1_multiplicityModelSchema),
    stereotypes: customListWithSchema(V1_stereotypePtrModelSchema, {
      INTERNAL__forceReturnEmptyInTest: true,
    }),
    taggedValues: customListWithSchema(V1_taggedValueModelSchema, {
      INTERNAL__forceReturnEmptyInTest: true,
    }),
    tests: customList(
      (value: V1_TestSuite) => V1_serializeTestSuite(value, plugins),
      (value) => V1_deserializeTestSuite(value, plugins),
      {
        INTERNAL__forceReturnEmptyInTest: true,
      },
    ),
  });

export const V1_INTERNAL__UnknownFunctionActivatorModelSchema =
  createModelSchema(V1_INTERNAL__UnknownFunctionActivator, {
    function: usingModelSchema(V1_packageableElementPointerModelSchema),
    name: primitive(),
    package: primitive(),
  });
