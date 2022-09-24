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

import { QuestionCircleIcon, BaseRadioGroup } from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import { LEGEND_APPLICATION_DOCUMENTATION_KEY } from '../../stores/LegendApplicationDocumentation.js';
import type { SEARCH_MODE } from '../../stores/TextSearchAdvancedConfigStore.js';
import { useApplicationStore } from '../ApplicationStoreProvider.js';
import type { TextSearchAdvancedConfigState } from './TextSearchAdvancedConfigState.js';

export const TextSearchAdvancedConfig = observer(
  (props: { configState: TextSearchAdvancedConfigState }) => {
    const { configState } = props;

    const applicationStore = useApplicationStore();

    const handleSearchMode: React.MouseEventHandler<HTMLDivElement> = (
      event,
    ): void => {
      event.preventDefault();
      event.stopPropagation();

      const searchMode = (event.target as HTMLInputElement)
        .value as SEARCH_MODE;
      configState.changeModeOfSearch(searchMode);
    };

    const getDocumentation = (): void => {
      applicationStore.assistantService.setIsOpen(true);

      applicationStore.assistantService.getDocumentationFromKey(
        LEGEND_APPLICATION_DOCUMENTATION_KEY.QUESTION_HOW_TO_USE_A_SEARCH_BAR,
      );
    };

    return (
      <div className="text-search-advanced-config__guide">
        <div className="text-search-advanced-config__guide__header__label">
          search config
          <button
            className="text-search-advanced-config__question__icon"
            tabIndex={-1}
            onClick={getDocumentation}
          >
            <QuestionCircleIcon />
          </button>
        </div>
        <div>
          <BaseRadioGroup
            className="text-search-advanced-config--radio-group"
            value={configState.modeOfSearch}
            onClick={handleSearchMode}
            row={false}
            options={configState.modeOfSearchOptions}
            size={1}
          />
        </div>
      </div>
    );
  },
);
