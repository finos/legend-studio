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

import { PureModelContext, PureModelContextType } from './PureModelContext';

class Protocol {
  name: string;
  version: string;

  constructor(name: string, version: string) {
    this.name = name;
    this.version = version;
  }
}

export class PureModelContextPointer extends PureModelContext {
  _type = PureModelContextType.POINTER;
  serializer: Protocol;
  // TODO: sdlcInfo
  // sdlcInfo: SDLC;

  constructor(name: string, version: string) {
    super();
    this.serializer = new Protocol(name, version);
  }
}
