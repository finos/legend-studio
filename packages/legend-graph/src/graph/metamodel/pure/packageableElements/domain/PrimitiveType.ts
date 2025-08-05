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

import { DataType } from './DataType.js';
import type { PackageableElementVisitor } from '../PackageableElement.js';
import {
  PRECISE_PRIMITIVE_TYPE,
  PRIMITIVE_TYPE,
} from '../../../../MetaModelConst.js';
import { extractElementNameFromPath } from '../../../../MetaModelUtils.js';

export class PrimitiveType extends DataType {
  accept_PackageableElementVisitor<T>(
    visitor: PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_PrimitiveType(this);
  }

  static readonly STRING = new PrimitiveType(PRIMITIVE_TYPE.STRING);
  static readonly BOOLEAN = new PrimitiveType(PRIMITIVE_TYPE.BOOLEAN);
  static readonly BINARY = new PrimitiveType(PRIMITIVE_TYPE.BINARY);
  static readonly NUMBER = new PrimitiveType(PRIMITIVE_TYPE.NUMBER);
  static readonly INTEGER = new PrimitiveType(PRIMITIVE_TYPE.INTEGER);
  static readonly FLOAT = new PrimitiveType(PRIMITIVE_TYPE.FLOAT);
  static readonly DECIMAL = new PrimitiveType(PRIMITIVE_TYPE.DECIMAL);
  static readonly DATE = new PrimitiveType(PRIMITIVE_TYPE.DATE);
  static readonly STRICTDATE = new PrimitiveType(PRIMITIVE_TYPE.STRICTDATE);
  static readonly DATETIME = new PrimitiveType(PRIMITIVE_TYPE.DATETIME);
  static readonly STRICTTIME = new PrimitiveType(PRIMITIVE_TYPE.STRICTTIME);
  static readonly LATESTDATE = new PrimitiveType(PRIMITIVE_TYPE.LATESTDATE);
  static readonly BYTE = new PrimitiveType(PRIMITIVE_TYPE.BYTE);
  // precise primitive
}

export class PrecisePrimitiveType extends DataType {
  static readonly VARCHAR = new PrecisePrimitiveType(
    extractElementNameFromPath(PRECISE_PRIMITIVE_TYPE.VARCHAR),
  );
  static readonly INT = new PrecisePrimitiveType(
    extractElementNameFromPath(PRECISE_PRIMITIVE_TYPE.INT),
  );
  static readonly TINY_INT = new PrecisePrimitiveType(
    extractElementNameFromPath(PRECISE_PRIMITIVE_TYPE.TINY_INT),
  );
  static readonly U_TINY_INT = new PrecisePrimitiveType(
    extractElementNameFromPath(PRECISE_PRIMITIVE_TYPE.U_TINY_INT),
  );
  static readonly SMALL_INT = new PrecisePrimitiveType(
    extractElementNameFromPath(PRECISE_PRIMITIVE_TYPE.SMALL_INT),
  );
  static readonly U_SMALL_INT = new PrecisePrimitiveType(
    extractElementNameFromPath(PRECISE_PRIMITIVE_TYPE.U_SMALL_INT),
  );
  static readonly U_INT = new PrecisePrimitiveType(
    extractElementNameFromPath(PRECISE_PRIMITIVE_TYPE.U_INT),
  );
  static readonly BIG_INT = new PrecisePrimitiveType(
    extractElementNameFromPath(PRECISE_PRIMITIVE_TYPE.BIG_INT),
  );
  static readonly U_BIG_INT = new PrecisePrimitiveType(
    extractElementNameFromPath(PRECISE_PRIMITIVE_TYPE.U_BIG_INT),
  );
  static readonly FLOAT = new PrecisePrimitiveType(
    extractElementNameFromPath(PRECISE_PRIMITIVE_TYPE.FLOAT),
  );
  static readonly DOUBLE = new PrecisePrimitiveType(
    extractElementNameFromPath(PRECISE_PRIMITIVE_TYPE.DOUBLE),
  );

  static readonly NUMERIC = new PrecisePrimitiveType(
    extractElementNameFromPath(PRECISE_PRIMITIVE_TYPE.NUMERIC),
  );

  static readonly TIMESTAMP = new PrecisePrimitiveType(
    extractElementNameFromPath(PRECISE_PRIMITIVE_TYPE.TIMESTAMP),
  );

  override accept_PackageableElementVisitor<T>(
    visitor: PackageableElementVisitor<T>,
  ): T {
    throw new Error('Method not implemented.');
  }
}

export const getPrimitiveTypeInstanceFromEnum = (
  type: PRIMITIVE_TYPE,
): PrimitiveType => {
  switch (type) {
    case PRIMITIVE_TYPE.STRING:
      return PrimitiveType.STRING;
    case PRIMITIVE_TYPE.BOOLEAN:
      return PrimitiveType.BOOLEAN;
    case PRIMITIVE_TYPE.BINARY:
      return PrimitiveType.BINARY;
    case PRIMITIVE_TYPE.NUMBER:
      return PrimitiveType.NUMBER;
    case PRIMITIVE_TYPE.INTEGER:
      return PrimitiveType.INTEGER;
    case PRIMITIVE_TYPE.FLOAT:
      return PrimitiveType.FLOAT;
    case PRIMITIVE_TYPE.DECIMAL:
      return PrimitiveType.DECIMAL;
    case PRIMITIVE_TYPE.DATE:
      return PrimitiveType.DATE;
    case PRIMITIVE_TYPE.STRICTDATE:
      return PrimitiveType.STRICTDATE;
    case PRIMITIVE_TYPE.DATETIME:
      return PrimitiveType.DATETIME;
    case PRIMITIVE_TYPE.STRICTTIME:
      return PrimitiveType.STRICTTIME;
    case PRIMITIVE_TYPE.LATESTDATE:
      return PrimitiveType.LATESTDATE;
    case PRIMITIVE_TYPE.BYTE:
      return PrimitiveType.BYTE;
    default:
      throw new Error(`Unable to get PrimitiveType class for type ${type}`);
  }
};
