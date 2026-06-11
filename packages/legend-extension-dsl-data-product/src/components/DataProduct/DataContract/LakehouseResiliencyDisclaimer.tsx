/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import { Alert, Link } from '@mui/material';
import type { GenericLegendApplicationStore } from '@finos/legend-application';
import { DSL_DATA_PRODUCT_DOCUMENTATION_KEY } from '../../../__lib__/DSL_DataProduct_Documentation.js';

export const LakehouseResiliencyDisclaimer = (props: {
  applicationStore: GenericLegendApplicationStore;
}): React.ReactNode => {
  const { applicationStore } = props;
  const docUrl = applicationStore.documentationService.getDocEntry(
    DSL_DATA_PRODUCT_DOCUMENTATION_KEY.MULTI_REGION_RESILIENCY,
  )?.url;

  return (
    <Alert
      severity="warning"
      className="marketplace-lakehouse-entitlements__data-access-request-viewer__resiliency-disclaimer"
    >
      Lakehouse does not currently support multi-region resiliency.{' '}
      {docUrl && (
        <Link href={docUrl} target="_blank" rel="noopener noreferrer">
          Learn more
        </Link>
      )}
    </Alert>
  );
};
