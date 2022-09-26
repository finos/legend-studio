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

import { BaseRadioGroup, InfoCircleIcon } from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import { LEGEND_APPLICATION_DOCUMENTATION_KEY } from '../../stores/LegendApplicationDocumentation.js';
import {
  ADVANCED_TEXT_SEARCH_MODE,
  type TextSearchAdvancedConfigState,
} from '../../stores/shared/TextSearchAdvancedConfigState.js';
import { useApplicationStore } from '../ApplicationStoreProvider.js';

export const TextSearchAdvancedConfigMenu = observer(
  (props: { configState: TextSearchAdvancedConfigState }) => {
    const { configState } = props;
    const applicationStore = useApplicationStore();

    const handleSearchMode: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ): void => {
      const searchMode = event.target.value as ADVANCED_TEXT_SEARCH_MODE;
      configState.setCurrentMode(searchMode);
    };
    const seeDocumentation = (): void =>
      applicationStore.assistantService.openDocumentationEntry(
        LEGEND_APPLICATION_DOCUMENTATION_KEY.QUESTION_HOW_TO_USE_ADVANCED_SEARCH_SYNTAX,
      );

    return (
      <div className="text-search-advanced-config__panel">
        <div className="text-search-advanced-config__panel__header__label">
          search config
          <button
            className="text-search-advanced-config__panel__header__hint"
            tabIndex={-1}
            onClick={seeDocumentation}
            title="Click to see more details on advanced search"
          >
            <InfoCircleIcon />
          </button>
        </div>
        <div>
          <BaseRadioGroup
            className="text-search-advanced-config--radio-group"
            value={configState.currentMode}
            onChange={handleSearchMode}
            row={false}
            options={[
              ADVANCED_TEXT_SEARCH_MODE.STANDARD,
              ADVANCED_TEXT_SEARCH_MODE.INCLUDE,
              ADVANCED_TEXT_SEARCH_MODE.EXACT,
              ADVANCED_TEXT_SEARCH_MODE.INVERSE,
            ]}
            size={1}
          />
        </div>
      </div>
    );
  },
);
