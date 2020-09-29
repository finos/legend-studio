/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { observable, action, computed } from 'mobx';
import { hashArray } from 'Utilities/HashUtil';
import { HASH_STRUCTURE, SOURCR_ID_LABEL } from 'MetaModelConst';
import { Hashable } from 'MetaModelUtility';
import { uuid } from 'Utilities/GeneralUtil';
import { Lambda } from 'MM/model/valueSpecification/raw/Lambda';
import { Class } from './Class';
import { Stubable } from 'MM/Stubable';

export class Constraint implements Hashable, Stubable {
  uuid = uuid();
  @observable name: string;
  @observable owner: Class;
  @observable functionDefinition: Lambda;
  @observable externalId?: string;
  @observable enforcementLevel?: string;
  @observable messageFunction?: Lambda;

  constructor(name: string, owner: Class, functionDefinition: Lambda) {
    this.name = name;
    this.owner = owner;
    this.functionDefinition = functionDefinition;
  }

  @action setName(name: string): void { this.name = name }
  @action setFunctionDefinition(lambda: Lambda): void { this.functionDefinition = lambda }

  @computed get lambdaId(): string {
    // NOTE: Added the index here just in case but the order needs to be checked carefully as bugs may result from inaccurate orderings
    return `${this.owner.path}-${SOURCR_ID_LABEL.CONSTRAINT}-${this.name}[${this.owner.constraints.indexOf(this)}]`;
  }

  static createStub = (_class: Class): Constraint => new Constraint('', _class, Lambda.createStub());
  // the constraint is considered stub if it doesn't have a body in the function definition lambda because
  // without the function definition, it is not even parsable and so we should not transform this
  @computed get isStub(): boolean { return !this.functionDefinition.body }

  @computed get hashCode(): string {
    return hashArray([
      HASH_STRUCTURE.CONSTRAINT,
      this.name,
      this.functionDefinition,
      this.externalId ?? '',
      this.enforcementLevel ?? '',
      this.messageFunction ?? ''
    ]);
  }
}
