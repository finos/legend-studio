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

import packageJson from '../../package.json' with { type: 'json' };
import { DataSpace } from '../graph/metamodel/pure/model/packageableElements/dataSpace/DSL_DataSpace_DataSpace.js';
import {
  PureGraphManagerPlugin,
  type ObserverContext,
  type ElementObserver,
  type PackageableElement,
  type PureGraphManagerExtensionBuilder,
} from '@finos/legend-graph';
import { observe_DataSpace } from './action/changeDetection/DSL_DataSpace_ObserverHelper.js';
import { DSL_DataSpace_buildGraphManagerExtension } from './protocol/pure/DSL_DataSpace_PureGraphManagerExtensionBuilder.js';

export const PURE_ENTERPRISE_PROFILE_PATH = 'meta::pure::profiles::enterprise';
export const PURE_ENTERPRISE_PROFILE_TAXONOMY_NODE_STEREOTYPE = 'taxonomyNodes';
export const PURE_DATA_SPACE_INFO_PROFILE_PATH =
  'meta::pure::metamodel::dataSpace::profiles::DataSpaceInfo';
export const PURE_DATA_SPACE_INFO_PROFILE_VERIFIED_STEREOTYPE = 'Verified';
export const PURE_POWERBI_ARTIFACT_GENERATION_PROFILE_PATH =
  'meta::external::powerbi::profiles::PowerBIArtifactGeneration';

export class DSL_DataSpace_PureGraphManagerPlugin extends PureGraphManagerPlugin {
  constructor() {
    super(packageJson.extensions.pureGraphManagerPlugin, packageJson.version);
  }

  override getExtraExposedSystemElementPath(): string[] {
    return [
      PURE_ENTERPRISE_PROFILE_PATH,
      PURE_DATA_SPACE_INFO_PROFILE_PATH,
      PURE_POWERBI_ARTIFACT_GENERATION_PROFILE_PATH
    ];
  }

  override getExtraPureGraphManagerExtensionBuilders(): PureGraphManagerExtensionBuilder[] {
    return [DSL_DataSpace_buildGraphManagerExtension];
  }

  override getExtraElementObservers(): ElementObserver[] {
    return [
      (
        element: PackageableElement,
        context: ObserverContext,
      ): PackageableElement | undefined => {
        if (element instanceof DataSpace) {
          return observe_DataSpace(element);
        }
        return undefined;
      },
    ];
  }
}
