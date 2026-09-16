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

/**
 * Plain description of the data product a query runs against, used to explain
 * entitlement failures and to point the user at where access can be requested.
 *
 * NOTE: this is intentionally plain data rather than the query builder state itself,
 * so the result panel does not have to depend on `DataProductQueryBuilderState`.
 */
export type DataProductAccessInfo = {
  dataProductLabel: string;
  /**
   * Identifier of the data product as used by external applications (e.g. Marketplace
   * routing), which is not necessarily the same as the display label.
   */
  dataProductId: string;
  accessPointGroupId: string | undefined;
  accessPointGroupLabel: string | undefined;
  deploymentId: string | undefined;
  environment: string | undefined;
  warehouse: string | undefined;
  supportEmails: string[];
};
