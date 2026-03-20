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

import { ResolvedDataSpaceEntityWithOrigin } from '@finos/legend-extension-dsl-data-space/application';
import {
  type DepotEntityWithOrigin,
  generateGAVCoordinates,
} from '@finos/legend-storage';
import type { DataProductWithLegacyOption } from '../../stores/data-space/DataProductSelectorState.js';

/**
 * Inline badge rendered next to every DataProduct (Lakehouse) entry
 * in a combined data-space / data-product selector dropdown.
 */
export const DataProductLakehouseBadge = (): React.ReactNode => (
  <span className="query-builder__setup__data-product__option__tag query-builder__setup__data-product__option__tag--lakehouse">
    Lakehouse
  </span>
);

/**
 * Option label for a combined dropdown that shows both legacy DataSpaces and
 * depot DataProducts. DataProduct entries get a "Lakehouse" badge.
 */
export const formatDataProductOrSpaceOptionLabel = (
  option: DataProductWithLegacyOption,
): React.ReactNode => {
  const { label, value } = option;
  const isDataProduct = !(value instanceof ResolvedDataSpaceEntityWithOrigin);
  const title = isDataProduct
    ? `${label} - ${value.path} - ${generateGAVCoordinates(value.origin?.groupId ?? '', value.origin?.artifactId ?? '', value.origin?.versionId ?? '')}`
    : `${label} - ${value.path}${
        value.origin
          ? ` - ${generateGAVCoordinates(value.origin.groupId, value.origin.artifactId, value.origin.versionId)}`
          : ''
      }`;
  return (
    <div className="query-builder__setup__data-product__option" title={title}>
      <div className="query-builder__setup__data-product__option__label">
        {label}
      </div>
      {isDataProduct && <DataProductLakehouseBadge />}
    </div>
  );
};

/**
 * Option label for a DataProduct-only dropdown. Entries that are legacy
 * DataSpaces (ResolvedDataSpaceEntityWithOrigin) do NOT get the badge; only
 * actual Lakehouse DataProduct entries do.
 */
export const formatDataProductOptionLabel = (option: {
  label: string;
  value: DepotEntityWithOrigin;
}): React.ReactNode => {
  const { label, value } = option;
  const isDataProduct = !(value instanceof ResolvedDataSpaceEntityWithOrigin);
  const title = `${label} - ${value.path} - ${generateGAVCoordinates(value.origin?.groupId ?? '', value.origin?.artifactId ?? '', value.origin?.versionId ?? '')}`;
  return (
    <div className="query-builder__setup__data-product__option" title={title}>
      <div className="query-builder__setup__data-product__option__label">
        {label}
      </div>
      {isDataProduct && <DataProductLakehouseBadge />}
    </div>
  );
};
