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
import { observable, action, computed, makeObservable } from 'mobx';
import { SerializationFactory } from '@finos/legend-shared';

export class ProjectStructureVersion {
  version!: number;
  extensionVersion?: number | undefined;

  constructor() {
    makeObservable(this, {
      version: observable,
      extensionVersion: observable,
      setVersion: action,
      setExtensionVersion: action,
      fullVersion: computed,
    });
  }

  static readonly serialization = new SerializationFactory(
    createModelSchema(ProjectStructureVersion, {
      extensionVersion: optional(primitive()),
      version: primitive(),
    }),
  );

  setVersion(version: number): void {
    this.version = version;
  }

  setExtensionVersion(extensionVersion: number): void {
    this.extensionVersion = extensionVersion;
  }

  get fullVersion(): string {
    if (this.extensionVersion) {
      return `${this.version}.${this.extensionVersion}`;
    }
    return `${this.version}`;
  }
}
