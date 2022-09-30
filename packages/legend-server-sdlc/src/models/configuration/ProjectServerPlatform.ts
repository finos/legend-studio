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

import {
  alias,
  createModelSchema,
  custom,
  deserialize,
  primitive,
  serialize,
} from 'serializr';
import { observable, action, computed, makeObservable } from 'mobx';
import {
  deserializeArray,
  type Hashable,
  hashArray,
  SerializationFactory,
  serializeArray,
  uuid,
} from '@finos/legend-shared';

const PROJECT_SERVER_PLATFORMS_HASH_STRUCTURE = 'PROJECT_SERVER_PLATFORMS';
const PROJECT_PLATFORM_CONFIG_STRUCTURE = 'PROJECT_PLATFORM_CONFIG';

export class ProjectServerPlatform implements Hashable {
  readonly _UUID = uuid();
  name: string;
  platformVersion: string;

  constructor(name: string, platformVersion?: string) {
    makeObservable(this, {
      name: observable,
      platformVersion: observable,
      setPlatformVersion: action,
      hashCode: computed,
    });

    this.name = name;
    this.platformVersion = platformVersion ?? '0.0.0';
  }

  static readonly serialization = new SerializationFactory(
    createModelSchema(ProjectServerPlatform, {
      platformVersion: alias('version', primitive()),
      name: primitive(),
    }),
  );

  setPlatformVersion(v: string): void {
    this.platformVersion = v;
  }

  setName(v: string): void {
    this.name = v;
  }

  get hashCode(): string {
    return hashArray([
      PROJECT_SERVER_PLATFORMS_HASH_STRUCTURE,
      this.name,
      this.platformVersion,
    ]);
  }
}

export class PlatformConfigurationUpdate implements Hashable {
  readonly _UUID = uuid();
  platformConfigurations: ProjectServerPlatform[] | null;

  constructor(platformConfigurations: ProjectServerPlatform[] | null) {
    makeObservable(this, {
      platformConfigurations: observable,
      hashCode: computed,
    });

    this.platformConfigurations = platformConfigurations;
  }

  static readonly serialization = new SerializationFactory(
    createModelSchema(ProjectServerPlatform, {
      platformConfigurations: custom(
        (values) =>
          serializeArray(
            values,
            (value) =>
              serialize(ProjectServerPlatform.serialization.schema, value),
            {
              skipIfEmpty: true,
              INTERNAL__forceReturnEmptyInTest: true,
            },
          ),
        (values) =>
          deserializeArray(
            values,
            (v) => deserialize(ProjectServerPlatform.serialization.schema, v),
            {
              skipIfEmpty: true,
            },
          ),
      ),
    }),
  );

  get hashCode(): string {
    if (this.platformConfigurations !== null) {
      return hashArray([
        PROJECT_PLATFORM_CONFIG_STRUCTURE,
        hashArray(this.platformConfigurations),
      ]);
    } else {
      return '';
    }
  }
}
