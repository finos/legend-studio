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

import { type PlainObject, pruneNullValues } from '../CommonUtils';
import {
  type ModelSchema,
  type PropSchema,
  custom,
  SKIP,
  deserialize,
  serialize,
} from 'serializr';

export class SerializationFactory<T> {
  readonly schema: ModelSchema<T>;
  readonly deserializeNullAsUndefined: boolean;

  constructor(
    schema: ModelSchema<T>,
    options?: {
      /**
       * Sometimes, entities coming from server which returns values which have not been set to `null`
       * instead of `undefined`. This will cause `serializr` to throw.
       *
       * e.g.
       * // in Server (Java + Jackson):
       * Person person; // this will be serialized to `null` by Jackson
       * (depending on the setting of the server)
       *
       * // in our code (TS + serializr):
       * person: optional(object(Person))
       *
       * --> error thrown
       */
      deserializeNullAsUndefined?: boolean | undefined;
    },
  ) {
    this.schema = schema;
    this.deserializeNullAsUndefined = Boolean(
      options?.deserializeNullAsUndefined,
    );
  }

  toJson(val: T): PlainObject<T> {
    return serialize(this.schema, val);
  }

  fromJson(val: PlainObject<T>): T {
    return deserialize(
      this.schema,
      this.deserializeNullAsUndefined ? pruneNullValues(val) : val,
    );
  }
}

export const usingModelSchema = <T>(schema: ModelSchema<T>): PropSchema =>
  custom(
    (value) => (value === undefined ? SKIP : serialize(schema, value)),
    (value) => deserialize(schema, value),
  );

export const deserializeArray = <T>(
  values: unknown,
  itemDeserializer: (val: PlainObject<T>) => T,
  options?: {
    skipIfEmpty?: boolean;
  },
): T[] | typeof SKIP => {
  if (Array.isArray(values)) {
    return (values as PlainObject<T>[]).map(itemDeserializer);
  }
  return options?.skipIfEmpty ? SKIP : [];
};

export const serializeArray = <T>(
  values: unknown,
  itemSerializer: (val: T) => T extends object ? PlainObject<T> : T,
  options?: {
    /**
     * If the array is empty, skip serializing it (the property will not
     * appear in the JSON, this is different to setting it to `undefined`)
     */
    skipIfEmpty?: boolean;
    /**
     * In engine, the initialization handling of list-types attributes in protocol models, either done
     * by the grammar parser or set natively in the model is fairly inconsistent. This produces protocol
     * JSONs with the field sometimes being set as empty array, or sometimes being set as nullish (hence,
     * omitted from the JSON).
     *
     * In Studio, we avoid serialize empty array altogether to lessen the size of the serialized graph to save bandwidth,
     * this optimization will cause protocol roundtrip test to fail. As such, we add this flag to make sure
     * roundtrip test can run fine. Setting this flag to `true` will override the effect of `skipIfEmpty=true`
     */
    INTERNAL__forceReturnEmptyInTest?: boolean;
  },
): (T extends object ? PlainObject<T> : T)[] | typeof SKIP => {
  const forceReturnEmptyInTest =
    options?.INTERNAL__forceReturnEmptyInTest &&
    // eslint-disable-next-line no-process-env
    process.env.TEST_MODE === 'grammar';
  if (Array.isArray(values)) {
    return values.length
      ? values.map((value) => itemSerializer(value))
      : forceReturnEmptyInTest
      ? []
      : options?.skipIfEmpty
      ? SKIP
      : [];
  }
  return forceReturnEmptyInTest ? [] : SKIP;
};

// NOTE: we need these methods because `map()` of `serializr` tries to smartly
// determines if it should produce object or ES6 Map but we always want ES6 Map,
// so we would use this function
export const deserializeMap = <T>(
  val: Record<string, PlainObject<T>>,
  itemDeserializer: (val: PlainObject<T>) => T,
): Map<string, T> => {
  const result = new Map<string, T>();
  Object.keys(val).forEach((key: string) =>
    result.set(key, itemDeserializer(val[key] as PlainObject<T>)),
  );
  return result;
};

export const serializeMap = <T>(
  val: Map<string, T>,
  itemSerializer: (val: T) => T extends object ? PlainObject<T> : T,
): Record<PropertyKey, unknown> => {
  const result: Record<PropertyKey, unknown> = {};
  val.forEach((v, key) => {
    result[key] = itemSerializer(v);
  });
  return result;
};

export const usingConstantValueSchema = (
  value: unknown | typeof SKIP,
): PropSchema =>
  custom(
    () => value,
    () => value,
  );

/**
 * This is the idiomatic usage pattern for `optional(custom(...))`.
 *
 * `optional` only affects serialization so we must make sure to check
 * if the value is `undefined` or not, if yes, serialize, else, return `undefined`
 * which will be processed by `optional(...)` as `SKIP`.
 *
 * `optional` does not affect deserialization, however, as `undefined` values
 * are automatically skipped
 * See https://github.com/mobxjs/serializr/issues/73#issuecomment-535641545
 */
export const optionalCustom = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  serializer: (val: any) => any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deserializer: (val: any) => any,
): PropSchema =>
  custom(
    (val) => (val ? serializer(val) : SKIP),
    (val) => (val ? deserializer(val) : SKIP),
  );
