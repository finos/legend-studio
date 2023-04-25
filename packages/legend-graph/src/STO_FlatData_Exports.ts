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

// metamodels
export { FlatData } from './graph/metamodel/pure/packageableElements/store/flatData/model/FlatData.js';
export { FlatDataSection } from './graph/metamodel/pure/packageableElements/store/flatData/model/FlatDataSection.js';
export {
  FlatDataSectionReference,
  FlatDataSectionExplicitReference,
} from './graph/metamodel/pure/packageableElements/store/flatData/model/FlatDataSectionReference.js';
export { RootFlatDataRecordTypeExplicitReference } from './graph/metamodel/pure/packageableElements/store/flatData/model/RootFlatDataRecordTypeReference.js';
export { FlatDataInstanceSetImplementation } from './graph/metamodel/pure/packageableElements/store/flatData/mapping/FlatDataInstanceSetImplementation.js';
export { AbstractFlatDataPropertyMapping } from './graph/metamodel/pure/packageableElements/store/flatData/mapping/AbstractFlatDataPropertyMapping.js';
export { EmbeddedFlatDataPropertyMapping } from './graph/metamodel/pure/packageableElements/store/flatData/mapping/EmbeddedFlatDataPropertyMapping.js';
export { FlatDataPropertyMapping } from './graph/metamodel/pure/packageableElements/store/flatData/mapping/FlatDataPropertyMapping.js';
export { FlatDataConnection } from './graph/metamodel/pure/packageableElements/store/flatData/connection/FlatDataConnection.js';
export {
  RootFlatDataRecordType,
  FlatDataRecordField,
} from './graph/metamodel/pure/packageableElements/store/flatData/model/FlatDataDataType.js';
export { DEPRECATED__FlatDataInputData as FlatDataInputData } from './graph/metamodel/pure/packageableElements/mapping/DEPRECATED__MappingTest.js';
