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

import { observer } from 'mobx-react-lite';
import { QuestionCircleIcon } from '../CJS__Icon.cjs';
import { BaseRadioGroup } from '../radio-group/BaseRadioGroup.js';
import type {
  TextSearchAdvancedConfigState,
  SEARCH_MODE,
} from './TextSearchAdvancedConfigState.js';

export const TextSearchAdvancedConfig = observer(
  (props: {
    configState: TextSearchAdvancedConfigState;
    getDocumentation: () => void;
  }) => {
    const { configState, getDocumentation } = props;

    const handleSearchMode = (
      event: React.ChangeEvent<HTMLInputElement>,
    ): void => {
      const searchMode = (event.target as HTMLInputElement)
        .value as SEARCH_MODE;
      configState.changeModeOfSearch(searchMode);
    };

    return (
      <div className="text-search__guide">
        <div className="text-search__guide__header__label">
          Search Config
          <button
            className="text-search__question__icon"
            tabIndex={-1}
            onClick={getDocumentation}
          >
            <QuestionCircleIcon />
          </button>
        </div>
        <div>
          <BaseRadioGroup
            className="text-search--radio-group"
            value={configState.modeOfSearch}
            onChange={handleSearchMode}
            row={false}
            options={configState.modeOfSearchOptions}
            size={1}
          />
        </div>
      </div>
    );
  },
);
