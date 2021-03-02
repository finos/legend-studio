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

import { createModelSchema, optional, primitive } from 'serializr';
import { observable, action, computed, makeObservable } from 'mobx';
import { SerializationFactory } from '@finos/legend-studio-shared';

export class ProjectStructureVersion {
  version!: number;
  extensionVersion?: number;

  constructor() {
    makeObservable(this, {
      version: observable,
      extensionVersion: observable,
      setVersion: action,
      setExtensionVersion: action,
      isInitialVersion: computed,
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

  get isInitialVersion(): boolean {
    return this.version === 0 && this.extensionVersion !== undefined;
  }
  get fullVersion(): string {
    return `${this.version}.${this.extensionVersion ?? 0}`;
  }
}
