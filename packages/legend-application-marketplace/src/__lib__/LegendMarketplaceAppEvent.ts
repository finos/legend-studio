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

export enum LEGEND_MARKETPLACE_APP_EVENT {
  FETCH_DATA_PRODUCT_FAILURE = 'marketplace.fetch.data-product.failure',

  LOAD_DATA_PRODUCT = 'marketplace.load.data-product',
  LOAD_SDLC_DATA_PRODUCT = 'marketplace.load.sdlc.data-product',
  LOAD_TERMINAL = 'marketplace.load.terminal',
  LOAD_LEGACY_DATA_PRODUCT = 'marketplace.load.legacy.data-product',
  CLICK_DATA_PRODUCT_CARD = 'marketplace.click.data-product.card',
  CLICK_LEGACY_DATA_PRODUCT_CARD = 'marketplace.click.legacy.data-product.card',
  SEARCH_QUERY = 'marketplace.search.query',
  ACTION_DATA_CONTRACTS = 'marketplace.action.data.contracts',
  CLICK_HEADER_TAB = 'marketplace.click.header.tab',
  SCHEDULE_DEMO = 'marketplace.schedule.demo',
  CLICK_SUBSCRIBE_TO_NEWSLETTER = 'marketplace.click.subscribe.to.newsletter',
  OPEN_DATA_CUBE = 'marketplace.open.data.cube',
  OPEN_POWER_BI = 'marketplace.open.power.bi',
}
