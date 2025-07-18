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

// We should keep this as small as possible, minimize the number of times we need to get by the `testId`
// Because according to our testing philosophy, fixing the DOM structure makes us testing more implementation details
// than actual app behavior, user won't care about the id of an element or such!
// See https://testing-library.com/docs/dom-testing-library/api-queries#bytestid
export enum LEGEND_STUDIO_TEST_ID {
  PANEL = 'panel', // TODO: revise
  PANEL_CONTENT_LIST = 'panel__content__list', // TODO: revise
  PANEL_CONTENT_FORM_SECTION_LIST_ITEMS = 'panel__content__form__section__list__items', // TODO: revise

  ACTIVITY_BAR_ITEM_ICON_INDICATOR = 'activity-bar__item__icon__indicator', // TODO: revise

  SIDEBAR_PANEL_HEADER__CHANGES_COUNT = 'side-bar__panel__header__changes-count',
  ELEMENT_EXPLORER = 'element-explorer',
  EXPLORER_TREES = 'explorer-trees',
  EXPLORER_CONTEXT_MENU = 'explorer__context-menu',

  FUNCTION_EDITOR = 'function-editor',

  TEST_RUNNER = 'test-runner',
  BULK_REGISTRATION = 'bulk-service-registration',

  END_TO_END_WORKFLOW = 'end-to-end-workflow',

  STATUS_BAR = 'status-bar',
  EDITOR__STATUS_BAR__RIGHT = 'editor__status-bar__right',

  EDITOR_GROUP = 'editor-group',
  EDITOR_GROUP_CONTENT = 'editor-group__content',
  EDITOR_GROUP__HEADER_TABS = 'editor-group__header-tabs',
  EDITOR_GROUP__ELEMENT_VIEW__OPTIONS = 'editor-group__view-mode__options',

  EDITOR__TABS__HEADER = 'editor__tabs__header',

  CLASS_FORM_EDITOR = 'class-form-editor',
  ENUMERATION_EDITOR = 'enumeration-editor',
  ASSOCIATION_EDITOR = 'association-editor',
  MAPPING_EDITOR = 'mapping-editor',
  UML_ELEMENT_EDITOR__TABS_HEADER = 'uml-element-editor__tabs__header',
  PROPERTY_BASIC_EDITOR__TYPE__LABEL_HOVER = 'property-basic-editor__type__label--hover',

  NEW_ELEMENT_MODAL = 'new-element-modal', // TODO: revise

  SERVICE_REGISTRATION_EDITOR = 'service_registration_editor', // TODO: revise
  SERVICE_TEST_EDITOR = 'service_test_editor', // TODO: revise
  SERVICE_TEST_EDITOR__SETUP = 'service_test_editor__setup',
  SERVICE_TEST_EDITOR__SETUP__PARAMETERS = 'service_test_editor__setup__parameters',

  ENUMERATION_MAPPING_EDITOR = 'enumeration-mapping-editor', // TODO: revise
  MAPPING_EXPLORER = 'mapping-explorer', // TODO: revise
  SOURCE_PANEL = 'source-panel', // TODO: revise
  TYPE_VISIT = 'type-visit', // TODO: revise

  PROJECT_OVERVIEW__ACTIVITY_BAR = 'project-overview__activity-bar', // TODO: revise

  SETUP__CONTENT = 'setup__content',

  HOVER_EDIT_ICON = 'hover-edit-icon',
  ACCESS_POINT_GROUP_EDITOR = 'access-point-group-editor',
}
