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

import { observable, action, computed, makeObservable } from 'mobx';
import { hashArray, uuid } from '@finos/legend-studio-shared';
import {
  CORE_HASH_STRUCTURE,
  SOURCR_ID_LABEL,
} from '../../../../../MetaModelConst';
import type { Hashable } from '@finos/legend-studio-shared';
import { RawLambda } from '../../../model/rawValueSpecification/RawLambda';
import type { Class } from './Class';
import type { Stubable } from '../../../model/Stubable';

export class Constraint implements Hashable, Stubable {
  uuid = uuid();
  name: string;
  owner: Class;
  functionDefinition: RawLambda; // @MARKER GENERATED MODEL DISCREPANCY --- Studio does not process lambda
  externalId?: string;
  enforcementLevel?: string;
  messageFunction?: RawLambda; // @MARKER GENERATED MODEL DISCREPANCY --- Studio does not process lambda

  constructor(name: string, owner: Class, functionDefinition: RawLambda) {
    makeObservable(this, {
      name: observable,
      owner: observable,
      functionDefinition: observable,
      externalId: observable,
      enforcementLevel: observable,
      messageFunction: observable,
      setName: action,
      setFunctionDefinition: action,
      lambdaId: computed,
      isStub: computed,
      hashCode: computed,
    });

    this.name = name;
    this.owner = owner;
    this.functionDefinition = functionDefinition;
  }

  setName(name: string): void {
    this.name = name;
  }
  setFunctionDefinition(lambda: RawLambda): void {
    this.functionDefinition = lambda;
  }

  get lambdaId(): string {
    // NOTE: Added the index here just in case but the order needs to be checked carefully as bugs may result from inaccurate orderings
    return `${this.owner.path}-${SOURCR_ID_LABEL.CONSTRAINT}-${
      this.name
    }[${this.owner.constraints.indexOf(this)}]`;
  }

  static createStub = (_class: Class): Constraint =>
    new Constraint('', _class, RawLambda.createStub());
  // the constraint is considered stub if it doesn't have a body in the function definition lambda because
  // without the function definition, it is not even parsable and so we should not transform this
  get isStub(): boolean {
    return !this.functionDefinition.body;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.CONSTRAINT,
      this.name,
      this.functionDefinition,
      this.externalId ?? '',
      this.enforcementLevel ?? '',
      this.messageFunction ?? '',
    ]);
  }
}
