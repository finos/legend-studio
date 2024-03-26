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
  AgGridReact,
  type AgGridReactProps,
  type AgReactUiProps,
} from '@ag-grid-community/react';
import { ClientSideRowModelModule } from '@ag-grid-community/client-side-row-model';
import { ModuleRegistry } from '@ag-grid-community/core';
import { ServerSideRowModelModule } from '@ag-grid-enterprise/server-side-row-model';
import { RowGroupingModule } from '@ag-grid-enterprise/row-grouping';
import { MenuModule } from '@ag-grid-enterprise/menu';
import { getDefaultColumnDefintions } from '../components/grid/GridUtils.js';
import { LicenseManager } from '@ag-grid-enterprise/core';

const communityModules = [ClientSideRowModelModule];
const enterpriseModules = [
  ServerSideRowModelModule,
  RowGroupingModule,
  MenuModule,
];
const allModules = communityModules.concat(enterpriseModules);

export function AgGridComponent<TData = unknown>(
  props: (AgGridReactProps<TData> | AgReactUiProps<TData>) & {
    licenseKey: string;
  },
): JSX.Element {
  let isAgGridLicenseEnabled = false;
  if (props.licenseKey) {
    LicenseManager.setLicenseKey(JSON.stringify(props.licenseKey));
    isAgGridLicenseEnabled = true;
  }

  return (
    <AgGridReact
      rowGroupPanelShow={isAgGridLicenseEnabled ? 'always' : 'never'}
      suppressBrowserResizeObserver={true}
      suppressScrollOnNewData={true}
      alwaysMultiSort={true}
      rowModelType={isAgGridLicenseEnabled ? 'serverSide' : 'clientSide'}
      {...props}
      defaultColDef={getDefaultColumnDefintions(isAgGridLicenseEnabled)}
      modules={isAgGridLicenseEnabled ? allModules : communityModules}
    />
  );
}

export const configureAgGridComponent = (): void => {
  ModuleRegistry.registerModules([ClientSideRowModelModule, RowGroupingModule]);
};
