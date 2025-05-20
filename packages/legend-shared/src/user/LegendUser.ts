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

import { createModelSchema, primitive } from 'serializr';
import { SerializationFactory } from '../application/SerializationUtils.js';

export class LegendUser {
  country!: string;
  displayName!: string;
  firstName!: string;
  departmentName!: string;
  divisionName!: string;
  title!: string;
  kerberos!: string;
  city!: string;
  lastName!: string;

  static readonly serialization = new SerializationFactory(
    createModelSchema(LegendUser, {
      country: primitive(),
      displayName: primitive(),
      firstName: primitive(),
      departmentName: primitive(),
      divisionName: primitive(),
      title: primitive(),
      kerberos: primitive(),
      city: primitive(),
      lastName: primitive(),
    }),
  );
}
