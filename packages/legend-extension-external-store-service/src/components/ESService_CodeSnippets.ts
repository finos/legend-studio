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

// TODO: we should add more example snippet
//
// ###ServiceStore
// ServiceStore meta::external::store::service::showcase::store::TradeProductServiceStore
// (
//    description : 'Showcase Service Store';
//    ServiceGroup TradeServices
//    (
//       path : '/trades';
//       Service TradeByTraderDetailsService
//       (
//          path : '/traderDetails';
//          method : GET;
//          parameters :
//          (
//             "trader.details" : String (location = query, allowReserved = true)
//          );
//          security : [];
//          response : [meta::external::store::service::showcase::domain::S_Trade <- meta::external::store::service::showcase::store::tradeServiceStoreSchemaBinding];
//       )
//       Service TradesByRegionService
//       (
//          path : '/allTradesByRegion';
//          method : GET;
//          parameters :
//          (
//             region : String (location = query),
//             requiredParam : String (location = query, required = true)
//          );
//          security : [];
//          response : [meta::external::store::service::showcase::domain::S_Trade <- meta::external::store::service::showcase::store::tradeServiceStoreSchemaBinding];
//       )
//    )
// )

export const BLANK_SERVICE_STORE_SNIPPET = `ServiceStore \${1:model::ServiceStore}
{
  \${2:// service store content}
}`;
