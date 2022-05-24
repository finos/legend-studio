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

import { EDITOR_LANGUAGE } from '@finos/legend-application';
import { clsx, PanelLoadingIndicator, TimesIcon } from '@finos/legend-art';
import { prettyCONSTName } from '@finos/legend-shared';
import { observer } from 'mobx-react-lite';
import {
  EqualToJsonAssertionState,
  TEST_ASSERTION_TAB_TYPE,
  type TestAssertionState,
} from '../../../../../stores/editor-state/element-editor-state/service/TestAssertionState';
import { StudioTextInputEditor } from '../../../../shared/StudioTextInputEditor';
import { UnsupportedEditorPanel } from '../../UnsupportedElementEditor';

export const EqualToJsonAsssertionEditor = observer(
  (props: { equalToJsonAssertionState: EqualToJsonAssertionState }) => {
    const { equalToJsonAssertionState } = props;
    const assertion = equalToJsonAssertionState.assertion;

    return (
      <>
        <div className="panel__header">
          <div className="panel__header__title">
            <div className="panel__header__title__label">expected</div>
          </div>
          <div className="panel__header__actions"></div>
        </div>
        <div className="equal-to-json-editor__content panel__content">
          <div className="equal-to-json-editor__content__data">
            <StudioTextInputEditor
              inputValue={assertion.expected.data}
              language={EDITOR_LANGUAGE.JSON}
              updateInput={(val: string): void => {
                equalToJsonAssertionState.setExpectedValue(val);
              }}
              hideGutter={true}
            />
          </div>
        </div>
      </>
    );
  },
);

const TestAssertionResultViewer = observer(
  (props: { testAssertionState: TestAssertionState }) => {
    const { testAssertionState } = props;
    return <div>HI</div>;
  },
);

// TODO: moved to shared location for any `Testable` to leverage
export const TestAssertionEditor = observer(
  (props: { testAssertionState: TestAssertionState }) => {
    const { testAssertionState } = props;
    const selectedTab = testAssertionState.selectedTab;
    const changeTab = (val: TEST_ASSERTION_TAB_TYPE): void =>
      testAssertionState.setSelectedTab(val);
    console.log('testAs', testAssertionState);
    const renderContent = (state: TestAssertionState): React.ReactNode => {
      if (state instanceof EqualToJsonAssertionState) {
        return (
          <EqualToJsonAsssertionEditor equalToJsonAssertionState={state} />
        );
      }
      return (
        <UnsupportedEditorPanel
          text="Can't display this assertion in form-mode"
          // TODO FIX
          isReadOnly={false}
        />
      );
    };

    return (
      <div className="testable-test-assertion-editor">
        <div className="testable-test-assertion-editor__header">
          <div className="testable-test-assertion-editor__header__tabs">
            {Object.values(TEST_ASSERTION_TAB_TYPE).map((tab) => (
              <div
                key={tab}
                onClick={(): void => changeTab(tab)}
                className={clsx('testable-test-assertion-editor__header__tab', {
                  'testable-test-assertion-editor__header__tab--active':
                    tab === selectedTab,
                })}
              >
                {/* {tab === MAPPING_TEST_EDITOR_TAB_TYPE.RESULT && (
                  <div className="mapping-test-editor__header__tab__test-status-indicator__container">
                    <MappingTestStatusIndicator testState={testState} />
                  </div>
                )} */}
                {prettyCONSTName(tab)}
              </div>
            ))}
          </div>
          <div className="testable-test-assertion-editor__header__actions">
            {/* <button
              className="mapping-test-editor__execute-btn"
              onClick={runTest}
              disabled={
                testState.isRunningTest ||
                testState.isExecutingTest ||
                testState.isGeneratingPlan
              }
              tabIndex={-1}
            >
              <div className="mapping-test-editor__execute-btn__label">
                <PlayIcon className="mapping-test-editor__execute-btn__label__icon" />
                <div className="mapping-test-editor__execute-btn__label__title">
                  Run Test
                </div>
              </div>
              <DropdownMenu
                className="mapping-test-editor__execute-btn__dropdown-btn"
                disabled={
                  testState.isRunningTest ||
                  testState.isExecutingTest ||
                  testState.isGeneratingPlan
                }
                content={
                  <MenuContent>
                    <MenuContentItem
                      className="mapping-test-editor__execute-btn__option"
                      onClick={generatePlan}
                    >
                      Generate Plan
                    </MenuContentItem>
                    <MenuContentItem
                      className="mapping-test-editor__execute-btn__option"
                      onClick={debugPlanGeneration}
                    >
                      Debug
                    </MenuContentItem>
                  </MenuContent>
                }
                menuProps={{
                  anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
                  transformOrigin: { vertical: 'top', horizontal: 'right' },
                }}
              >
                <CaretDownIcon />
              </DropdownMenu>
            </button> */}
          </div>
        </div>
        <div className="testable-test-assertion-editor__content">
          {selectedTab === TEST_ASSERTION_TAB_TYPE.ASSERTION_EDITOR && (
            <div className="testable-test-assertion-editor__setup">
              <PanelLoadingIndicator isLoading={false} />
              {renderContent(testAssertionState)}
            </div>
          )}
        </div>
        {selectedTab === TEST_ASSERTION_TAB_TYPE.ASSERTION_RESULT && (
          <TestAssertionResultViewer testAssertionState={testAssertionState} />
        )}
      </div>
    );
  },
);
