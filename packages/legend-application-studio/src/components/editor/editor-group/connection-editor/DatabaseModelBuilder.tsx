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
import type { DatabaseModelBuilderState } from '../../../../stores/editor/editor-state/element-editor-state/connection/DatabaseModelBuilderState.js';
import {
  BlankPanelContent,
  Dialog,
  InputWithInlineValidation,
  Modal,
  ModalBody,
  ModalFooter,
  ModalFooterButton,
  ModalHeader,
  ModalHeaderActions,
  ModalTitle,
  Panel,
  PanelContent,
  PanelHeader,
  PanelLoadingIndicator,
  ResizablePanel,
  ResizablePanelGroup,
  ResizablePanelSplitter,
  TimesIcon,
} from '@finos/legend-art';
import { LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY } from '../../../../__lib__/LegendStudioApplicationNavigationContext.js';
import {
  useApplicationStore,
  useConditionedApplicationNavigationContext,
} from '@finos/legend-application';
import { flowResult } from 'mobx';
import { useEffect, useMemo } from 'react';
import { CODE_EDITOR_LANGUAGE } from '@finos/legend-code-editor';
import { CodeEditor } from '@finos/legend-lego/code-editor';
import { debounce, noop } from '@finos/legend-shared';
import { isValidPath } from '@finos/legend-graph';

export const DatabaseModelPackageInput = observer(
  (props: { databaseModelBuilderState: DatabaseModelBuilderState }) => {
    const { databaseModelBuilderState } = props;

    const applicationStore = useApplicationStore();
    const debouncedRegenerate = useMemo(
      () =>
        debounce(
          () => flowResult(databaseModelBuilderState.previewDatabaseModels()),
          500,
        ),
      [databaseModelBuilderState],
    );

    const changeTargetPackage: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ) => {
      databaseModelBuilderState.setTargetPackage(event.target.value);
      debouncedRegenerate()?.catch(applicationStore.alertUnhandledError);
    };

    const targetPackageValidationMessage =
      !databaseModelBuilderState.targetPackage
        ? `Target package path can't be empty`
        : !isValidPath(databaseModelBuilderState.targetPackage)
          ? 'Invalid target package path'
          : undefined;

    return (
      <div className="panel__content__form__section">
        <div className="panel__content__form__section__header__label">
          Target Package
        </div>
        <div className="panel__content__form__section__header__prompt">
          Target Package of Mapping and Models Generated
        </div>
        <InputWithInlineValidation
          className="query-builder__variables__variable__name__input input-group__input"
          spellCheck={false}
          value={databaseModelBuilderState.targetPackage}
          onChange={changeTargetPackage}
          placeholder="Target package path"
          error={targetPackageValidationMessage}
          showEditableIcon={true}
        />
      </div>
    );
  },
);

export const DatabaseModelPreviewEditor = observer(
  (props: {
    databaseModelBuilderState: DatabaseModelBuilderState;
    grammarCode: string;
  }) => {
    const { databaseModelBuilderState, grammarCode } = props;

    const isExecutingAction =
      databaseModelBuilderState.generatingModelState.isInProgress ||
      databaseModelBuilderState.saveModelState.isInProgress;

    return (
      <Panel className="database-builder__model">
        <PanelHeader title="database model" />
        <PanelContent>
          <PanelLoadingIndicator isLoading={isExecutingAction} />
          <div className="database-builder__modeler">
            <div className="database-builder__modeler__preview">
              <div className="database-builder__modeler__preview__header">
                readonly
              </div>
              {databaseModelBuilderState.generatedGrammarCode && (
                <CodeEditor
                  language={CODE_EDITOR_LANGUAGE.PURE}
                  inputValue={grammarCode}
                  isReadOnly={true}
                />
              )}
              {!databaseModelBuilderState.generatedGrammarCode && (
                <BlankPanelContent>No model preview</BlankPanelContent>
              )}
            </div>
          </div>
        </PanelContent>
      </Panel>
    );
  },
);

export const DatabaseModelBuilder = observer(
  (props: {
    databaseModelBuilderState: DatabaseModelBuilderState;
    isReadOnly: boolean;
  }) => {
    const { databaseModelBuilderState, isReadOnly } = props;

    const applicationStore = useApplicationStore();
    const debouncedRegenerate = useMemo(
      () =>
        debounce(
          () => flowResult(databaseModelBuilderState.previewDatabaseModels()),
          500,
        ),
      [databaseModelBuilderState],
    );

    const preview = (): void => {
      debouncedRegenerate.cancel();
      debouncedRegenerate()?.catch(applicationStore.alertUnhandledError);
    };

    const saveModels = applicationStore.guardUnhandledError(() =>
      flowResult(databaseModelBuilderState.saveModels()),
    );
    const closeModal = (): void => {
      databaseModelBuilderState.close();
    };

    const isExecutingAction =
      databaseModelBuilderState.generatingModelState.isInProgress ||
      databaseModelBuilderState.saveModelState.isInProgress;

    useEffect(() => {
      flowResult(databaseModelBuilderState.previewDatabaseModels()).catch(
        applicationStore.alertUnhandledError,
      );
    }, [applicationStore, databaseModelBuilderState]);

    useConditionedApplicationNavigationContext(
      LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY.DATABASE_MODEL_BUILDER,
      databaseModelBuilderState.showModal,
    );

    return (
      <Dialog
        open={databaseModelBuilderState.showModal}
        classes={{ container: 'search-modal__container' }}
        onClose={noop}
        slotProps={{
          paper: {
            classes: {
              root: 'search-modal__inner-container database-builder__container',
            },
          },
        }}
      >
        <Modal
          darkMode={
            !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
          }
          className="database-builder"
        >
          <ModalHeader>
            <ModalTitle title="Database Model Builder" />
            <ModalHeaderActions>
              <button
                className="modal__header__action"
                tabIndex={-1}
                onClick={closeModal}
              >
                <TimesIcon />
              </button>
            </ModalHeaderActions>
          </ModalHeader>
          <ModalBody className="database-builder__content">
            <ResizablePanelGroup orientation="vertical">
              <ResizablePanel size={450}>
                <div className="database-builder__config">
                  <PanelHeader title="schema explorer" />
                  <PanelContent className="database-builder__config__content">
                    <DatabaseModelPackageInput
                      databaseModelBuilderState={databaseModelBuilderState}
                    />
                  </PanelContent>
                </div>
              </ResizablePanel>
              <ResizablePanelSplitter />
              <ResizablePanel>
                <DatabaseModelPreviewEditor
                  databaseModelBuilderState={databaseModelBuilderState}
                  grammarCode={databaseModelBuilderState.generatedGrammarCode}
                />
              </ResizablePanel>
            </ResizablePanelGroup>
          </ModalBody>
          <ModalFooter>
            <ModalFooterButton
              className="database-builder__action--btn"
              disabled={isReadOnly || isExecutingAction}
              onClick={preview}
              title="Preview models..."
            >
              Preview
            </ModalFooterButton>
            <ModalFooterButton
              className="database-builder__action--btn"
              disabled={isReadOnly || isExecutingAction}
              onClick={saveModels}
            >
              Save Models
            </ModalFooterButton>
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);
