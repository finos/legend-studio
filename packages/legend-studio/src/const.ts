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

export const DATE_TIME_FORMAT_WITH_MILLISECONDS =
  "yyyy-MM-dd'T'HH:mm:ss.SSSxxxx";
export const DATE_TIME_FORMAT = "yyyy-MM-dd'T'HH:mm:ssxxxx";
export const DATE_FORMAT = 'yyyy-MM-dd';

// We should keep this as small as possible, minimize the number of times we need to get by the `testId`
// Because according to our testing philosophy, fixing the DOM structure makes us testing more implementation details
// than actual app behavior, user won't care about the id of an element or such!
// See https://testing-library.com/docs/dom-testing-library/api-queries#bytestid
export enum CORE_TEST_ID {
  EXPLORER_TREES = 'explorer-trees',
  PANEL = 'panel',
  EDIT_PANEL = 'edit-panel',
  EDIT_PANEL_CONTENT = 'edit-panel__content',
  EDIT_PANEL__HEADER_TABS = 'edit-panel__header-tabs',
  CLASS_FORM_EDITOR = 'class-form-editor',
  ENUMERATION_EDITOR = 'enumeration-editor',
  ASSOCIATION_EDITOR = 'association-editor',
  ELEMENT_EXPLORER = 'element-explorer',
  TYPE_VISIT = 'type-visit',
  STATUS_BAR = 'status-bar',
  NEW_ELEMENT_MODAL = 'new-element-modal',
  SERVICE_REGISTRATION_MODAL = 'service_registration_modal',
  UML_ELEMENT_EDITOR__TABS_HEADER = 'uml-element-editor__tabs__header',
  PROPERTY_BASIC_EDITOR__TYPE__LABEL_HOVER = 'property-basic-editor__type__label--hover',
  EDITOR__STATUS_BAR__RIGHT = 'editor__status-bar__right',
  EDIT_PANEL__ELEMENT_VIEW__OPTIONS = 'edit-panel__element-view__options',
  LAMBDA_EDITOR__EDITOR_INPUT = 'lambda-editor__editor__input',
  MAPPING_EXPLORER = 'mapping-explorer',
  MAIN_EDITOR = 'main-editor',
  EDITOR__TABS__HEADER = 'editor__tabs__header',
  SOURCE_PANEL = 'source-panel',
  PROJECT_OVERVIEW__ACTIVITY_BAR = 'project-overview__activity-bar',
  PANEL_CONTENT_LIST = 'panel__content__list',
  SETUP__CONTENT = 'setup__content',
  EXPLORER_CONTEXT_MENU = 'explorer__context-menu',
  SIDEBAR_PANEL_HEADER__CHANGES_COUNT = 'side-bar__panel__header__changes-count',
  ACTIVITY_BAR_ITEM_ICON_INDICATOR = 'activity-bar__item__icon__indicator',
  PANEL_CONTENT_FORM_SECTION_LIST_ITEMS = 'panel__content__form__section__list__items',
}
