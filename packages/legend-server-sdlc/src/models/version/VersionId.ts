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
import {
  assertTrue,
  guaranteeNonEmptyString,
  guaranteeIsString,
  SerializationFactory,
  type PlainObject,
} from '@finos/legend-shared';

export const convertVersionToObj = (
  version: string,
): PlainObject<VersionId> | undefined => {
  if (typeof version === `string`) {
    const dotArray = version.split('.');
    if (dotArray.length === 3) {
      return {
        majorVersion: parseInt(
          guaranteeNonEmptyString(
            dotArray[0],
            `Version ID major version is missing or empty`,
          ),
          10,
        ),
        minorVersion: parseInt(
          guaranteeNonEmptyString(
            dotArray[1],
            `Version ID minor version is missing or empty`,
          ),
          10,
        ),
        patchVersion: parseInt(
          guaranteeNonEmptyString(
            dotArray[2],
            `Version ID patch version is missing or empty`,
          ),
          10,
        ),
        branchName: '',
        changeName: '',
      };
    } else {
      const branchArray = version.split('-');
      if (branchArray.length === 2) {
        return {
          majorVersion: 0,
          minorVersion: 0,
          patchVersion: 1,
          branchName: guaranteeNonEmptyString(
            branchArray[0],
            `Version ID branch name is missing or empty`,
          ),
          changeName: guaranteeNonEmptyString(
            branchArray[1],
            `Version ID change name is missing or empty`,
          ),
        };
      } else {
        return {
          majorVersion: 0,
          minorVersion: 0,
          patchVersion: 1,
          branchName: '',
          changeName: '',
        };
      }
    }
  } else {
    return version;
  }
};

export class VersionId {
  majorVersion: number;
  minorVersion: number;
  patchVersion: number;
  branchName: string;
  changeName: string;

  constructor(
    majorVersion?: number,
    minorVersion?: number,
    patchVersion?: number,
    branchName?: string,
    changeName?: string,
  ) {
    makeObservable(this, {
      majorVersion: observable,
      minorVersion: observable,
      patchVersion: observable,
      branchName: observable,
      changeName: observable,
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
    this.branchName = branchName ?? '';
    this.changeName = changeName ?? '';
  }

  static readonly serialization = new SerializationFactory(
    createModelSchema(VersionId, {
      majorVersion: primitive(),
      minorVersion: primitive(),
      patchVersion: primitive(),
      branchName: primitive(),
      changeName: primitive(),
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
  setBranchName(name: string): void {
    this.branchName = name;
  }
  setChangeName(name: string): void {
    this.changeName = name;
  }

  get id(): string {
    if (this.branchName !== '' && this.changeName !== '') {
      return `${this.branchName}-${this.changeName}`;
    }
    return `${this.majorVersion}.${this.minorVersion}.${this.patchVersion}`;
  }

  get pathId(): string {
    return `${this.majorVersion}_${this.minorVersion}_${this.patchVersion}`;
  }

  setId(id: string): void {
    let versionArray = id.split('.');
    this.resetVersion();

    // Check if it's branch version format or dot notation
    if (versionArray.length === 1) {
      versionArray = id.split('-');
      this.setBranchVersion(versionArray);
    } else {
      this.setDotNotationVersion(versionArray);
    }
  }

  resetVersion(): void {
    // reset dot notation versions
    this.setMajorVersion(0);
    this.setMinorVersion(0);
    this.setPatchVersion(1);

    // reset branch named version
    this.setBranchName('');
    this.setChangeName('');
  }

  setBranchVersion(versionArray: string[]): void {
    assertTrue(
      versionArray.length === 2,
      'version must be in the format <branchName>-<changeName>',
    );

    const branchName = guaranteeIsString(
      versionArray[0],
      `branch name is missing or non-string character passed`,
    );
    const changeName = guaranteeIsString(
      versionArray[1],
      `change name is missing or non-string character passed`,
    );
    this.setBranchName(branchName);
    this.setChangeName(changeName);
  }

  setDotNotationVersion(versionArray: string[]): void {
    assertTrue(
      versionArray.length === 3,
      'Versions must be in the format <majorVersion>.<minVersion>.<patchVersion>',
    );

    const majorVersion = parseInt(
      guaranteeNonEmptyString(
        versionArray[0],
        `Version ID major version is missing or empty`,
      ),
      10,
    );
    const minorVersion = parseInt(
      guaranteeNonEmptyString(
        versionArray[1],
        `Version ID minor version is missing or empty`,
      ),
      10,
    );
    const patchVersion = parseInt(
      guaranteeNonEmptyString(
        versionArray[2],
        `Version ID patch version is missing or empty`,
      ),
      10,
    );

    this.setMajorVersion(majorVersion);
    this.setMinorVersion(minorVersion);
    this.setPatchVersion(patchVersion);
  }
}
