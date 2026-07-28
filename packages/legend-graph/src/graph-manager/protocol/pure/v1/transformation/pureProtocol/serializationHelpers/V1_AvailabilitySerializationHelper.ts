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

import { type PlainObject, optionalCustomList } from '@finos/legend-shared';
import {
  createModelSchema,
  custom,
  deserialize,
  list,
  optional,
  primitive,
  serialize,
} from 'serializr';
import { V1_relationElementModelSchema } from './V1_DataElementSerializationHelper.js';
import {
  V1_serializeTestAssertion,
  V1_deserializeTestAssertion,
} from './V1_TestSerializationHelper.js';
import {
  V1_Availability,
  V1_AVAILABILITY_ELEMENT_PROTOCOL_TYPE,
} from '../../../model/packageableElements/availability/V1_Availability.js';
import { V1_AvailabilityTestSuite } from '../../../model/packageableElements/availability/V1_AvailabilityTestSuite.js';
import { V1_AvailabilityBarrierTest } from '../../../model/packageableElements/availability/V1_AvailabilityBarrierTest.js';
import {
  V1_RelationElementsData,
  type V1_RelationElement,
} from '../../../model/data/V1_EmbeddedData.js';
import type { V1_PackageableElement } from '../../../model/packageableElements/V1_PackageableElement.js';

// NOTE: the engine's `AvailabilityBarrierTest` / `AvailabilityTestSuite`
// protocol classes do NOT declare `_type` fields (unlike the top-level
// `Availability` element). Adding `_type` to the wire payload causes
// Jackson to throw `UnrecognizedPropertyException`. This mirrors the way
// ingest test suites are serialized in `V1_IngestSerializationHelper`.
const V1_availabilityBarrierTestModelSchema = createModelSchema(
  V1_AvailabilityBarrierTest,
  {
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

const V1_availabilityTestSuiteModelSchema = createModelSchema(
  V1_AvailabilityTestSuite,
  {
    doc: optional(primitive()),
    id: primitive(),
    // NOTE: the engine's `AvailabilityTestSuite.testData` is a single flat
    // `RelationElement` (fields: `columns`, `paths`, `rows`) — NOT a wrapper
    // with `_type: 'relationAccessor'` + `relationElements[]`. Internally the
    // studio state / UI editor consumes `V1_RelationElementsData` (a wrapper),
    // so we adapt here: on serialize we unwrap the first `relationElement`;
    // on deserialize we rewrap the incoming bare `RelationElement` into a
    // single-element `V1_RelationElementsData`.
    testData: optional(
      custom(
        (value: V1_RelationElementsData | undefined) => {
          if (!value) {
            return undefined;
          }
          const element = value.relationElements[0];
          if (!element) {
            return undefined;
          }
          return serialize(V1_relationElementModelSchema, element);
        },
        (value: PlainObject<V1_RelationElement> | undefined) => {
          if (!value) {
            return undefined;
          }
          const element = deserialize(V1_relationElementModelSchema, value);
          const wrapper = new V1_RelationElementsData();
          wrapper.relationElements = [element];
          return wrapper;
        },
      ),
    ),
    tests: optionalCustomList(
      (value) => serialize(V1_availabilityBarrierTestModelSchema, value),
      (value) => deserialize(V1_availabilityBarrierTestModelSchema, value),
    ),
  },
);

const V1_serializeAvailabilityTestSuite = (
  suite: V1_AvailabilityTestSuite,
): PlainObject<V1_AvailabilityTestSuite> =>
  serialize(V1_availabilityTestSuiteModelSchema, suite);

const V1_deserializeAvailabilityTestSuite = (
  json: PlainObject<V1_AvailabilityTestSuite>,
): V1_AvailabilityTestSuite =>
  deserialize(V1_availabilityTestSuiteModelSchema, json);

// Mirrors `V1_createIngestDef`: we build the V1 element by keeping the engine
// JSON payload untouched on `.content`, and only lift out the typed pieces
// (test suites) that the studio needs for its dedicated tabs. This keeps
// studio compatible even when the engine's grammar output for an availability
// element evolves.
export const V1_createAvailability = (
  name: string,
  packagePath: string,
  json: PlainObject<V1_PackageableElement>,
): V1_Availability => {
  const availability = new V1_Availability();
  availability.name = name;
  availability.package = packagePath;
  const rawTestSuites = (json as { testSuites?: PlainObject[] }).testSuites;
  availability.testSuites = Array.isArray(rawTestSuites)
    ? rawTestSuites.map(V1_deserializeAvailabilityTestSuite)
    : [];
  const { testSuites: _testSuites, ...contentWithoutTestSuites } = json;
  availability.content = contentWithoutTestSuites;
  return availability;
};

export const V1_serializeAvailability = (
  protocol: V1_Availability,
): PlainObject<V1_Availability> => {
  const raw: PlainObject<V1_Availability> = {
    ...protocol.content,
    _type: V1_AVAILABILITY_ELEMENT_PROTOCOL_TYPE,
    name: protocol.name,
    package: protocol.package,
    ...(protocol.testSuites.length
      ? {
          testSuites: protocol.testSuites.map(
            V1_serializeAvailabilityTestSuite,
          ),
        }
      : {}),
  };
  // NOTE: the graph roundtrip tests enforce alphabetical key order because the
  // engine (Java Jackson) always serializes JSON with sorted keys. Because we
  // preserve the raw engine payload on `.content`, we sort here to guarantee
  // the invariant regardless of the input key order.
  return Object.fromEntries(
    Object.entries(raw).sort(([k1], [k2]) => k1.localeCompare(k2)),
  );
};
