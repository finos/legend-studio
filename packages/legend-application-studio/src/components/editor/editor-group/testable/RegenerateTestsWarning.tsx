/**
 * Copyright (c) 2026-present, Goldman Sachs
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
import { ExclamationTriangleIcon } from '@finos/legend-art';
import { useApplicationStore } from '@finos/legend-application';
import type { RegeneratableTestableState } from '../../../../stores/editor/utils/TestableUtils.js';
import { confirmRegenerateAllExpectedResults } from './TestableSharedComponents.js';

/**
 * Warning shown where a testable's tests may need their expected results regenerated
 * (e.g. its query or test data changed, or tests are failing); clicking it asks for
 * confirmation, then regenerates every test suite. Whether to show it is up to the caller.
 */
export const RegenerateTestsWarning = observer(
  (props: { text: string; testableState: RegeneratableTestableState }) => {
    const { text, testableState } = props;
    const applicationStore = useApplicationStore();
    const regenerateTestSuites = (): void =>
      confirmRegenerateAllExpectedResults(
        applicationStore.alertService,
        testableState,
      );

    return (
      <button
        className="regenerate-tests-warning"
        onClick={regenerateTestSuites}
        disabled={testableState.isRegeneratingExpectedResultsState.isInProgress}
        title={text}
        tabIndex={-1}
      >
        <ExclamationTriangleIcon />
        <span className="regenerate-tests-warning__text">{text}</span>
      </button>
    );
  },
);
