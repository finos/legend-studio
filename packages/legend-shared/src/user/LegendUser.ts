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

import { createModelSchema, optional, primitive } from 'serializr';
import { SerializationFactory } from '../application/SerializationUtils.js';

export class LegendUser {
  city: string | undefined;
  country: string | undefined;
  departmentName: string | undefined;
  displayName: string | undefined;
  divisionName: string | undefined;
  firstName: string | undefined;
  id!: string;
  lastName!: string | undefined;
  title: string | undefined;

  constructor(id?: string | undefined, displayName?: string | undefined) {
    this.id = id ?? '';
    this.displayName = displayName ?? '';
  }

  static readonly serialization = new SerializationFactory(
    createModelSchema(LegendUser, {
      city: optional(primitive()),
      country: optional(primitive()),
      departmentName: optional(primitive()),
      displayName: optional(primitive()),
      divisionName: optional(primitive()),
      firstName: optional(primitive()),
      id: primitive(),
      lastName: optional(primitive()),
      title: optional(primitive()),
    }),
  );
}
