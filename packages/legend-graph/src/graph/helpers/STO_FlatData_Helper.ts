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

import { guaranteeNonNullable } from '@finos/legend-shared';
import type { FlatData } from '../metamodel/pure/packageableElements/store/flatData/model/FlatData.js';
import type { RootFlatDataRecordType } from '../metamodel/pure/packageableElements/store/flatData/model/FlatDataDataType.js';
import type { FlatDataSection } from '../metamodel/pure/packageableElements/store/flatData/model/FlatDataSection.js';

export const getRootRecordType = (
  section: FlatDataSection,
): RootFlatDataRecordType =>
  guaranteeNonNullable(
    section.recordType,
    `No record type defined in section '${section.name}' of flat-data store '${section._OWNER.path}'`,
  );

export const getSection = (flatData: FlatData, name: string): FlatDataSection =>
  guaranteeNonNullable(
    flatData.sections.find((section) => section.name === name),
    `Can't find section '${name}' in flat-data store '${flatData.path}'`,
  );

export const getAllRecordTypes = (
  flatData: FlatData,
): RootFlatDataRecordType[] =>
  flatData.sections.flatMap((section) =>
    section.recordType ? [section.recordType] : [],
  );
