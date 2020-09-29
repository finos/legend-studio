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

import { DND_TYPE } from './DnDUtil';
import { Type } from 'MM/model/packageableElements/domain/Type';
import { PackageableElement } from 'MM/model/packageableElements/PackageableElement';
import { Runtime } from 'MM/model/packageableElements/runtime/Runtime';
import { Store } from 'MM/model/packageableElements/store/Store';
import { Class } from 'MM/model/packageableElements/domain/Class';

export interface TreeNodeData {
  isSelected?: boolean;
  isOpen?: boolean;
  id: string;
  label: string;
  childrenIds?: string[];
}

export interface TreeData<T extends TreeNodeData> {
  rootIds: string[];
  nodes: Map<string, T>;
}

export interface PackageTreeNodeData extends TreeNodeData {
  dndType: DND_TYPE;
  packageableElement: PackageableElement;
}
export interface RuntimeExplorerTreeNodeData extends TreeNodeData {
  data: Runtime | Store | Class;
}

export interface TypeTreeNodeData extends TreeNodeData {
  type?: Type;
  dndType: DND_TYPE;
  parent: Type;
}
