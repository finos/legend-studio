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

import { ClassMapping } from './ClassMapping';
import { Property } from 'V1/model/packageableElements/domain/Property';
import { Class } from 'V1/model/packageableElements/domain/Class';

export class MappingClass extends Class {
  // NOTE: The (de)serializer model schema is not placed in this class
  // as it need to refer to ClassMapping, OperationClassMapping, etc. which will cause
  // circular dependency and since accessing class before usage will throw Reference Error
  // so we put the serialization code of this class in Mapping
  // See https://stackoverflow.com/questions/31219420/are-variables-declared-with-let-or-const-not-hoisted-in-es6
  // See https://github.com/mobxjs/serializr/issues/9
  setImplementation!: ClassMapping;
  rootClass!: Class;
  localProperties!: Property;
}
