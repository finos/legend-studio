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
import { flowResult } from 'mobx';
import {
  BlankPanelContent,
  Dialog,
  Modal,
  ModalBody,
  ModalFooter,
  ModalFooterButton,
  ModalHeader,
  ModalHeaderActions,
  ModalTitle,
  PanelLoadingIndicator,
  TimesIcon,
} from '@finos/legend-art';
import { useApplicationStore } from '@finos/legend-application';
import { CODE_EDITOR_LANGUAGE } from '@finos/legend-code-editor';
import { CodeEditor } from '@finos/legend-lego/code-editor';
import { noop } from '@finos/legend-shared';
import type { GraphQLIntrospectionWizardState } from '../../stores/studio/STO_GraphQL_IntrospectionWizardState.js';

export const GraphQLIntrospectionWizard = observer(
  (props: {
    wizardState: GraphQLIntrospectionWizardState;
    isReadOnly: boolean;
  }) => {
    const { wizardState, isReadOnly } = props;
    const applicationStore = useApplicationStore();
    const validationMessage = wizardState.validationMessage;

    const generate = applicationStore.guardUnhandledError(() =>
      flowResult(wizardState.generate()),
    );
    const apply = applicationStore.guardUnhandledError(() =>
      flowResult(wizardState.apply()),
    );
    const close = (): void => wizardState.setShowModal(false);

    const changeTargetPackage: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ) => wizardState.setTargetPackage(event.target.value);
    const changeMappingName: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ) => wizardState.setMappingName(event.target.value);

    return (
      <Dialog
        open={wizardState.showModal}
        // do not let Esc or a backdrop click discard a running generate/apply
        onClose={wizardState.isExecutingAction ? noop : close}
        classes={{ container: 'search-modal__container' }}
        slotProps={{
          paper: {
            classes: {
              root: 'search-modal__inner-container graphql-introspection-wizard__container',
            },
          },
        }}
      >
        <Modal
          darkMode={
            !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
          }
          className="graphql-introspection-wizard"
        >
          <ModalHeader>
            <ModalTitle title="Generate from GraphQL Schema" />
            <ModalHeaderActions>
              <button
                className="modal__header__action"
                tabIndex={-1}
                onClick={close}
                disabled={wizardState.isExecutingAction}
              >
                <TimesIcon />
              </button>
            </ModalHeaderActions>
          </ModalHeader>
          <ModalBody className="graphql-introspection-wizard__content">
            <PanelLoadingIndicator isLoading={wizardState.isExecutingAction} />
            <div className="graphql-introspection-wizard__form">
              <div className="graphql-introspection-wizard__field">
                <div className="graphql-introspection-wizard__field__label">
                  Endpoint
                </div>
                <div className="graphql-introspection-wizard__field__value">
                  {wizardState.connection.url || '(connection URL not set)'}
                </div>
              </div>
              <div className="graphql-introspection-wizard__field">
                <div className="graphql-introspection-wizard__field__label">
                  Store (schema is replaced)
                </div>
                <div className="graphql-introspection-wizard__field__value">
                  {wizardState.storePath}
                </div>
              </div>
              <div className="graphql-introspection-wizard__field">
                <div className="graphql-introspection-wizard__field__label">
                  Target package
                </div>
                <input
                  className="graphql-introspection-wizard__field__input"
                  spellCheck={false}
                  value={wizardState.targetPackage}
                  onChange={changeTargetPackage}
                  disabled={isReadOnly || wizardState.isExecutingAction}
                />
              </div>
              <div className="graphql-introspection-wizard__field">
                <div className="graphql-introspection-wizard__field__label">
                  Mapping name
                </div>
                <input
                  className="graphql-introspection-wizard__field__input"
                  spellCheck={false}
                  value={wizardState.mappingName}
                  onChange={changeMappingName}
                  disabled={isReadOnly || wizardState.isExecutingAction}
                />
              </div>
            </div>
            {validationMessage && (
              <div className="graphql-introspection-wizard__message graphql-introspection-wizard__message--error">
                {validationMessage}
              </div>
            )}
            {wizardState.skippedTypes.length > 0 && (
              <div className="graphql-introspection-wizard__message graphql-introspection-wizard__message--warning">
                {`Skipped ${wizardState.skippedTypes.length} unsupported item(s): ${wizardState.skippedTypes.join('; ')}`}
              </div>
            )}
            {wizardState.warnings.length > 0 && (
              <div className="graphql-introspection-wizard__message graphql-introspection-wizard__message--warning">
                {`Review ${wizardState.warnings.length} generated item(s): ${wizardState.warnings.join('; ')}`}
              </div>
            )}
            <div className="graphql-introspection-wizard__preview">
              {wizardState.grammarPreview ? (
                <CodeEditor
                  language={CODE_EDITOR_LANGUAGE.PURE}
                  inputValue={wizardState.grammarPreview}
                  isReadOnly={true}
                />
              ) : (
                <BlankPanelContent>No preview</BlankPanelContent>
              )}
            </div>
          </ModalBody>
          <ModalFooter>
            <ModalFooterButton
              disabled={
                isReadOnly ||
                wizardState.isExecutingAction ||
                Boolean(validationMessage)
              }
              onClick={generate}
              title="Introspect the endpoint and preview the generated model"
            >
              Generate
            </ModalFooterButton>
            <ModalFooterButton
              disabled={
                isReadOnly ||
                wizardState.isExecutingAction ||
                !wizardState.grammarPreview
              }
              onClick={apply}
              title="Add the previewed model to the project"
            >
              Apply
            </ModalFooterButton>
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);
