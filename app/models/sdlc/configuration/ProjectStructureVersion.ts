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

import { serializable } from 'serializr';
import { observable, action, computed } from 'mobx';

export class ProjectStructureVersion {
  @serializable @observable version!: number;
  @serializable @observable extensionVersion!: number | null;

  @action setVersion(version: number): void { this.version = version }
  @action setExtensionVersion(extensionVersion: number): void { this.extensionVersion = extensionVersion }

  @computed get isInitialVersion(): boolean { return this.version === 0 && this.extensionVersion === null }
  @computed get fullVersion(): string { return `${this.version}.${this.extensionVersion ?? 0}` }
}
