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

import { BaseRadioGroup, MenuContentDivider } from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import { DocumentationLink } from './DocumentationLink.js';
import {
  ADVANCED_FUZZY_SEARCH_MODE,
  type FuzzySearchAdvancedConfigState,
} from '@finos/legend-shared';
import { LEGEND_APPLICATION_DOCUMENTATION_KEY } from '@finos/legend-application';

export const FuzzySearchAdvancedConfigMenu = observer(
  (props: {
    configState: FuzzySearchAdvancedConfigState;
    additionalMenuItems?: React.ReactNode;
  }) => {
    const { configState, additionalMenuItems } = props;

    const handleSearchMode: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ): void => {
      const searchMode = event.target.value as ADVANCED_FUZZY_SEARCH_MODE;
      configState.setCurrentMode(searchMode);
    };

    return (
      <div className="fuzzy-search__advanced-config__panel">
        <div className="fuzzy-search__advanced-config__panel__header__label">
          search config
          <DocumentationLink
            documentationKey={
              LEGEND_APPLICATION_DOCUMENTATION_KEY.QUESTION_HOW_TO_USE_ADVANCED_SEARCH_SYNTAX
            }
          />
        </div>
        <div className="fuzzy-search__advanced-config__panel__body">
          <BaseRadioGroup
            className="text-search-advanced-config__options"
            value={configState.currentMode}
            onChange={handleSearchMode}
            row={false}
            options={[
              ADVANCED_FUZZY_SEARCH_MODE.STANDARD,
              ADVANCED_FUZZY_SEARCH_MODE.INCLUDE,
              ADVANCED_FUZZY_SEARCH_MODE.EXACT,
              ADVANCED_FUZZY_SEARCH_MODE.INVERSE,
            ]}
            size={1}
          />
          {additionalMenuItems ? (
            <>
              <MenuContentDivider />
              {additionalMenuItems}
            </>
          ) : null}
        </div>
      </div>
    );
  },
);
