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

import { type PlainObject, pruneNullValues } from '../CommonUtils.js';
import {
  type ModelSchema,
  type PropSchema,
  type AdditionalPropArgs,
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

  toJson(val: Partial<T> | T): PlainObject<T> {
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

// NOTE: we need these methods because `map()` of `serializr` tries to smartly
// determines if it should produce object or ES6 Map but we always want ES6 Map,
// so we would use this function
export const deserializeMap = <T>(
  val: Record<string, T extends object ? PlainObject<T> : T>,
  itemDeserializer: (val: T extends object ? PlainObject<T> : T) => T,
): Map<string, T> => {
  const result = new Map<string, T>();
  Object.keys(val).forEach((key: string) =>
    result.set(
      key,
      itemDeserializer(val[key] as T extends object ? PlainObject<T> : T),
    ),
  );
  return result;
};

export const serializeMap = <T>(
  val: Map<string, T>,
  itemSerializer: (val: T) => T extends object ? PlainObject<T> : T,
): PlainObject => {
  const result: PlainObject = {};
  val.forEach((v, key) => {
    result[key] = itemSerializer(v);
  });
  return result;
};

export const usingConstantValueSchema = (value: unknown): PropSchema =>
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
  additionalArgs?: AdditionalPropArgs,
): PropSchema =>
  custom(
    (val) => (val ? serializer(val) : SKIP),
    (val) => (val ? deserializer(val) : SKIP),
    additionalArgs,
  );

export const optionalCustomUsingModelSchema = <T>(
  schema: ModelSchema<T>,
): PropSchema =>
  custom(
    (val) => (val ? serialize(schema, val) : SKIP),
    (val) => (val ? deserialize(schema, val) : SKIP),
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
    skipIfEmpty?: boolean | undefined;
    /**
     * In engine, the initialization handling of list-types attributes in protocol models, either done
     * by the grammar parser or set natively in the model is fairly inconsistent. This produces protocol
     * JSONs with the field sometimes being set as empty array, or sometimes being set as nullish (hence,
     * omitted from the JSON).
     *
     * In Studio, we avoid serialize empty array altogether to lessen the size of the serialized graph to save bandwidth,
     * this optimization will cause protocol roundtrip test to fail. As such, we add this flag to make sure
     * roundtrip test can pass. Setting this flag to `true` will override the effect of `skipIfEmpty=true`
     */
    INTERNAL__forceReturnEmptyInTest?: boolean | undefined;
  },
): (T extends object ? PlainObject<T> : T)[] | typeof SKIP => {
  let forceReturnEmptyInTest = false;
  // NOTE: this block is meant for test, `webpack` will tree-shake it
  // so we never reach inside, else we would get error about `process is not defined` as we're
  // in browser environment
  // eslint-disable-next-line no-process-env
  if (process.env.NODE_ENV === 'test') {
    forceReturnEmptyInTest =
      Boolean(options?.INTERNAL__forceReturnEmptyInTest) &&
      // TODO: when we distribute engine-roundtrip tests to different test groups, we should
      // remove this condition and clean up test data accordingly.
      // eslint-disable-next-line no-process-env
      process.env.TEST_GROUP === 'engine-roundtrip';
  }
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

/**
 * This is the idiomatic usage pattern for serialization of optional list of objects.
 *
 * Notice our particular usage of `serializeArray` and `deserializeArray` that is deisnged
 * for testing and accounting for logic mismatches between servers and studio
 */
export const customListWithSchema = <T>(
  schema: ModelSchema<T>,
  options?: {
    INTERNAL__forceReturnEmptyInTest?: boolean | undefined;
  },
): PropSchema =>
  custom(
    (values) =>
      serializeArray(values, (value) => serialize(schema, value), {
        skipIfEmpty: true,
        INTERNAL__forceReturnEmptyInTest:
          options?.INTERNAL__forceReturnEmptyInTest,
      }),
    (values) =>
      deserializeArray(values, (value) => deserialize(schema, value), {
        skipIfEmpty: false,
      }),
  );

export const customList = <T>(
  serializer: (val: T) => T extends object ? PlainObject<T> : T,
  deserializer: (val: PlainObject<T>) => T,
  options?: {
    INTERNAL__forceReturnEmptyInTest?: boolean | undefined;
  },
): PropSchema =>
  custom(
    (values) =>
      serializeArray(values, (value: T) => serializer(value), {
        skipIfEmpty: true,
        INTERNAL__forceReturnEmptyInTest:
          options?.INTERNAL__forceReturnEmptyInTest,
      }),
    (values) =>
      deserializeArray(values, (value) => deserializer(value), {
        skipIfEmpty: false,
      }),
  );

export const customEquivalentList = (options?: {
  INTERNAL__forceReturnEmptyInTest?: boolean | undefined;
}): PropSchema =>
  customList(
    (value) => value,
    (value) => value,
    options,
  );

export const optionalCustomListWithSchema = <T>(
  schema: ModelSchema<T>,
  options?: {
    INTERNAL__forceReturnEmptyInTest?: boolean | undefined;
  },
): PropSchema =>
  optionalCustom(
    (values) =>
      serializeArray(values, (value) => serialize(schema, value), {
        skipIfEmpty: true,
        INTERNAL__forceReturnEmptyInTest:
          options?.INTERNAL__forceReturnEmptyInTest,
      }),
    (values) =>
      deserializeArray(values, (value) => deserialize(schema, value), {
        skipIfEmpty: false,
      }),
  );

export const optionalCustomList = <T>(
  serializer: (val: T) => T extends object ? PlainObject<T> : T,
  deserializer: (val: PlainObject<T>) => T,
  options?: {
    INTERNAL__forceReturnEmptyInTest?: boolean | undefined;
  },
): PropSchema =>
  optionalCustom(
    (values) =>
      serializeArray(values, (value: T) => serializer(value), {
        skipIfEmpty: true,
        INTERNAL__forceReturnEmptyInTest:
          options?.INTERNAL__forceReturnEmptyInTest,
      }),
    (values) =>
      deserializeArray(values, (value) => deserializer(value), {
        skipIfEmpty: false,
      }),
  );

/**
 * NOTE: this is a workaround for `serializr` to avoid the magic extension mechanism provided
 * by `createModelSchema`, where depending on the order schemas are defined, if the schema of the
 * super class is specified first, when we serialize subclasses, we would get fields of the order
 * of fields from the super classes first, followed by fields from the subclasses, not the order
 * specified in the subclass's schema.
 *
 * See https://github.com/mobxjs/serializr/issues/179
 */
export const TEMPORARY__disableModelSchemaExtensionMechanism = <T>(
  schema: ModelSchema<T>,
): ModelSchema<T> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
  schema.extends = undefined as any;
  return schema;
};
