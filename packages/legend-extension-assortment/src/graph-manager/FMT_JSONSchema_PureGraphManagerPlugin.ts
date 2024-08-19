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

import { PureGraphManagerPlugin } from '@finos/legend-graph';
import packageJson from '../../package.json' with { type: 'json' };

export class FMT_JSONSchema_PureGraphManagerPlugin extends PureGraphManagerPlugin {
  constructor() {
    super(
      packageJson.extensions.format_json_schema_pureGraphManagerPlugin,
      packageJson.version,
    );
  }

  override getExtraExposedSystemElementPath(): string[] {
    return [
      // Provides general annotations to support the generation of JSON schemas
      'meta::json::schema::JSONSchemaGeneration',
      // Provides annotations for JSON schema data types that do not natively exist in PURE
      'meta::json::schema::JSONSchemaTypeExtension',
      // Provides annotations for JSON schema to support the creation of Java POJOs from JSON schemas
      'meta::json::schema::JSONSchemaJavaExtension',
      // Provides annotations for JSON schema Open API specific features
      'meta::json::schema::JSONSchemaOpenAPIExtension',
    ];
  }
}
