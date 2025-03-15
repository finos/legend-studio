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

import { test, expect, jest, beforeEach } from '@jest/globals';
import { unitTest } from '../../__test-utils__/TestUtils.js';
import {
  SerializationFactory,
  deserializeMap,
  serializeMap,
  deserializeArray,
  serializeArray,
  TEMPORARY__disableModelSchemaExtensionMechanism,
} from '../SerializationUtils.js';
import { createModelSchema, primitive, SKIP } from 'serializr';

// Mock environment variables for testing
beforeEach(() => {
  jest.resetModules();
  // eslint-disable-next-line no-process-env
  process.env.NODE_ENV = 'test';
  // eslint-disable-next-line no-process-env
  process.env.TEST_GROUP = '';
});

// Test classes
class TestPerson {
  name: string;
  age: number;
  address?: string | undefined;

  constructor(name: string, age: number, address?: string) {
    this.name = name;
    this.age = age;
    this.address = address;
  }
}

const personSchema = createModelSchema(TestPerson, {
  name: primitive(),
  age: primitive(),
  address: primitive(),
});

class TestEmployee extends TestPerson {
  department: string;

  constructor(name: string, age: number, department: string, address?: string) {
    super(name, age, address);
    this.department = department;
  }
}

const employeeSchema = createModelSchema(TestEmployee, {
  name: primitive(),
  age: primitive(),
  address: primitive(),
  department: primitive(),
});

test(
  unitTest('SerializationFactory toJson serializes objects correctly'),
  () => {
    const factory = new SerializationFactory(personSchema);
    const person = new TestPerson('John Doe', 30, '123 Main St');

    const json = factory.toJson(person);

    expect(json).toEqual({
      name: 'John Doe',
      age: 30,
      address: '123 Main St',
    });
  },
);

test(
  unitTest('SerializationFactory fromJson deserializes objects correctly'),
  () => {
    const factory = new SerializationFactory(personSchema);
    const json = {
      name: 'Jane Smith',
      age: 25,
      address: '456 Oak Ave',
    };

    const person = factory.fromJson(json);

    expect(person).toBeInstanceOf(TestPerson);
    expect(person.name).toBe('Jane Smith');
    expect(person.age).toBe(25);
    expect(person.address).toBe('456 Oak Ave');
  },
);

test(
  unitTest(
    'SerializationFactory handles null values with deserializeNullAsUndefined option',
  ),
  () => {
    // Without deserializeNullAsUndefined
    const factory1 = new SerializationFactory(personSchema);
    const json1 = {
      name: 'Bob',
      age: 40,
      address: null,
    };

    // With deserializeNullAsUndefined
    const factory2 = new SerializationFactory(personSchema, {
      deserializeNullAsUndefined: true,
    });
    const json2 = {
      name: 'Bob',
      age: 40,
      address: null,
    };

    const person1 = factory1.fromJson(json1);
    const person2 = factory2.fromJson(json2);

    expect(person1.address).toBeNull();
    expect(person2.address).toBeUndefined();
  },
);

test(unitTest('deserializeMap converts object to Map'), () => {
  const obj = {
    key1: { name: 'John', age: 30 },
    key2: { name: 'Jane', age: 25 },
  };

  const deserializer = (val: any) => {
    const person = new TestPerson(val.name, val.age);
    return person;
  };

  const map = deserializeMap(obj, deserializer);

  expect(map).toBeInstanceOf(Map);
  expect(map.size).toBe(2);
  expect(map.get('key1')).toBeInstanceOf(TestPerson);
  expect(map.get('key1')?.name).toBe('John');
  expect(map.get('key2')?.name).toBe('Jane');
});

test(unitTest('serializeMap converts Map to object'), () => {
  const map = new Map<string, TestPerson>();
  map.set('key1', new TestPerson('John', 30));
  map.set('key2', new TestPerson('Jane', 25));

  const serializer = (val: TestPerson) => ({
    name: val.name,
    age: val.age,
  });

  const obj = serializeMap(map, serializer);

  expect(obj).toEqual({
    key1: { name: 'John', age: 30 },
    key2: { name: 'Jane', age: 25 },
  });
});

