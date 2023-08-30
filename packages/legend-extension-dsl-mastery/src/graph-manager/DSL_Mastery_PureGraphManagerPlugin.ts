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

import packageJson from '../../package.json' assert { type: 'json' };
import { MasterRecordDefinition } from '../graph/metamodel/pure/model/packageableElements/mastery/DSL_Mastery_MasterRecordDefinition.js';
import { observe_Mastery } from './action/changeDetection/DSL_Mastery_ObserverHelper.js';
import {
  PureGraphManagerPlugin,
  type PackageableElement,
  type ElementObserver,
  type ObserverContext,
} from '@finos/legend-graph';
import { DataProvider } from '../graph/metamodel/pure/model/packageableElements/mastery/DSL_Mastery_DataProvider.js';
import { observe_DataProvider } from './action/changeDetection/DSL_DataProvider_ObserverHelper.js';
import {
  FTPConnection,
  HTTPConnection,
  KafkaConnection,
} from '../graph/metamodel/pure/model/packageableElements/mastery/DSL_Mastery_Connection.js';
import {
  observe_FTPConnection,
  observe_HTTPConnection,
  observe_KafkaConnection,
} from './action/changeDetection/DSL_Connection_ObserverHelper.js';

export class DSL_Mastery_PureGraphManagerPlugin extends PureGraphManagerPlugin {
  constructor() {
    super(packageJson.extensions.pureGraphManagerPlugin, packageJson.version);
  }

  override getExtraElementObservers(): ElementObserver[] {
    return [
      (
        element: PackageableElement,
        context: ObserverContext,
      ): PackageableElement | undefined => {
        if (element instanceof MasterRecordDefinition) {
          return observe_Mastery(element);
        } else if (element instanceof DataProvider) {
          return observe_DataProvider(element);
        } else if (element instanceof KafkaConnection) {
          return observe_KafkaConnection(element);
        } else if (element instanceof FTPConnection) {
          return observe_FTPConnection(element);
        } else if (element instanceof HTTPConnection) {
          return observe_HTTPConnection(element);
        }
        return undefined;
      },
    ];
  }
}
