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

import type { CORE_DND_TYPE } from '../shared/DnDUtil';
import type { Type } from '../../models/metamodels/pure/model/packageableElements/domain/Type';
import type { PackageableElement } from '../../models/metamodels/pure/model/packageableElements/PackageableElement';
import type { Runtime } from '../../models/metamodels/pure/model/packageableElements/runtime/Runtime';
import type { Store } from '../../models/metamodels/pure/model/packageableElements/store/Store';
import type { Class } from '../../models/metamodels/pure/model/packageableElements/domain/Class';
import type {
  FlatDataRecordField,
  RootFlatDataRecordType,
} from '../../models/metamodels/pure/model/packageableElements/store/flatData/model/FlatDataDataType';
import type { AbstractProperty } from '../../models/metamodels/pure/model/packageableElements/domain/AbstractProperty';
import type { TreeNodeData } from '@finos/legend-studio-components';

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
  type?: Type;
  property?: AbstractProperty;
  dndType: CORE_DND_TYPE;
  parent: Type;
}
