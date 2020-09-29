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

import { VersionId } from 'SDLC/version/VersionId';
import { computed, observable } from 'mobx';
import { object, serializable } from 'serializr';

export interface VersionSelectOption {
  label: string;
  value: string;
}

export class Version {
  @observable @serializable projectId!: string;
  @observable @serializable revisionId!: string;
  @observable @serializable notes!: string;
  @observable @serializable(object(VersionId)) id!: VersionId;

  @computed get versionOption(): VersionSelectOption {
    return ({
      label: this.id.id,
      value: this.id.id
    });
  }
}
