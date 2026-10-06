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

import { TypeFamily } from './TypeFamily.js';
import {
  findPrimitiveTypeInfo,
  type IntegerRange,
  type PRIMITIVE_TYPE_PATH,
  type PrimitiveTypeInfo,
} from './PrimitiveTypeRegistry.js';

const formatParameters = (params: readonly number[]): string =>
  params.length ? `(${params.join(',')})` : '';

const getShortName = (path: string): string =>
  path.slice(path.lastIndexOf(':') + 1);

const isValidParameter = (param: number): boolean =>
  Number.isSafeInteger(param) && param >= 0;

/**
 * The type of a column or a value: a primitive (including the engine's precise
 * primitives, e.g. `Varchar(15)`), an enumeration, or an opaque type that Cube
 * does not know.
 */
export abstract class CubeType {
  /** the full path, without parameters */
  abstract readonly path: string;
  abstract readonly family: TypeFamily;

  /** the short name with any parameters, as shown in the UI, e.g. `Varchar(15)` */
  abstract get displayName(): string;

  /** the full path with any parameters, as written in Pure */
  abstract get fullName(): string;

  /**
   * Primitive and opaque types are interned, so equal types are usually the
   * same instance. Equality is still structural, as it must hold across copies
   * of this module too: the same family and the same full name, which for an
   * enumeration is its path alone, so its values are not compared.
   */
  equals(other: CubeType): boolean {
    return (
      this === other ||
      (this.family === other.family && this.fullName === other.fullName)
    );
  }

  toString(): string {
    return this.displayName;
  }
}

/**
 * A primitive type. Instances are interned, one per path and parameters, so
 * `Varchar(5)` and `Varchar(40)` are distinct and equality is identity.
 */
export class PrimitiveType extends CubeType {
  private static readonly INSTANCES = new Map<string, PrimitiveType>();

  readonly info: PrimitiveTypeInfo;
  readonly params: readonly number[];

  private constructor(info: PrimitiveTypeInfo, params: readonly number[]) {
    super();
    this.info = info;
    this.params = Object.freeze([...params]);
  }

  /**
   * Gets the primitive type with the given full path or short name and
   * parameters. Throws if the type is unknown or the parameters don't fit it:
   * use `resolveCubeType()` for input that may hold anything.
   */
  static get(
    pathOrShortName: string,
    params: readonly number[] = [],
  ): PrimitiveType {
    const info = findPrimitiveTypeInfo(pathOrShortName);
    if (!info) {
      throw new Error(`Unknown primitive type "${pathOrShortName}"`);
    }
    if (
      params.length !== info.arity ||
      !params.every((param) => isValidParameter(param))
    ) {
      throw new Error(
        `Primitive type "${info.shortName}" takes ${info.arity} parameter(s) as non-negative integers, but got (${params.join(',')})`,
      );
    }
    const key = `${info.path}${formatParameters(params)}`;
    let type = PrimitiveType.INSTANCES.get(key);
    if (!type) {
      type = new PrimitiveType(info, params);
      PrimitiveType.INSTANCES.set(key, type);
    }
    return type;
  }

  get path(): PRIMITIVE_TYPE_PATH {
    return this.info.path;
  }

  get family(): TypeFamily {
    return this.info.family;
  }

  get displayName(): string {
    return `${this.info.shortName}${formatParameters(this.params)}`;
  }

  get fullName(): string {
    return `${this.info.path}${formatParameters(this.params)}`;
  }

  /** the parent in the type hierarchy, e.g. `String` for `Varchar(15)` */
  get parent(): PrimitiveType | undefined {
    return this.info.parentPath
      ? PrimitiveType.get(this.info.parentPath)
      : undefined;
  }
}

/** An enumeration. Two enumerations are equal when their paths are, whatever their values. */
export class EnumType extends CubeType {
  readonly path: string;
  readonly values: readonly string[];

  constructor(path: string, values: readonly string[]) {
    super();
    if (!path) {
      throw new Error(`Enumeration path cannot be empty`);
    }
    if (!values.length) {
      throw new Error(`Enumeration "${path}" must have at least one value`);
    }
    if (new Set(values).size !== values.length) {
      throw new Error(`Enumeration "${path}" has duplicate values`);
    }
    this.path = path;
    this.values = Object.freeze([...values]);
  }

  get family(): TypeFamily {
    return TypeFamily.ENUM;
  }

  get displayName(): string {
    return getShortName(this.path);
  }

  get fullName(): string {
    return this.path;
  }
}

/**
 * A type Cube does not know, e.g. a new engine type. It is carried through
 * unchanged but never compared or given values. Instances are interned, one
 * per path and parameters.
 */
export class OpaqueType extends CubeType {
  private static readonly INSTANCES = new Map<string, OpaqueType>();

  readonly path: string;
  readonly params: readonly number[];

  private constructor(path: string, params: readonly number[]) {
    super();
    this.path = path;
    this.params = Object.freeze([...params]);
  }

  static get(path: string, params: readonly number[] = []): OpaqueType {
    // path and parameters kept apart, so a path `Foo(1)` is not the type
    // `Foo` with the parameter 1: each is saved back as it was read
    const key = JSON.stringify([path, params]);
    let type = OpaqueType.INSTANCES.get(key);
    if (!type) {
      type = new OpaqueType(path, params);
      OpaqueType.INSTANCES.set(key, type);
    }
    return type;
  }

  get family(): TypeFamily {
    return TypeFamily.OPAQUE;
  }

  get displayName(): string {
    return `${getShortName(this.path)}${formatParameters(this.params)}`;
  }

  get fullName(): string {
    return `${this.path}${formatParameters(this.params)}`;
  }
}

/**
 * Type guards that go by the family, so unlike `instanceof` they also work
 * across copies of this module.
 */
export const isPrimitiveType = (type: CubeType): type is PrimitiveType =>
  type.family !== TypeFamily.ENUM && type.family !== TypeFamily.OPAQUE;

export const isEnumType = (type: CubeType): type is EnumType =>
  type.family === TypeFamily.ENUM;

/** The values an integer literal of the type may take, for the INTEGER family */
export const getIntegerRange = (type: CubeType): IntegerRange | undefined =>
  isPrimitiveType(type) ? type.info.integerRange : undefined;

/**
 * Resolves a type from a path (full or short) and parameters, as they come from
 * the engine or a saved spec. Never throws: a path Cube does not know, or
 * parameters that don't fit the type, give an `OpaqueType`. Enumerations are
 * not resolved here, since their values come from the model.
 */
export const resolveCubeType = (
  path: string,
  params: readonly number[] = [],
): CubeType => {
  const info = findPrimitiveTypeInfo(path);
  return info &&
    params.length === info.arity &&
    params.every((param) => isValidParameter(param))
    ? PrimitiveType.get(info.path, params)
    : OpaqueType.get(path, params);
};
