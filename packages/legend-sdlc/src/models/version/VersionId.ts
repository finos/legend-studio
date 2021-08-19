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
import { action, computed, observable, makeObservable } from 'mobx';
import { assertTrue, SerializationFactory } from '@finos/legend-shared';

export class VersionId {
  majorVersion: number;
  minorVersion: number;
  patchVersion: number;

  constructor(
    majorVersion?: number,
    minorVersion?: number,
    patchVersion?: number,
  ) {
    makeObservable(this, {
      majorVersion: observable,
      minorVersion: observable,
      patchVersion: observable,
      setMajorVersion: action,
      setMinorVersion: action,
      setPatchVersion: action,
      id: computed,
      pathId: computed,
      setId: action,
    });

    this.majorVersion = majorVersion ?? 0;
    this.minorVersion = minorVersion ?? 0;
    this.patchVersion = patchVersion ?? 1;
  }

  static readonly serialization = new SerializationFactory(
    createModelSchema(VersionId, {
      majorVersion: primitive(),
      minorVersion: primitive(),
      patchVersion: primitive(),
    }),
  );

  setMajorVersion(version: number): void {
    this.majorVersion = version;
  }
  setMinorVersion(version: number): void {
    this.minorVersion = version;
  }
  setPatchVersion(version: number): void {
    this.patchVersion = version;
  }

  get id(): string {
    return `${this.majorVersion}.${this.minorVersion}.${this.patchVersion}`;
  }
  get pathId(): string {
    return `${this.majorVersion}_${this.minorVersion}_${this.patchVersion}`;
  }

  setId(id: string): void {
    const versionArray = id.split('.');
    const majorVersion = parseInt(versionArray[0], 10);
    const minorVersion = parseInt(versionArray[1], 10);
    const patchVersion = parseInt(versionArray[2], 10);
    assertTrue(
      versionArray.length === 3 ||
        Boolean(majorVersion) ||
        Boolean(minorVersion) ||
        Boolean(patchVersion),
      'Versions must be in the format <majorVersion>.<minVersion>.<patchVersion>',
    );
    this.setMajorVersion(majorVersion);
    this.setMinorVersion(minorVersion);
    this.setPatchVersion(patchVersion);
  }
}
