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
  type Binding,
  type ExternalFormatSchema,
  type ModelUnit,
  type PackageableElement,
  type PackageableElementReference,
  type SchemaSet,
  type UrlStream,
  type BindingTransformer,
  observe_ExternalFormatSchema,
  observe_PackageableElementReference,
  observe_ModelUnit,
} from '@finos/legend-graph';
import { addUniqueEntry, deleteEntry } from '@finos/legend-shared';
import { action } from 'mobx';

export const externalFormat_urlStream_setUrl = action(
  (us: UrlStream, val: string): void => {
    us.url = val;
  },
);
export const externalFormat_schema_setId = action(
  (s: ExternalFormatSchema, value: string): void => {
    s.id = value;
  },
);
export const externalFormat_schema_setLocation = action(
  (s: ExternalFormatSchema, value: string): void => {
    s.location = value;
  },
);
export const externalFormat_schema_setContent = action(
  (s: ExternalFormatSchema, value: string): void => {
    s.content = value;
  },
);
export const externalFormat_schemaSet_setFormat = action(
  (ss: SchemaSet, value: string): void => {
    ss.format = value;
  },
);
export const externalFormat_schemaSet_setSchemas = action(
  (ss: SchemaSet, value: ExternalFormatSchema[]): void => {
    ss.schemas = value;
  },
);
export const externalFormat_schemaSet_addSchema = action(
  (ss: SchemaSet, value: ExternalFormatSchema): void => {
    addUniqueEntry(ss.schemas, observe_ExternalFormatSchema(value));
  },
);
export const externalFormat_schemaSet_deleteSchema = action(
  (ss: SchemaSet, value: ExternalFormatSchema): void => {
    deleteEntry(ss.schemas, value);
  },
);
export const externalFormat_BindingTransformer_setBinding = action(
  (
    bt: BindingTransformer,
    value: PackageableElementReference<Binding>,
  ): void => {
    bt.binding = observe_PackageableElementReference(value);
  },
);
export const externalFormat_Binding_setSchemaSet = action(
  (
    binding: Binding,
    value: PackageableElementReference<SchemaSet> | undefined,
  ): void => {
    binding.schemaSet = value
      ? observe_PackageableElementReference(value)
      : undefined;
  },
);
export const externalFormat_Binding_setSchemaId = action(
  (binding: Binding, value: string | undefined): void => {
    binding.schemaId = value;
  },
);
export const externalFormat_Binding_setContentType = action(
  (binding: Binding, value: string): void => {
    binding.contentType = value;
  },
);
export const externalFormat_Binding_setModelUnit = action(
  (binding: Binding, value: ModelUnit): void => {
    binding.modelUnit = observe_ModelUnit(value);
  },
);
export const externalFormat_modelUnit_addPackageableElementIncludes = action(
  (
    mU: ModelUnit,
    value: PackageableElementReference<PackageableElement>,
  ): void => {
    addUniqueEntry(
      mU.packageableElementIncludes,
      observe_PackageableElementReference(value),
    );
  },
);
export const externalFormat_modelUnit_deletePackageableElementIncludes = action(
  (
    mU: ModelUnit,
    value: PackageableElementReference<PackageableElement>,
  ): void => {
    deleteEntry(mU.packageableElementIncludes, value);
  },
);
export const externalFormat_modelUnit_addPackageableElementExcludes = action(
  (
    mU: ModelUnit,
    value: PackageableElementReference<PackageableElement>,
  ): void => {
    addUniqueEntry(
      mU.packageableElementExcludes,
      observe_PackageableElementReference(value),
    );
  },
);
export const externalFormat_modelUnit_deletePackageableElementExcludes = action(
  (
    mU: ModelUnit,
    value: PackageableElementReference<PackageableElement>,
  ): void => {
    deleteEntry(mU.packageableElementExcludes, value);
  },
);
