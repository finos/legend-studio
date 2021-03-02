/**
 * Copyright 2020 Goldman Sachs
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

import type { V1_Sdlc } from '../../model/context/V1_AlloySdlc';
import type { V1_Protocol } from '../../model/V1_Protocol';
import { V1_PureModelContext } from './V1_PureModelContext';

export class V1_PureModelContextPointer extends V1_PureModelContext {
  serializer: V1_Protocol;
  sdlcInfo?: V1_Sdlc;

  constructor(protocol: V1_Protocol, sdlc?: V1_Sdlc) {
    super();
    this.serializer = protocol;
    this.sdlcInfo = sdlc;
  }
}
