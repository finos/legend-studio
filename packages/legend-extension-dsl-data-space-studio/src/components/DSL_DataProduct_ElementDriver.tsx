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
  type EditorStore,
  NewElementDriver,
} from '@finos/legend-application-studio';
import {
  DataSpace,
  DataSpaceExecutionContext,
  DataSpaceSupportCombinedInfo,
} from '@finos/legend-extension-dsl-data-space/graph';
import {
  PackageableElementExplicitReference,
  stub_Mapping,
  stub_PackageableRuntime,
} from '@finos/legend-graph';
import { action, makeObservable, observable } from 'mobx';
import {
  dataSpace_setDescription,
  dataSpace_setSupportInfo,
  dataSpace_setTitle,
} from '../stores/studio/DSL_DataSpace_GraphModifierHelper.js';

export class NewDataProductDriver extends NewElementDriver<DataSpace> {
  title: string | undefined;
  description: string | undefined;

  constructor(editorStore: EditorStore) {
    super(editorStore);

    makeObservable(this, {
      title: observable,
      description: observable,
      setTitle: action,
      setDescription: action,
    });

    this.title = '';
    this.description = '';
  }

  setTitle(value: string | undefined): void {
    this.title = value;
  }

  setDescription(value: string | undefined): void {
    this.description = value;
  }

  override get isValid(): boolean {
    return Boolean(this.title && this.description);
  }
  override createElement(name: string): DataSpace {
    const dataSpace = new DataSpace(name);
    const dataSpaceExecutionContext = new DataSpaceExecutionContext();
    dataSpaceExecutionContext.name = 'defaultContext';
    dataSpaceExecutionContext.mapping =
      PackageableElementExplicitReference.create(stub_Mapping());
    dataSpaceExecutionContext.defaultRuntime =
      PackageableElementExplicitReference.create(stub_PackageableRuntime());
    dataSpace.executionContexts = [dataSpaceExecutionContext];
    dataSpace.defaultExecutionContext = dataSpaceExecutionContext;
    dataSpace_setTitle(dataSpace, this.title);
    dataSpace_setDescription(dataSpace, this.description);
    dataSpace_setSupportInfo(dataSpace, new DataSpaceSupportCombinedInfo());
    return dataSpace;
  }
}
