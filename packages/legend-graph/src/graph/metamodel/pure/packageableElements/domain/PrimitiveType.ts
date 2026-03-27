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
  ELEMENT_PATH_DELIMITER,
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

/**
 * Maps a precise primitive type path to its corresponding standard PRIMITIVE_TYPE.
 * Accepts both full paths (e.g. 'meta::pure::precisePrimitives::Varchar')
 * and short names (e.g. 'Varchar').
 * Returns undefined if the path is not a recognized precise primitive type.
 */
export const getCorrespondingStandardPrimitiveType = (
  precisePrimitivePath: string,
): PRIMITIVE_TYPE | undefined => {
  const PRECISE_PRIMITIVE_TO_STANDARD = new Map<string, PRIMITIVE_TYPE>([
    [PRECISE_PRIMITIVE_TYPE.VARCHAR, PRIMITIVE_TYPE.STRING],
    [PRECISE_PRIMITIVE_TYPE.INT, PRIMITIVE_TYPE.INTEGER],
    [PRECISE_PRIMITIVE_TYPE.TINY_INT, PRIMITIVE_TYPE.INTEGER],
    [PRECISE_PRIMITIVE_TYPE.U_TINY_INT, PRIMITIVE_TYPE.INTEGER],
    [PRECISE_PRIMITIVE_TYPE.SMALL_INT, PRIMITIVE_TYPE.INTEGER],
    [PRECISE_PRIMITIVE_TYPE.U_SMALL_INT, PRIMITIVE_TYPE.INTEGER],
    [PRECISE_PRIMITIVE_TYPE.U_INT, PRIMITIVE_TYPE.INTEGER],
    [PRECISE_PRIMITIVE_TYPE.BIG_INT, PRIMITIVE_TYPE.INTEGER],
    [PRECISE_PRIMITIVE_TYPE.U_BIG_INT, PRIMITIVE_TYPE.INTEGER],
    [PRECISE_PRIMITIVE_TYPE.FLOAT, PRIMITIVE_TYPE.FLOAT],
    [PRECISE_PRIMITIVE_TYPE.DOUBLE, PRIMITIVE_TYPE.FLOAT],
    [PRECISE_PRIMITIVE_TYPE.DECIMAL, PRIMITIVE_TYPE.DECIMAL],
    [PRECISE_PRIMITIVE_TYPE.NUMERIC, PRIMITIVE_TYPE.DECIMAL],
    [PRECISE_PRIMITIVE_TYPE.STRICTDATE, PRIMITIVE_TYPE.STRICTDATE],
    [PRECISE_PRIMITIVE_TYPE.DATETIME, PRIMITIVE_TYPE.DATETIME],
    [PRECISE_PRIMITIVE_TYPE.TIMESTAMP, PRIMITIVE_TYPE.DATETIME],
    [PRECISE_PRIMITIVE_TYPE.STRICTTIME, PRIMITIVE_TYPE.STRICTTIME],
  ]);

  // Try exact full path match first
  const fullPathMatch = PRECISE_PRIMITIVE_TO_STANDARD.get(precisePrimitivePath);
  if (fullPathMatch !== undefined) {
    return fullPathMatch;
  }

  // If input has no path delimiter, try matching by short name
  if (!precisePrimitivePath.includes(ELEMENT_PATH_DELIMITER)) {
    for (const [fullPath, standardType] of PRECISE_PRIMITIVE_TO_STANDARD) {
      if (extractElementNameFromPath(fullPath) === precisePrimitivePath) {
        return standardType;
      }
    }
  }

  return undefined;
};

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
