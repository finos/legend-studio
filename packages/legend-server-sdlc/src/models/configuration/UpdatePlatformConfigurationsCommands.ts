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
  type Hashable,
  SerializationFactory,
  serializeArray,
  deserializeArray,
  hashArray,
  optionalCustom,
} from '@finos/legend-shared';
import { makeObservable, observable, computed } from 'mobx';
import { createModelSchema, serialize, deserialize } from 'serializr';
import { PlatformConfiguration } from './PlatformConfiguration.js';

const PROJECT_PLATFORM_CONFIG_STRUCTURE = 'PROJECT_PLATFORM_CONFIG';

export class UpdatePlatformConfigurationsCommand implements Hashable {
  platformConfigurations?: PlatformConfiguration[] | undefined;

  constructor(platformConfigurations: PlatformConfiguration[] | undefined) {
    makeObservable(this, {
      platformConfigurations: observable,
      hashCode: computed,
    });

    this.platformConfigurations = platformConfigurations;
  }

  static readonly serialization = new SerializationFactory(
    createModelSchema(PlatformConfiguration, {
      platformConfigurations: optionalCustom(
        (values) => {
          //to update SDLC and remove platform configs if user has previously set them,
          //one must make a nested null update like (platformConfigurations: platformConfigurations: [null])
          if (
            (values as PlatformConfiguration[]).every(
              (p) => p.name === undefined && p.version === undefined,
            )
          ) {
            return null;
          }

          return serializeArray(
            values,
            (value) =>
              serialize(PlatformConfiguration.serialization.schema, value),
            {
              skipIfEmpty: true,
              INTERNAL__forceReturnEmptyInTest: true,
            },
          );
        },
        (values) =>
          deserializeArray(
            values,
            (v) => deserialize(PlatformConfiguration.serialization.schema, v),
            {
              skipIfEmpty: true,
            },
          ),
      ),
    }),
  );

  get hashCode(): string {
    if (this.platformConfigurations) {
      return hashArray([
        PROJECT_PLATFORM_CONFIG_STRUCTURE,
        hashArray(this.platformConfigurations),
      ]);
    } else {
      return '';
    }
  }
}
