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
import { action, computed, observable } from 'mobx';
import { assertTrue } from 'Utilities/GeneralUtil';

export class VersionId {
  @serializable @observable majorVersion!: number;
  @serializable @observable minorVersion!: number;
  @serializable @observable patchVersion!: number;

  constructor(majorVersion?: number, minorVersion?: number, patchVersion?: number) {
    this.majorVersion = majorVersion ?? 1;
    this.minorVersion = minorVersion ?? 0;
    this.patchVersion = patchVersion ?? 0;
  }

  @action setMajorVersion(version: number): void { this.majorVersion = version }
  @action setMinorVersion(version: number): void { this.minorVersion = version }
  @action setPatchVersion(version: number): void { this.patchVersion = version }

  @computed get id(): string { return `${this.majorVersion}.${this.minorVersion}.${this.patchVersion}` }
  @computed get pathId(): string { return `${this.majorVersion}_${this.minorVersion}_${this.patchVersion}` }

  @action
  setId(id: string): void {
    const versionArray = id.split('.');
    const majorVersion = parseInt(versionArray[0], 10);
    const minorVersion = parseInt(versionArray[1], 10);
    const patchVersion = parseInt(versionArray[2], 10);
    assertTrue(versionArray.length === 3 || Boolean(majorVersion) || Boolean(minorVersion) || Boolean(patchVersion), 'Versions must be in the format %majorVersion.$minVersion.$patchVersion');
    this.setMajorVersion(majorVersion);
    this.setMinorVersion(minorVersion);
    this.setPatchVersion(patchVersion);
  }
}