test(
  unitTest(
    'deserializeArray converts array of objects to array of model instances',
  ),
  () => {
    const jsonArray = [
      { name: 'John', age: 30 },
      { name: 'Jane', age: 25 },
    ];

    const deserializer = (val: any) => new TestPerson(val.name, val.age);

    const result = deserializeArray(jsonArray, deserializer);

    expect(Array.isArray(result)).toBe(true);
    expect(result).not.toBe(SKIP);

    // Type assertion to help TypeScript understand the type after SKIP check
    const typedResult = result as TestPerson[];
    expect(typedResult.length).toBe(2);
    expect(typedResult[0]).toBeInstanceOf(TestPerson);
    expect(typedResult[0]?.name).toBe('John');
    expect(typedResult[1]?.name).toBe('Jane');

    // Test with non-array input
    const emptyResult = deserializeArray('not an array', deserializer);
    expect(emptyResult).toEqual([]);

    // Test with skipIfEmpty option
    const skippedResult = deserializeArray('not an array', deserializer, {
      skipIfEmpty: true,
    });
    expect(skippedResult).toBe(SKIP);
  },
);

test(
  unitTest(
    'serializeArray converts array of model instances to array of objects',
  ),
  () => {
    const modelArray = [new TestPerson('John', 30), new TestPerson('Jane', 25)];

    const serializer = (val: TestPerson) => ({
      name: val.name,
      age: val.age,
    });

    // Basic serialization
    const result = serializeArray(modelArray, serializer);

    expect(Array.isArray(result)).toBe(true);
    expect(result).not.toBe(SKIP);

    // Type assertion to help TypeScript understand the type after SKIP check
    const typedResult = result as Array<{ name: string; age: number }>;
    expect(typedResult.length).toBe(2);
    expect(typedResult[0]).toEqual({ name: 'John', age: 30 });
    expect(typedResult[1]).toEqual({ name: 'Jane', age: 25 });

    // Test with empty array and skipIfEmpty option
    const emptyArray: TestPerson[] = [];
    const emptyResult = serializeArray(emptyArray, serializer, {
      skipIfEmpty: true,
    });
    expect(emptyResult).toBe(SKIP);

    // Test with non-array input
    const nonArrayResult = serializeArray('not an array', serializer);
    expect(nonArrayResult).toBe(SKIP);
  },
);

test(unitTest('serializeArray handles test environment special cases'), () => {
  const modelArray = [new TestPerson('John', 30), new TestPerson('Jane', 25)];

  const serializer = (val: TestPerson) => ({
    name: val.name,
    age: val.age,
  });

  // Set up test environment for engine-roundtrip
  // eslint-disable-next-line no-process-env
  process.env.TEST_GROUP = 'engine-roundtrip';

  // Empty array with forceReturnEmptyInTest option
  const emptyArray: TestPerson[] = [];
  const emptyResult = serializeArray(emptyArray, serializer, {
    skipIfEmpty: true,
    INTERNAL__forceReturnEmptyInTest: true,
  });

  // Should return empty array instead of SKIP in test environment
  expect(emptyResult).toEqual([]);

  // Non-array with forceReturnEmptyInTest option
  const nonArrayResult = serializeArray('not an array', serializer, {
    INTERNAL__forceReturnEmptyInTest: true,
  });

  // Should return empty array instead of SKIP in test environment
  expect(nonArrayResult).toEqual([]);
});

test(
  unitTest(
    'TEMPORARY__disableModelSchemaExtensionMechanism disables schema extension',
  ),
  () => {
    // Create a schema with extension
    const baseSchema = personSchema;
    const extendedSchema = employeeSchema;

    // Set up extension relationship
    extendedSchema.extends = baseSchema;

    // Disable extension
    const disabledSchema =
      TEMPORARY__disableModelSchemaExtensionMechanism(extendedSchema);

    // Verify extension is disabled
    expect(disabledSchema.extends).toBeUndefined();

    // Verify it's the same schema object (modified in place)
    expect(disabledSchema).toBe(extendedSchema);
  },
);
