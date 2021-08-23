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
export var STUDIO_TEST_ID;
(function (STUDIO_TEST_ID) {
    STUDIO_TEST_ID["PANEL"] = "panel";
    STUDIO_TEST_ID["PANEL_CONTENT_LIST"] = "panel__content__list";
    STUDIO_TEST_ID["PANEL_CONTENT_FORM_SECTION_LIST_ITEMS"] = "panel__content__form__section__list__items";
    STUDIO_TEST_ID["MAIN_EDITOR"] = "main-editor";
    STUDIO_TEST_ID["ACTIVITY_BAR_ITEM_ICON_INDICATOR"] = "activity-bar__item__icon__indicator";
    STUDIO_TEST_ID["SIDEBAR_PANEL_HEADER__CHANGES_COUNT"] = "side-bar__panel__header__changes-count";
    STUDIO_TEST_ID["ELEMENT_EXPLORER"] = "element-explorer";
    STUDIO_TEST_ID["EXPLORER_TREES"] = "explorer-trees";
    STUDIO_TEST_ID["EXPLORER_CONTEXT_MENU"] = "explorer__context-menu";
    STUDIO_TEST_ID["STATUS_BAR"] = "status-bar";
    STUDIO_TEST_ID["EDITOR__STATUS_BAR__RIGHT"] = "editor__status-bar__right";
    STUDIO_TEST_ID["EDIT_PANEL"] = "edit-panel";
    STUDIO_TEST_ID["EDIT_PANEL_CONTENT"] = "edit-panel__content";
    STUDIO_TEST_ID["EDIT_PANEL__HEADER_TABS"] = "edit-panel__header-tabs";
    STUDIO_TEST_ID["EDIT_PANEL__ELEMENT_VIEW__OPTIONS"] = "edit-panel__element-view__options";
    STUDIO_TEST_ID["EDITOR__TABS__HEADER"] = "editor__tabs__header";
    STUDIO_TEST_ID["CLASS_FORM_EDITOR"] = "class-form-editor";
    STUDIO_TEST_ID["ENUMERATION_EDITOR"] = "enumeration-editor";
    STUDIO_TEST_ID["ASSOCIATION_EDITOR"] = "association-editor";
    STUDIO_TEST_ID["UML_ELEMENT_EDITOR__TABS_HEADER"] = "uml-element-editor__tabs__header";
    STUDIO_TEST_ID["PROPERTY_BASIC_EDITOR__TYPE__LABEL_HOVER"] = "property-basic-editor__type__label--hover";
    STUDIO_TEST_ID["NEW_ELEMENT_MODAL"] = "new-element-modal";
    STUDIO_TEST_ID["SERVICE_REGISTRATION_MODAL"] = "service_registration_modal";
    STUDIO_TEST_ID["LAMBDA_EDITOR__EDITOR_INPUT"] = "lambda-editor__editor__input";
    STUDIO_TEST_ID["MAPPING_EXPLORER"] = "mapping-explorer";
    STUDIO_TEST_ID["SOURCE_PANEL"] = "source-panel";
    STUDIO_TEST_ID["TYPE_VISIT"] = "type-visit";
    STUDIO_TEST_ID["PROJECT_OVERVIEW__ACTIVITY_BAR"] = "project-overview__activity-bar";
    STUDIO_TEST_ID["SETUP__CONTENT"] = "setup__content";
})(STUDIO_TEST_ID || (STUDIO_TEST_ID = {}));
//# sourceMappingURL=StudioTestID.js.map