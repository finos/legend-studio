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

import { observable, computed, makeObservable } from 'mobx';
import { CORE_HASH_STRUCTURE } from '../../../../../../../MetaModelConst';
import {
  type Hashable,
  hashArray,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import type { FlatData } from './FlatData';
import type { FlatDataProperty } from './FlatDataProperty';
import type { RootFlatDataRecordType } from './FlatDataDataType';

export class FlatDataSection implements Hashable {
  owner: FlatData;
  driverId: string;
  name: string;
  sectionProperties: FlatDataProperty[] = [];
  recordType?: RootFlatDataRecordType | undefined;

  constructor(driverId: string, name: string, owner: FlatData) {
    makeObservable(this, {
      driverId: observable,
      name: observable,
      sectionProperties: observable,
      recordType: observable,
      hashCode: computed,
    });

    this.name = name;
    this.driverId = driverId;
    this.owner = owner;
  }

  getRecordType = (): RootFlatDataRecordType =>
    guaranteeNonNullable(
      this.recordType,
      `No record type defined in section '${this.name}' of flat-data store '${this.owner.path}'`,
    );

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.FLAT_DATA_SECTION,
      this.driverId,
      this.name,
      hashArray(this.sectionProperties),
      this.recordType ?? '',
    ]);
  }
}
