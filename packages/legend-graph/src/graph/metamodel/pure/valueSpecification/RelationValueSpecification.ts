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

import { InstanceValue } from './InstanceValue.js';
import type {
  ValueSpecification,
  ValueSpecificationVisitor,
} from './ValueSpecification.js';

/**
 * To Keep simple we have modeled the metamodel classes ColSpec, FuncColSpec, AggColSpec
 * with the singluar `Col Spec` class.
 * @discrepancy model
 */
export class ColSpec {
  name!: string;
  type: string | undefined;
  function1: ValueSpecification | undefined;
  function2: ValueSpecification | undefined;
}

export class ColSpecArray {
  colSpecs: ColSpec[] = [];
}

export class ColSpecArrayInstance extends InstanceValue {
  override values: ColSpecArray[] = [];

  override accept_ValueSpecificationVisitor<T>(
    visitor: ValueSpecificationVisitor<T>,
  ): T {
    return visitor.visit_ColSpecArrayInstance(this);
  }
}
