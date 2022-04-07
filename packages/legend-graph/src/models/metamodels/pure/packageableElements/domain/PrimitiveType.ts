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

import { PRIMITIVE_TYPE } from '../../../../../MetaModelConst';
import { DataType } from './DataType';
import type { PackageableElementVisitor } from '../PackageableElement';
import type { Type } from './Type';

export class /*toCHECK*/ PrimitiveType extends DataType {
  isSuperType(type: Type): boolean {
    if (!(type instanceof PrimitiveType)) {
      return false;
    }
    if (this.name === PRIMITIVE_TYPE.NUMBER) {
      return (
        type.name === PRIMITIVE_TYPE.INTEGER ||
        type.name === PRIMITIVE_TYPE.FLOAT ||
        type.name === PRIMITIVE_TYPE.DECIMAL
      );
    }
    if (this.name === PRIMITIVE_TYPE.DATE) {
      return (
        type.name === PRIMITIVE_TYPE.STRICTDATE ||
        type.name === PRIMITIVE_TYPE.DATETIME ||
        type.name === PRIMITIVE_TYPE.LATESTDATE
      );
    }
    return false;
  }

  isSubType(type: Type): boolean {
    if (!(type instanceof PrimitiveType)) {
      return false;
    }
    if (type.name === PRIMITIVE_TYPE.NUMBER) {
      return (
        this.name === PRIMITIVE_TYPE.INTEGER ||
        this.name === PRIMITIVE_TYPE.FLOAT ||
        this.name === PRIMITIVE_TYPE.DECIMAL
      );
    }
    if (type.name === PRIMITIVE_TYPE.DATE) {
      return (
        this.name === PRIMITIVE_TYPE.STRICTDATE ||
        this.name === PRIMITIVE_TYPE.DATETIME ||
        this.name === PRIMITIVE_TYPE.LATESTDATE
      );
    }
    return false;
  }

  accept_PackageableElementVisitor<T>(
    visitor: PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_PrimitiveType(this);
  }
}
