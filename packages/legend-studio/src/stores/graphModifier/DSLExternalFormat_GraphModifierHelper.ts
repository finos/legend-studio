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

import type {
  Binding,
  ExternalFormatSchema,
  ModelUnit,
  PackageableElement,
  PackageableElementReference,
  SchemaSet,
  UrlStream,
  BindingTransformer,
} from '@finos/legend-graph';
import { addUniqueEntry, changeEntry, deleteEntry } from '@finos/legend-shared';
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
export const externalFormat_schemaSet_addSchema = action(
  (ss: SchemaSet, value: ExternalFormatSchema): void => {
    addUniqueEntry(ss.schemas, value);
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
    bt.binding = value;
  },
);
export const externalFormat_Binding_setSchemaSet = action(
  (binding: Binding, value: SchemaSet | undefined): void => {
    binding.schemaSet.setValue(value);
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
    binding.modelUnit = value;
  },
);
export const externalFormat_modelUnit_addPackageableElementIncludes = action(
  (
    mU: ModelUnit,
    value: PackageableElementReference<PackageableElement>,
  ): void => {
    addUniqueEntry(mU.packageableElementIncludes, value);
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
export const externalFormat_modelUnit_updatePackageableElementIncludes = action(
  (
    mU: ModelUnit,
    oldValue: PackageableElementReference<PackageableElement>,
    newValue: PackageableElementReference<PackageableElement>,
  ): void => {
    changeEntry(mU.packageableElementIncludes, oldValue, newValue);
  },
);
export const externalFormat_modelUnit_addPackageableElementExcludes = action(
  (
    mU: ModelUnit,
    value: PackageableElementReference<PackageableElement>,
  ): void => {
    addUniqueEntry(mU.packageableElementExcludes, value);
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
export const externalFormat_modelUnit_updatePackageableElementExcludes = action(
  (
    mU: ModelUnit,
    oldValue: PackageableElementReference<PackageableElement>,
    newValue: PackageableElementReference<PackageableElement>,
  ): void => {
    changeEntry(mU.packageableElementExcludes, oldValue, newValue);
  },
);
