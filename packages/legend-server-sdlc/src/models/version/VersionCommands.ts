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

import { observable, action, makeObservable } from 'mobx';
import { createModelSchema, primitive } from 'serializr';
import {
  assertNonEmptyString,
  SerializationFactory,
} from '@finos/legend-shared';

export enum NewVersionType {
  MAJOR = 'MAJOR',
  MINOR = 'MINOR',
  PATCH = 'PATCH',
}

export class CreateVersionCommand {
  versionType = NewVersionType.PATCH;
  revisionId = '';
  notes = '';

  constructor() {
    makeObservable(this, {
      versionType: observable,
      revisionId: observable,
      notes: observable,
      setRevisionId: action,
      setNotes: action,
    });
  }

  static readonly serialization = new SerializationFactory(
    createModelSchema(CreateVersionCommand, {
      notes: primitive(),
      revisionId: primitive(),
      versionType: primitive(),
    }),
  );

  setRevisionId = (revisionId: string): void => {
    this.revisionId = revisionId;
  };

  setNotes = (notes: string): void => {
    this.notes = notes;
  };

  validate(): void {
    assertNonEmptyString(
      this.revisionId,
      `Can't create new release: version ID is empty`,
    );
    assertNonEmptyString(
      this.notes,
      `Can't create new release: release notes is empty`,
    );
  }
}
