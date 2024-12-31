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

import { Type } from '../domain/Type.js';
import type { PackageableElementVisitor } from '../PackageableElement.js';
import { Function } from '../domain/Function.js';

export class RelationColumn extends Function {
  type: Type;

  constructor(name: string, type: Type) {
    super(name);
    this.type = type;
  }

  override accept_PackageableElementVisitor<T>(
    visitor: PackageableElementVisitor<T>,
  ): T {
    throw new Error('Method not implemented.');
  }
}

export class RelationType extends Type {
  static ID = 'NO_ID';
  columns: RelationColumn[] = [];

  override accept_PackageableElementVisitor<T>(
    visitor: PackageableElementVisitor<T>,
  ): T {
    throw new Error('Method not implemented.');
  }
}
