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

import { action } from 'mobx';
import type {
  DataSpace,
  DataSpaceSupportInfo,
} from '@finos/legend-extension-dsl-data-space/graph';

export const set_title = action(
  (dataSpace: DataSpace, type: string | undefined): void => {
    dataSpace.title = type;
  },
);

export const set_description = action(
  (dataSpace: DataSpace, content: string | undefined): void => {
    dataSpace.description = content;
  },
);

export const set_supportInfo = action(
  (
    dataSpace: DataSpace,
    supportInfo: DataSpaceSupportInfo | undefined,
  ): void => {
    dataSpace.supportInfo = supportInfo;
  },
);
