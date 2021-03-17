/**
 * Copyright 2020 Goldman Sachs
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

import { observable, makeObservable } from 'mobx';
import type { SetImplementation } from '../../../model/packageableElements/mapping/SetImplementation';
import { Class } from '../../../model/packageableElements/domain/Class';
import type { Property } from '../domain/Property';

export class MappingClass extends Class {
  setImplementation: SetImplementation;
  class: Class;
  localProperties: Property[] = [];

  constructor(
    name: string,
    _class: Class,
    setImplementation: SetImplementation,
  ) {
    super(name);
    makeObservable(this, {
      setImplementation: observable,
      class: observable,
    });

    this.class = _class;
    this.setImplementation = setImplementation;
  }
}
