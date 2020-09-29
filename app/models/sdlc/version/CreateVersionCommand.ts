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

import { observable, action } from 'mobx';
import { assertTrue } from 'Utilities/GeneralUtil';

export enum VERSION_TYPE {
  MAJOR = 'MAJOR',
  MINOR = 'MINOR',
  PATCH = 'PATCH'
}

export class CreateVersionCommand {
  @observable versionType = VERSION_TYPE.MAJOR;
  @observable revisionId = '';
  @observable notes = '';

  @action setRevisionId = (revisionId: string): void => { this.revisionId = revisionId }
  @action setNotes = (notes: string): void => { this.notes = notes }

  validate(): void {
    assertTrue(Boolean(this.revisionId) && Boolean(this.notes), `Invalid version input`);
  }
}
