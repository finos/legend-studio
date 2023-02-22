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

import type { TreeNodeData } from '@finos/legend-art';
import { guaranteeType, type Clazz } from '@finos/legend-shared';
import {
  custom,
  SKIP,
  deserialize,
  createModelSchema,
  primitive,
} from 'serializr';

abstract class DirectoryAttribute {
  id!: string;
  path!: string;
  RO!: boolean;
}

class FileDirectoryAttribute extends DirectoryAttribute {
  declare id: string;
  declare path: string;
  file!: boolean;
  statusType?: string; // used for change detection
}

createModelSchema(FileDirectoryAttribute, {
  id: primitive(),
  path: primitive(),
  file: primitive(),
  statusType: primitive(),
  RO: primitive(),
});

class FolderDirectoryAttribute extends DirectoryAttribute {
  declare id: string;
  declare path: string;
  repo?: boolean;
}

createModelSchema(FolderDirectoryAttribute, {
  id: primitive(),
  path: primitive(),
  repo: primitive(),
  RO: primitive(),
});

export class DirectoryNode {
  li_attr!: DirectoryAttribute;
  text!: string;
  icon?: string;
  children?: boolean;
  state?: string;

  get isFolderNode(): boolean {
    return this.li_attr instanceof FolderDirectoryAttribute;
  }

  get isFileNode(): boolean {
    return this.li_attr instanceof FileDirectoryAttribute;
  }

  get isRepoNode(): boolean {
    return (
      this.li_attr instanceof FolderDirectoryAttribute &&
      Boolean(this.li_attr.repo)
    );
  }

  getNodeAttribute<T extends DirectoryAttribute>(clazz: Clazz<T>): T {
    return guaranteeType(
      this.li_attr,
      clazz,
      `Expected directory node attribute to be of type '${clazz.name}'`,
    );
  }
}

createModelSchema(DirectoryNode, {
  li_attr: custom(
    () => SKIP,
    (value) => {
      if (value.file) {
        return deserialize(FileDirectoryAttribute, value);
      } else {
        return deserialize(FolderDirectoryAttribute, value);
      }
    },
  ),
  text: primitive(),
  icon: primitive(),
  children: primitive(),
  state: primitive(),
});

export interface DirectoryTreeNode extends TreeNodeData {
  data: DirectoryNode;
  isLoading: boolean;
}
