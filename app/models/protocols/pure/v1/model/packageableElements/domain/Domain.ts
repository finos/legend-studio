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

import { serializable, object, list } from 'serializr';
import { Class } from './Class';
import { Association } from './Association';
import { Enumeration } from './Enumeration';
import { Profile } from './Profile';
import { ConcreteFunctionDefinition } from 'V1/model/packageableElements/function/ConcreteFunctionDefinition';
import { Measure } from './Measure';

export class Domain {
  @serializable(list(object(Profile))) profiles: Profile[] = [];
  @serializable(list(object(Enumeration))) enums: Enumeration[] = [];
  @serializable(list(object(Measure))) measures: Measure[] = [];
  @serializable(list(object(Class))) classes: Class[] = [];
  @serializable(list(object(Association))) associations: Association[] = [];
  @serializable(list(object(ConcreteFunctionDefinition))) functions: ConcreteFunctionDefinition[] = [];
}
