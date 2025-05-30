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
  V1_deserializePackageableElement,
  type V1_DataProduct,
} from '@finos/legend-graph';

export const TMP__DummyDataProducts: V1_DataProduct[] = [
  V1_deserializePackageableElement(
    {
      _type: 'dataProduct',
      title: 'ClimateWatch',
      description: 'Climate data and insights',
      accessPointGroups: [],
      icon: '',
      imageUrl: '/assets/ClimateWatchLogo.png',
      package: 'climatewatch',
      name: 'ClimateWatch',
    },
    [],
  ) as V1_DataProduct,
  V1_deserializePackageableElement(
    {
      _type: 'dataProduct',
      title: 'Fannie Mae',
      description: 'Fannie Mae mortgage data and insights',
      accessPointGroups: [],
      icon: '',
      imageUrl: '/assets/FannieMaeLogo.png',
      package: 'fanniemae',
      name: 'FannieMae',
    },
    [],
  ) as V1_DataProduct,
];
