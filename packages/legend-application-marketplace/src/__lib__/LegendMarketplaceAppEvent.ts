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
  DESERIALIZE_DATA_PRODUCT_SEARCH_RESULT_FAILURE = 'marketplace.search.deserialize.data-product-search-result.failure',
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
  CLICK_BROWSE_HISTORICAL_NEWSLETTERS = 'marketplace.click.browse.historical.newsletters',
  PRODUCER_SEARCH_TOGGLE = 'marketplace.producer.search.toggle',
  FIELD_SEARCH_TOGGLE = 'marketplace.field.search.toggle',
  FIELD_SEARCH_FAILURE = 'marketplace.field.search.failure',
  FETCH_PENDING_TASKS_FAILURE = 'marketplace.fetch.pending-tasks.failure',
  ORDER_CANCELLATION_FAILURE = 'marketplace.order.cancellation.failure',
  TOGGLE_THEME_MODE = 'marketplace.toggle.theme-mode',
  CLICK_TOOLBAR_MENU = 'marketplace.click.toolbar.menu',
  SEARCH_AUTOSUGGEST_SELECTION = 'marketplace.search.autosuggest.selection',
  DISMISS_HOME_PAGE_BANNER = 'marketplace.dismiss.home-page.banner',
  SEARCH_VENDOR_ADDONS_FAILURE = 'marketplace.search.vendor-addons.failure',
  SUBMIT_FEEDBACK = 'marketplace.submit.feedback',
  SUBMIT_FEEDBACK_FAILURE = 'marketplace.submit.feedback.failure',
  CLICK_QUERY_DATA_PRODUCT = 'marketplace.click.query.data-product',
  CLICK_OPEN_SERVICE_QUERY = 'marketplace.click.open.service.query',
  CLICK_QUICKSTART_EXTENSION_TAB = 'marketplace.click.quickstart.extension.tab',
  APPLY_SEARCH_FILTER = 'marketplace.apply.search-filter',
  CLEAR_SEARCH_FILTERS = 'marketplace.clear.search-filters',
  SHOW_ALL_DATA_PRODUCTS = 'marketplace.show-all.data-products',
  TOGGLE_VIEW_MODE = 'marketplace.toggle.view-mode',
  TOGGLE_SERVICES_VIEW_MODE = 'marketplace.toggle.services.view-mode',
  SEARCH_SERVICES = 'marketplace.search.services',
  SORT_SERVICES = 'marketplace.sort.services',
  FILTER_SERVICES = 'marketplace.filter.services',
  CLICK_SERVICE_CARD = 'marketplace.click.service.card',
  AI_EXECUTION_CONTEXT_RESOLUTION_FAILURE = 'marketplace.ai.execution-context.resolution.failure',
  AI_RESULT_ANALYSIS_FAILURE = 'marketplace.ai.result-analysis.failure',
  CLICK_AI_AGENT_START = 'marketplace.click.ai-agent.start',
  AI_AGENT_QUESTION_ASKED = 'marketplace.ai-agent.question.asked',
  AI_AGENT_RESPONSE_RECEIVED = 'marketplace.ai-agent.response.received',
  AI_AGENT_SCOPE_ADDED = 'marketplace.ai-agent.scope.added',
  AI_AGENT_SCOPE_REMOVED = 'marketplace.ai-agent.scope.removed',
  CLICK_AI_AGENT_SUGGESTED_QUERY = 'marketplace.click.ai-agent.suggested-query',
  AI_AGENT_CLEAR_CHAT = 'marketplace.ai-agent.clear-chat',
  CLICK_AI_AGENT_COPY_SQL = 'marketplace.click.ai-agent.copy-sql',
}
