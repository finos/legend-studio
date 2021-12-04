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

import type { PlainObject } from '../CommonUtils';
import { pruneNullValues } from '../CommonUtils';
import type { ClazzOrModelSchema, ModelSchema, PropSchema } from 'serializr';
import { custom, SKIP, deserialize, serialize } from 'serializr';

// NOTE: we need these methods because `map()` of `serializr` tries to smartly determines if it should produce object or ES6 Map
// but we always want ES6 Map, so we would use this function
export const deseralizeMap = <T>(
  val: Record<string, T>,
  schema?: ClazzOrModelSchema<T>,
): Map<string, T> => {
  const result = new Map<string, T>();
  Object.keys(val).forEach((key: string) =>
    result.set(
      key,
      schema ? deserialize(schema, val[key]) : (val[key] as NonNullable<T>),
    ),
  );
  return result;
};

export const serializeMap = <T>(
  val: Map<string, T> | undefined,
  schema?: ClazzOrModelSchema<T>,
): Record<PropertyKey, unknown> => {
  const result: Record<PropertyKey, unknown> = {};
  val?.forEach((v, key) => {
    result[key] = schema ? serialize(schema, v) : v;
  });
  return result;
};

export class BasicSerializationFactory<T> {
  readonly schema: ModelSchema<T>;

  constructor(schema: ModelSchema<T>) {
    this.schema = schema;
  }
}

// NOTE: due to contra-variance and variance, this class will not work for polymorphism
// hence, use `BasicSerializationFactory`
export class SerializationFactory<T> extends BasicSerializationFactory<T> {
  toJson = (val: T): PlainObject<T> => serialize(this.schema, val);
  fromJson = (val: PlainObject<T>): T => deserialize(this.schema, val);
}

/**
 * Similar to {@link SerializationFactory} but used for entities coming from server which returns
 * values which have not been set to `null` instead of `undefined`. This will cause `serializr` to
 * throw.
 *
 * e.g.
 * // in Server (Java + Jackson):
 * Person person; // this will be serialized to `null` by Jackson (depending on the setting of the server)
 *
 * // in our code (TS + serializr):
 * person: optional(object(Person))
 *
 * --> error thrown
 */
export class NullphobicSerializationFactory<T> {
  /**
   * Since we customize the behavior of the deserializer, we must not expose the schema
   */
  private readonly schema: ModelSchema<T>;

  constructor(schema: ModelSchema<T>) {
    this.schema = schema;
  }

  toJson = (val: T): PlainObject<T> => serialize(this.schema, val);
  fromJson = (val: PlainObject<T>): T =>
    deserialize(this.schema, pruneNullValues(val));
}

export const usingModelSchema = <T>(schema: ModelSchema<T>): PropSchema =>
  custom(
    (value) => (value === undefined ? SKIP : serialize(schema, value)),
    (value) => deserialize(schema, value),
  );

/* eslint-disable @typescript-eslint/no-explicit-any */
export const serializeArray = (
  values: any,
  itemSerializer: (val: any) => any,
  skipIfEmpty: boolean,
): any[] | typeof SKIP =>
  Array.isArray(values)
    ? values.length
      ? values.map((value) => itemSerializer(value))
      : skipIfEmpty
      ? SKIP
      : []
    : SKIP;

export const deserializeArray = (
  values: any,
  itemDeserializer: (val: any) => any,
  skipIfEmpty: boolean,
): any[] | typeof SKIP => {
  if (Array.isArray(values)) {
    return values.map(itemDeserializer);
  }
  return skipIfEmpty ? SKIP : [];
};
/* eslint-enable @typescript-eslint/no-explicit-any */

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
export const optionalCustom = <T>(
  serializer: (val: T) => PlainObject<T>,
  deserializer: (val: PlainObject<T>) => T,
): PropSchema =>
  custom(
    (val) => (val ? serializer(val) : SKIP),
    (val) => (val ? deserializer(val) : SKIP),
  );
