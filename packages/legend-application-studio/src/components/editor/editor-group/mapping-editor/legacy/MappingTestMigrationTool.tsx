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

import {
  BaseStepper,
  BlankPanelContent,
  Dialog,
  Modal,
  ModalBody,
  ModalFooter,
  ModalFooterButton,
  ModalHeader,
  PanelFormListItems,
  PanelLoadingIndicator,
  clsx,
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import type { MappingEditorState } from '../../../../../stores/editor/editor-state/element-editor-state/mapping/MappingEditorState.js';
import {
  MIGRATE_PHASE,
  type MappingTestMigrationState,
} from '../../../../../stores/editor/editor-state/element-editor-state/mapping/legacy/MappingTestMigrationState.js';
import { CODE_EDITOR_LANGUAGE } from '@finos/legend-code-editor';
import { CodeDiffView } from '@finos/legend-lego/code-editor';

export const MappingTestMigrationTool = observer(
  (props: {
    mappingEditorState: MappingEditorState;
    migrationState: MappingTestMigrationState;
  }) => {
    const { mappingEditorState, migrationState } = props;
    const applicationStore = mappingEditorState.editorStore.applicationStore;
    const isLoading =
      migrationState.confirmationState?.calculatingDiffs.isInProgress;
    const close = (): void => {
      mappingEditorState.closeMigrationTool();
    };
    const handleBack = (): void => {
      migrationState.handleBack();
    };
    const handleNext = (): void => {
      migrationState.handleNext();
    };
    const disabled =
      !migrationState.migrateableTests.length &&
      !migrationState.unSupportedTestsToMigrate.length;
    return (
      <Dialog
        open={true}
        onClose={close}
        classes={{
          root: 'editor-modal__root-container',
          container: 'editor-modal__container',
          paper: 'editor-modal__content',
        }}
      >
        <Modal
          darkMode={
            !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
          }
          className={clsx('editor-modal query-builder-text-mode__modal')}
        >
          <ModalHeader title="Migrate Legacy Tests"></ModalHeader>
          <ModalBody>
            <PanelLoadingIndicator isLoading={Boolean(isLoading)} />
            <BaseStepper
              steps={migrationState.steps}
              activeStep={migrationState.activeStep}
            />
            {!disabled ? (
              <div className="mapping-migration-tool">
                {migrationState.currentStep === MIGRATE_PHASE.OVERVIEW && (
                  <>
                    <PanelFormListItems
                      title="Migrable Tests"
                      prompt="tests that can be migrated via migration tool"
                    >
                      {migrationState.migrateableTests.map((test) => (
                        <div
                          className="panel__content__form__section__list__item"
                          key={test.name}
                        >
                          <div className="panel__content__form__section__list__item__value">
                            {test.name}
                          </div>
                        </div>
                      ))}
                    </PanelFormListItems>
                    <PanelFormListItems
                      title="Unsupported Tests"
                      prompt="tests unable to be migrated"
                    >
                      {migrationState.unSupportedTestsToMigrate.map((test) => (
                        <div
                          className="panel__content__form__section__list__item"
                          key={test.name}
                        >
                          <div className="panel__content__form__section__list__item__value">
                            {test.name}
                          </div>
                        </div>
                      ))}
                    </PanelFormListItems>
                  </>
                )}
                {migrationState.currentStep === MIGRATE_PHASE.CONFIRM &&
                  migrationState.confirmationState && (
                    <div className="query-builder__diff-panel__content">
                      <CodeDiffView
                        language={CODE_EDITOR_LANGUAGE.PURE}
                        from={migrationState.confirmationState.before ?? ''}
                        to={migrationState.confirmationState.after ?? ''}
                      />
                    </div>
                  )}
              </div>
            ) : (
              <div className="mapping-migration-tool">
                <BlankPanelContent>No Migrateable Tests</BlankPanelContent>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <ModalFooterButton
              className="query-connection-workflow__actions__action-btn"
              disabled={migrationState.disableBack || disabled}
              onClick={handleBack}
              title="Go to previous step..."
            >
              Back
            </ModalFooterButton>
            <ModalFooterButton
              className="query-connection-workflow__actions__action-btn query-connection-workflow__actions__action-btn--primary"
              disabled={migrationState.disableNext || disabled}
              onClick={handleNext}
            >
              {migrationState.nextText}
            </ModalFooterButton>
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);
