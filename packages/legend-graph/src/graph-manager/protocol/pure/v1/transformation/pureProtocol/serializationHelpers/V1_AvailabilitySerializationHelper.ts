/**
 * Copyright (c) 2026-present, Goldman Sachs
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
  type PlainObject,
  usingConstantValueSchema,
  usingModelSchema,
  optionalCustomList,
} from '@finos/legend-shared';
import {
  createModelSchema,
  custom,
  deserialize,
  list,
  optional,
  primitive,
  raw,
  serialize,
  type ModelSchema,
} from 'serializr';
import { V1_rawLambdaModelSchema } from './V1_RawValueSpecificationSerializationHelper.js';
import { V1_AppDirNodeModelSchema } from './lakehouse/V1_CoreEntitlementsSerializationHelper.js';
import { V1_relationElementsDataModelSchema } from './V1_DataElementSerializationHelper.js';
import {
  V1_TestSuiteType,
  V1_serializeTestAssertion,
  V1_deserializeTestAssertion,
} from './V1_TestSerializationHelper.js';
import { ATOMIC_TEST_TYPE } from '../../../../../../../graph/MetaModelConst.js';
import {
  V1_Availability,
  V1_AVAILABILITY_ELEMENT_PROTOCOL_TYPE,
} from '../../../model/packageableElements/availability/V1_Availability.js';
import { V1_Notification } from '../../../model/packageableElements/availability/V1_Notification.js';
import { V1_AvailabilityTestSuite } from '../../../model/packageableElements/availability/V1_AvailabilityTestSuite.js';
import { V1_AvailabilityBarrierTest } from '../../../model/packageableElements/availability/V1_AvailabilityBarrierTest.js';

const V1_notificationModelSchema = createModelSchema(V1_Notification, {
  content: optional(raw()),
  type: optional(primitive()),
});

const V1_availabilityBarrierTestModelSchema = createModelSchema(
  V1_AvailabilityBarrierTest,
  {
    _type: usingConstantValueSchema(ATOMIC_TEST_TYPE.Availability_Barrier_Test),
    assertions: list(
      custom(
        (value) => V1_serializeTestAssertion(value),
        (value) => V1_deserializeTestAssertion(value),
      ),
    ),
    doc: optional(primitive()),
    id: primitive(),
    watermarkSerializationFormat: optional(primitive()),
  },
);

const V1_availabilityTestSuiteModelSchema = (
  _plugins: unknown[],
): ModelSchema<V1_AvailabilityTestSuite> =>
  createModelSchema(V1_AvailabilityTestSuite, {
    _type: usingConstantValueSchema(V1_TestSuiteType.AVAILABILITY_TEST_SUITE),
    doc: optional(primitive()),
    id: primitive(),
    testData: optional(usingModelSchema(V1_relationElementsDataModelSchema)),
    tests: optionalCustomList(
      (value) => serialize(V1_availabilityBarrierTestModelSchema, value),
      (value) => deserialize(V1_availabilityBarrierTestModelSchema, value),
    ),
  });

export const V1_availabilityModelSchema = (
  plugins: unknown[],
): ModelSchema<V1_Availability> =>
  createModelSchema(V1_Availability, {
    _type: usingConstantValueSchema(V1_AVAILABILITY_ELEMENT_PROTOCOL_TYPE),
    barrier: usingModelSchema(V1_rawLambdaModelSchema),
    extraIngestDefinitions: optional(list(primitive())),
    name: primitive(),
    notification: optional(usingModelSchema(V1_notificationModelSchema)),
    owner: optional(usingModelSchema(V1_AppDirNodeModelSchema)),
    package: primitive(),
    testSuites: optionalCustomList(
      (value) => serialize(V1_availabilityTestSuiteModelSchema(plugins), value),
      (value) =>
        deserialize(V1_availabilityTestSuiteModelSchema(plugins), value),
    ),
  });

export const V1_serializeAvailability = (
  protocol: V1_Availability,
  plugins: unknown[],
): PlainObject<V1_Availability> =>
  serialize(V1_availabilityModelSchema(plugins), protocol);

export const V1_deserializeAvailability = (
  json: PlainObject<V1_Availability>,
  plugins: unknown[],
): V1_Availability => deserialize(V1_availabilityModelSchema(plugins), json);
