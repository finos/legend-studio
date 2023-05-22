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
import { PRIMITIVE_TYPE } from '../../../../MetaModelConst.js';

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
}
