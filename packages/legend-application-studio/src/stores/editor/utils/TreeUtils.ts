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

import type { CORE_DND_TYPE } from './DnDUtils.js';
import type { TreeNodeData } from '@finos/legend-art';
import type {
  Type,
  PackageableElement,
  Runtime,
  Store,
  Class,
  FlatDataRecordField,
  RootFlatDataRecordType,
  AbstractProperty,
} from '@finos/legend-graph';

export interface PackageTreeNodeData extends TreeNodeData {
  dndType: string;
  packageableElement: PackageableElement;
}

export interface FlatDataRecordTypeTreeNodeData extends TreeNodeData {
  field: FlatDataRecordField;
  parentType: RootFlatDataRecordType;
}

export interface RuntimeExplorerTreeNodeData extends TreeNodeData {
  data: Runtime | Store | Class;
}

export interface TypeTreeNodeData extends TreeNodeData {
  type?: Type | undefined;
  property?: AbstractProperty | undefined;
  dndType: CORE_DND_TYPE;
  parent: Type;
}
