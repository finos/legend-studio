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

export enum QUERY_BUILDER_TEST_ID {
  LAMBDA_EDITOR__EDITOR_INPUT = 'lambda-editor__editor__input',

  QUERY_BUILDER = 'query__builder',
  QUERY_BUILDER_ACTIONS = 'query__builder__actions',
  QUERY_BUILDER_SETUP = 'query__builder__setup',
  QUERY_BUILDER_FETCH_STRUCTURE = 'query__builder__fetch__structure',
  QUERY_BUILDER_TDS_PROJECTION = 'query__builder__tds__projection',
  QUERY_BUILDER_TDS = 'query__builder__tds',
  QUERY_BUILDER_TDS_PROJECTION_COLUMN = 'QUERY_BUILDER_TDS_PROJECTION_COLUMN',
  QUERY_BUILDER_GRAPH_FETCH = 'query__builder__graph__fetch',
  // filter panel
  QUERY_BUILDER_FILTER_PANEL = 'query__builder__filter__panel',
  QUERY_BUILDER_FILTER_TREE = 'query__builder__filter__tree',
  QUERY_BUILDER_FILTER_TREE_NODE_BLOCK = 'query__builder__filter__tree__node-block',
  QUERY_BUILDER_FILTER_TREE_NODE_CHILDREN = 'query__builder__filter__tree__node-children',
  QUERY_BUILDER_FILTER_TREE_NODE_CONTAINER = 'query__builder__filter__tree__node-container',
  QUERY_BUILDER_FILTER_TREE_NODE_CONTENT = 'query__builder__filter__tree__node-content',
  QUERY_BUILDER_FILTER_TREE_CONDITION_NODE_CONTENT = 'query__builder__filter__tree__condition__node-content',
  QUERY_BUILDER_FILTER_TREE_CONDITION_NODE_VALUE = 'query-builder-filter-tree__condition-node__value',
  // post filter
  QUERY_BUILDER_POST_FILTER_PANEL = 'query__builder__post__filter-panel',
  QUERY_BUILDER_POST_FILTER_TREE = 'query__builder__post__filter__tree',
  QUERY_BUILDER_POST_FILTER_TREE_NODE_BLOCK = 'query__builder__post__filter__tree__node-block',
  QUERY_BUILDER_POST_FILTER_TREE_NODE_CHILDREN = 'query__builder__post__filter__tree__node-children',
  QUERY_BUILDER_POST_FILTER_TREE_NODE_CONTAINER = 'query__builder__post__filter__tree__node-container',
  QUERY_BUILDER_POST_FILTER_TREE_NODE_CONTENT = 'query__builder__post__filter__tree__node-content',
  // window function panel
  QUERY_BUILDER_WINDOW_GROUPBY = 'query__builder__window',
  // explorer panel
  QUERY_BUILDER_EXPLORER = 'query__builder__explorer',
  QUERY_BUILDER_PROPERTY_SEARCH_PANEL = 'query__builder__property__search__panel',
  QUERY_BUILDER_PERCENTILE_PANEL = 'query__builder__percentile__panel',
  //preview data modal
  QUERY_BUILDER_PREVIEW_DATA_MODAL = 'query__builder__preview-data__modal',
  // parameter panel
  QUERY_BUILDER_PARAMETERS = 'query-builder__parameters',
  // constant panel
  QUERY_BUILDER_CONSTANTS = 'query-builder__constants',
  // other
  QUERY_BUILDER_TOOLTIP_ICON = 'query-builder__tooltip__icon',
  // result panel
  QUERY_BUILDER_RESULT_VALUES = 'QUERY_BUILDER_RESULT_VALUES',
  QUERY_BUILDER_RESULT_VALUES_TDS = 'QUERY_BUILDER_RESULT_VALUES_TDS',
  QUERY_BUILDER_TDS_RESULT_MODIFIER_PROMPT = 'query-builder__tds__result-modifier-prompt',
  QUERY_BUILDER_RESULT_PANEL = 'query__builder__result__panel',
  QUERY_BUILDER_RESULT_ANALYTICS = 'query__builder__result__analytics',
  QUERY_BUILDER_RESULT_GRID_CUSTOM_HEADER = 'query__builder__result__grid__custom-header',
  // result modifier panel
  QUERY_BUILDER_RESULT_MODIFIER_PANEL = 'query__builder__result__modifier__panel',
  QUERY_BUILDER_RESULT_MODIFIER_PANEL_SORT_REMOVE_BTN = 'query__builder__projection__options__sort__remove-btn',
  QUERY_BUILDER_RESULT_MODIFIER_PANEL__WATERMAKR = 'query__builder__result__modifier__panel__watermark',
}
