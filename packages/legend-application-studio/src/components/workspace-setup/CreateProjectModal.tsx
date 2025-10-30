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

import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import {
  clsx,
  Dialog,
  TimesIcon,
  PanelLoadingIndicator,
  PencilIcon,
  MarkdownTextViewer,
  Modal,
  PanelFormListItems,
  PanelFormTextField,
  PanelFormSection,
  PanelFormActions,
  PanelForm,
  PanelDivider,
} from '@finos/legend-art';
import { LEGEND_STUDIO_TEST_ID } from '../../__lib__/LegendStudioTesting.js';
import { isNumber } from '@finos/legend-shared';
import { flowResult } from 'mobx';
import { useConditionedApplicationNavigationContext } from '@finos/legend-application';
import { LEGEND_STUDIO_DOCUMENTATION_KEY } from '../../__lib__/LegendStudioDocumentation.js';
import { LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY } from '../../__lib__/LegendStudioApplicationNavigationContext.js';
import { useLegendStudioApplicationStore } from '../LegendStudioFrameworkProvider.js';
import { useWorkspaceSetupStore } from './WorkspaceSetup.js';
import { DocumentationLink } from '@finos/legend-lego/application';

enum CREATE_PROJECT_MODAL_TAB {
  CREATE = 'CREATE',
  IMPORT = 'IMPORT',
}

const artifactIdPattern = new RegExp('^[a-z][a-z\\d_]*(?:-[a-z][a-z\\d_]*)*$');

const CreateNewProjectTab = observer(() => {
  const setupStore = useWorkspaceSetupStore();
  const applicationStore = useLegendStudioApplicationStore();
  const documentation = applicationStore.documentationService.getDocEntry(
    LEGEND_STUDIO_DOCUMENTATION_KEY.CREATE_PROJECT,
  );
  const allowCreatingNewProject =
    setupStore.sdlcServerClient.features.canCreateProject;
  const [projectName, setProjectName] = useState('');
  const [groupId, setGroupId] = useState('');
  const [artifactId, setArtifactId] = useState('');
  const isArtfactIdInvalid =
    artifactId !== '' && !artifactIdPattern.test(artifactId);
  const [description, setDescription] = useState('');
  const changeDescription: React.ChangeEventHandler<HTMLTextAreaElement> = (
    event,
  ) => {
    setDescription(event.target.value);
  };
  // tags
  const [tagValue, setTagValue] = useState<string>('');
  const [tagsArray, setTagsArray] = useState<Array<string>>([]);
  // NOTE: `showEditInput` is either boolean (to hide/show the add value button) or a number (index of the item being edited)
  const [showEditTagValueInput, setShowEditTagValueInput] = useState<
    boolean | number
  >(false);
  const showAddTagInput = (): void => setShowEditTagValueInput(true);
  const showEditTagInput =
    (value: string, idx: number): (() => void) =>
    (): void => {
      setTagValue(value);
      setShowEditTagValueInput(idx);
    };
  const hideAddOrEditTagInput = (): void => {
    setShowEditTagValueInput(false);
    setTagValue('');
  };
  const changeTagInputValue: React.ChangeEventHandler<HTMLInputElement> = (
    event,
  ) => setTagValue(event.target.value);
  const addValue = (): void => {
    if (tagValue && !tagsArray.includes(tagValue)) {
      setTagsArray([...tagsArray, tagValue]);
    }
    hideAddOrEditTagInput();
  };
  const updateTag =
    (idx: number): (() => void) =>
    (): void => {
      if (tagValue && !tagsArray.includes(tagValue)) {
        tagsArray[idx] = tagValue;
        setTagsArray(tagsArray);
        hideAddOrEditTagInput();
      }
    };
  const deleteTag =
    (idx: number): (() => void) =>
    (): void => {
      const tags = [...tagsArray];
      tags.splice(idx, 1);
      setTagsArray(tags);
      // Since we keep track of the value currently being edited using the index, we have to account for it as we delete entry
      if (isNumber(showEditTagValueInput) && showEditTagValueInput > idx) {
        setShowEditTagValueInput(showEditTagValueInput - 1);
      }
    };

  const dispatchingActions =
    setupStore.createOrImportProjectState.isInProgress ||
    setupStore.createWorkspaceState.isInProgress;

  const disableSubmit =
    dispatchingActions || !projectName || !artifactId || !groupId;

  const handleSubmit = (): void => {
    if (projectName && groupId && artifactId) {
      if (allowCreatingNewProject) {
        flowResult(
          setupStore.createProject(
            projectName,
            description,
            groupId,
            artifactId,
            tagsArray,
          ),
        ).catch(applicationStore.alertUnhandledError);
      }
    }
  };

  if (!allowCreatingNewProject) {
    return (
      <div className="workspace-setup__create-project-modal__form panel__content__form">
        <div className="panel__content__form__section workspace-setup__create-project-modal__form__unsupported">
          SDLC server does not support creating new projects
        </div>
        {documentation?.markdownText && (
          <div className="panel__content__form__section">
            <MarkdownTextViewer value={documentation.markdownText} />
          </div>
        )}
      </div>
    );
  }
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        handleSubmit();
      }}
    >
      <PanelLoadingIndicator
        isLoading={setupStore.createOrImportProjectState.isInProgress}
      />
      <PanelForm className="workspace-setup__create-project-modal__form">
        {documentation?.markdownText && (
          <div className="panel__content__form__section">
            <MarkdownTextViewer value={documentation.markdownText} />
          </div>
        )}
        <PanelFormTextField
          name="Project Name"
          placeholder="MyProject"
          value={projectName}
          update={(value: string | undefined): void =>
            setProjectName(value ?? '')
          }
          isReadOnly={false}
        />
        <PanelFormSection>
          <div className="panel__content__form__section__header__label">
            Description
          </div>
          <textarea
            className="panel__content__form__section__textarea"
            spellCheck={false}
            value={description}
            placeholder="(optional)"
            onChange={changeDescription}
          />
        </PanelFormSection>
        <PanelFormTextField
          name="Group ID"
          prompt="The domain for artifacts generated as part of the project build
            pipeline and published to an artifact repository"
          placeholder={
            applicationStore.config.options.projectCreationGroupIdSuggestion
          }
          value={groupId}
          update={(value: string | undefined): void => setGroupId(value ?? '')}
        />
        <PanelFormTextField
          name="Artifact ID"
          prompt="The identifier (within the domain specified by group ID) for
            artifacts generated as part of the project build pipeline and
            published to an artifact repository"
          placeholder="my-project"
          value={artifactId}
          update={(value: string | undefined): void =>
            setArtifactId(value ?? '')
          }
          errorMessage={
            isArtfactIdInvalid
              ? `Invalid artifactId: ${artifactId}. ArtifactId must follow the pattern that starts with a lowercase letter and can include lowercase letters, digits, underscores, and hyphens between segments.`
              : undefined
          }
        />
        <PanelFormListItems
          title="Tags"
          prompt="List of annotations to categorize projects"
        >
          <div
            data-testid={
              LEGEND_STUDIO_TEST_ID.PANEL_CONTENT_FORM_SECTION_LIST_ITEMS
            }
          >
            {tagsArray.map((value, idx) => (
              // NOTE: since the value must be unique, we will use it as the key
              <div
                key={value}
                className={
                  showEditTagValueInput === idx
                    ? 'panel__content__form__section__list__new-item'
                    : 'panel__content__form__section__list__item'
                }
              >
                {showEditTagValueInput === idx ? (
                  <>
                    <input
                      className="panel__content__form__section__input panel__content__form__section__list__new-item__input"
                      spellCheck={false}
                      value={tagValue}
                      onChange={changeTagInputValue}
                    />
                    <div className="panel__content__form__section__list__new-item__actions">
                      <button
                        className="panel__content__form__section__list__new-item__add-btn btn btn--dark"
                        disabled={tagsArray.includes(tagValue)}
                        onClick={updateTag(idx)}
                        tabIndex={-1}
                      >
                        Save
                      </button>
                      <button
                        className="panel__content__form__section__list__new-item__cancel-btn btn btn--dark"
                        onClick={hideAddOrEditTagInput}
                        tabIndex={-1}
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="panel__content__form__section__list__item__value">
                      {value}
                    </div>
                    <div className="panel__content__form__section__list__item__actions">
                      <button
                        className="panel__content__form__section__list__item__edit-btn"
                        onClick={showEditTagInput(value, idx)}
                        tabIndex={-1}
                      >
                        <PencilIcon />
                      </button>
                      <button
                        className="panel__content__form__section__list__item__remove-btn"
                        onClick={deleteTag(idx)}
                        tabIndex={-1}
                      >
                        <TimesIcon />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {showEditTagValueInput === true && (
              <div className="panel__content__form__section__list__new-item">
                <input
                  className="panel__content__form__section__input panel__content__form__section__list__new-item__input"
                  spellCheck={false}
                  value={tagValue}
                  onChange={changeTagInputValue}
                />
                <div className="panel__content__form__section__list__new-item__actions">
                  <button
                    className="panel__content__form__section__list__new-item__add-btn btn btn--dark"
                    disabled={tagsArray.includes(tagValue)}
                    onClick={addValue}
                    tabIndex={-1}
                  >
                    Save
                  </button>
                  <button
                    className="panel__content__form__section__list__new-item__cancel-btn btn btn--dark"
                    onClick={hideAddOrEditTagInput}
                    tabIndex={-1}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </PanelFormListItems>
        {showEditTagValueInput !== true && (
          <div className="panel__content__form__section__list__new-item__add">
            <button
              className="panel__content__form__section__list__new-item__add-btn btn btn--dark"
              onClick={showAddTagInput}
              tabIndex={-1}
            >
              Add Value
            </button>
          </div>
        )}
      </PanelForm>
      <PanelFormActions>
        <button
          disabled={disableSubmit}
          className="btn btn--dark workspace-setup__create-project-modal__submit-btn"
          onClick={handleSubmit}
        >
          Create
        </button>
      </PanelFormActions>
    </form>
  );
});

const ImportProjectTab = observer(() => {
  const setupStore = useWorkspaceSetupStore();
  const applicationStore = useLegendStudioApplicationStore();
  const importProjectSuccessReport = setupStore.importProjectSuccessReport;
  const documentation = applicationStore.documentationService.getDocEntry(
    LEGEND_STUDIO_DOCUMENTATION_KEY.IMPORT_PROJECT,
  );
  const [projectIdentifier, setProjectIdentifier] = useState('');
  const [groupId, setGroupId] = useState('');
  const [artifactId, setArtifactId] = useState('');
  const isArtfactIdInvalid =
    artifactId !== '' && !artifactIdPattern.test(artifactId);
  const [description, setDescription] = useState('');
  const changeDescription: React.ChangeEventHandler<HTMLTextAreaElement> = (
    event,
  ) => {
    setDescription(event.target.value);
  };
  // tags
  const [tagValue, setTagValue] = useState<string>('');
  const [tagsArray, setTagsArray] = useState<Array<string>>([]);
  // NOTE: `showEditInput` is either boolean (to hide/show the add value button) or a number (index of the item being edited)
  const [showEditTagValueInput, setShowEditTagValueInput] = useState<
    boolean | number
  >(false);
  const showAddTagInput = (): void => setShowEditTagValueInput(true);
  const showEditTagInput =
    (value: string, idx: number): (() => void) =>
    (): void => {
      setTagValue(value);
      setShowEditTagValueInput(idx);
    };
  const hideAddOrEditTagInput = (): void => {
    setShowEditTagValueInput(false);
    setTagValue('');
  };
  const changeTagInputValue: React.ChangeEventHandler<HTMLInputElement> = (
    event,
  ) => setTagValue(event.target.value);
  const addValue = (): void => {
    if (tagValue && !tagsArray.includes(tagValue)) {
      setTagsArray([...tagsArray, tagValue]);
    }
    hideAddOrEditTagInput();
  };
  const updateTag =
    (idx: number): (() => void) =>
    (): void => {
      if (tagValue && !tagsArray.includes(tagValue)) {
        tagsArray[idx] = tagValue;
        setTagsArray(tagsArray);
        hideAddOrEditTagInput();
      }
    };
  const deleteTag =
    (idx: number): (() => void) =>
    (): void => {
      const tags = [...tagsArray];
      tags.splice(idx, 1);
      setTagsArray(tags);
      // Since we keep track of the value currently being edited using the index, we have to account for it as we delete entry
      if (isNumber(showEditTagValueInput) && showEditTagValueInput > idx) {
        setShowEditTagValueInput(showEditTagValueInput - 1);
      }
    };

  const dispatchingActions =
    setupStore.createOrImportProjectState.isInProgress ||
    setupStore.createWorkspaceState.isInProgress;

  const disableSubmit =
    dispatchingActions || !projectIdentifier || !artifactId || !groupId;

  const handleSubmit = (): void => {
    if (importProjectSuccessReport) {
      applicationStore.navigationService.navigator.visitAddress(
        importProjectSuccessReport.reviewUrl,
      );
    } else {
      if (projectIdentifier && groupId && artifactId) {
        flowResult(
          setupStore.importProject(projectIdentifier, groupId, artifactId),
        ).catch(applicationStore.alertUnhandledError);
      }
    }
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        handleSubmit();
      }}
    >
      <PanelLoadingIndicator
        isLoading={setupStore.createOrImportProjectState.isInProgress}
      />
      <PanelForm className="workspace-setup__create-project-modal__form">
        {documentation?.markdownText && (
          <PanelFormSection>
            <MarkdownTextViewer value={documentation.markdownText} />
          </PanelFormSection>
        )}

        <div>
          <PanelFormTextField
            name="Project ID"
            prompt="The ID of the project in the underlying version-control system"
            placeholder="1234"
            value={projectIdentifier}
            update={(value: string | undefined): void =>
              setProjectIdentifier(value ?? '')
            }
            isReadOnly={Boolean(importProjectSuccessReport)}
          />
        </div>

        <PanelDivider />
        <PanelFormSection>
          <div className="panel__content__form__section__header__label">
            Description
          </div>
          <textarea
            className="panel__content__form__section__textarea"
            spellCheck={false}
            value={description}
            placeholder="(optional)"
            onChange={changeDescription}
          />
        </PanelFormSection>
        <PanelFormTextField
          name="Group ID"
          prompt="The domain for artifacts generated as part of the project build
            pipeline and published to an artifact repository"
          placeholder={
            applicationStore.config.options.projectCreationGroupIdSuggestion
          }
          value={groupId}
          update={(value: string | undefined): void => setGroupId(value ?? '')}
          isReadOnly={Boolean(importProjectSuccessReport)}
        />
        <PanelFormTextField
          name="Artifact ID"
          prompt="The identifier (within the domain specified by group ID) for
            artifacts generated as part of the project build pipeline and
            published to an artifact repository"
          placeholder="my-project"
          value={artifactId}
          update={(value: string | undefined): void =>
            setArtifactId(value ?? '')
          }
          isReadOnly={Boolean(importProjectSuccessReport)}
          errorMessage={
            isArtfactIdInvalid
              ? `Invalid artifactId: ${artifactId}. ArtifactId must follow the pattern that starts with a lowercase letter and can include lowercase letters, digits, underscores, and hyphens between segments.`
              : undefined
          }
        />
        <PanelFormListItems
          title="Tags"
          prompt="List of annotations to categorize projects"
        >
          <div
            data-testid={
              LEGEND_STUDIO_TEST_ID.PANEL_CONTENT_FORM_SECTION_LIST_ITEMS
            }
          >
            {tagsArray.map((value, idx) => (
              // NOTE: since the value must be unique, we will use it as the key
              <div
                key={value}
                className={
                  showEditTagValueInput === idx
                    ? 'panel__content__form__section__list__new-item'
                    : 'panel__content__form__section__list__item'
                }
              >
                {showEditTagValueInput === idx ? (
                  <>
                    <input
                      className="panel__content__form__section__input panel__content__form__section__list__new-item__input"
                      spellCheck={false}
                      value={tagValue}
                      onChange={changeTagInputValue}
                    />
                    <div className="panel__content__form__section__list__new-item__actions">
                      <button
                        className="panel__content__form__section__list__new-item__add-btn btn btn--dark"
                        disabled={tagsArray.includes(tagValue)}
                        onClick={updateTag(idx)}
                        tabIndex={-1}
                      >
                        Save
                      </button>
                      <button
                        className="panel__content__form__section__list__new-item__cancel-btn btn btn--dark"
                        onClick={hideAddOrEditTagInput}
                        tabIndex={-1}
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="panel__content__form__section__list__item__value">
                      {value}
                    </div>
                    <div className="panel__content__form__section__list__item__actions">
                      <button
                        className="panel__content__form__section__list__item__edit-btn"
                        onClick={showEditTagInput(value, idx)}
                        tabIndex={-1}
                      >
                        <PencilIcon />
                      </button>
                      <button
                        className="panel__content__form__section__list__item__remove-btn"
                        onClick={deleteTag(idx)}
                        tabIndex={-1}
                      >
                        <TimesIcon />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {showEditTagValueInput === true && (
              <div className="panel__content__form__section__list__new-item">
                <input
                  className="panel__content__form__section__input panel__content__form__section__list__new-item__input"
                  spellCheck={false}
                  value={tagValue}
                  onChange={changeTagInputValue}
                />
                <div className="panel__content__form__section__list__new-item__actions">
                  <button
                    className="panel__content__form__section__list__new-item__add-btn btn btn--dark"
                    disabled={tagsArray.includes(tagValue)}
                    onClick={addValue}
                    tabIndex={-1}
                  >
                    Save
                  </button>
                  <button
                    className="panel__content__form__section__list__new-item__cancel-btn btn btn--dark"
                    onClick={hideAddOrEditTagInput}
                    tabIndex={-1}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </PanelFormListItems>
        {showEditTagValueInput !== true && (
          <div className="panel__content__form__section__list__new-item__add">
            <button
              className="panel__content__form__section__list__new-item__add-btn btn btn--dark"
              onClick={showAddTagInput}
              tabIndex={-1}
            >
              Add Value
            </button>
          </div>
        )}

        {Boolean(importProjectSuccessReport) && (
          <div className="workspace-setup__create-project-modal__success">
            <div className="workspace-setup__create-project-modal__success__label">
              <span className="workspace-setup__create-project-modal__success__label__text">
                The SDLC server has successfully registered your project. To
                complete the import, please commit the following
              </span>
              <a
                className="workspace-setup__create-project-modal__success__label__link"
                href={importProjectSuccessReport?.reviewUrl}
                rel="noopener noreferrer"
                target="_blank"
              >
                review.
              </a>
            </div>
          </div>
        )}
      </PanelForm>
      <PanelFormActions>
        <button
          disabled={disableSubmit}
          className="btn btn--dark workspace-setup__create-project-modal__submit-btn"
          onClick={handleSubmit}
        >
          {importProjectSuccessReport ? 'Review' : 'Import'}
        </button>
      </PanelFormActions>
    </form>
  );
});

export const CreateProjectModal = observer(() => {
  const setupStore = useWorkspaceSetupStore();
  const applicationStore = setupStore.applicationStore;
  const allowCreatingNewProject =
    setupStore.sdlcServerClient.features.canCreateProject;
  const [selectedTab, setSelectedTab] = useState(
    allowCreatingNewProject
      ? CREATE_PROJECT_MODAL_TAB.CREATE
      : CREATE_PROJECT_MODAL_TAB.IMPORT,
  );
  const closeModal = (): void => {
    setupStore.setShowCreateProjectModal(false);
    setupStore.setImportProjectSuccessReport(undefined);
  };
  const switchTab =
    (val: CREATE_PROJECT_MODAL_TAB): (() => void) =>
    () =>
      setSelectedTab(val);

  useConditionedApplicationNavigationContext(
    LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY.SETUP_CREATE_PROJECT_DIALOG,
    setupStore.showCreateProjectModal,
  );

  return (
    <Dialog
      open={setupStore.showCreateProjectModal}
      onClose={closeModal}
      classes={{ container: 'search-modal__container' }}
      slotProps={{
        paper: {
          classes: { root: 'search-modal__inner-container' },
        },
      }}
    >
      <Modal
        darkMode={
          !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
        }
        className="workspace-setup__create-project-modal"
      >
        <div className="workspace-setup__create-project-modal__header">
          <div className="workspace-setup__create-project-modal__header__label">
            Create Project
          </div>
        </div>
        <div className="workspace-setup__create-project-modal__header__tabs">
          <button
            onClick={switchTab(CREATE_PROJECT_MODAL_TAB.CREATE)}
            className={clsx(
              'workspace-setup__create-project-modal__header__tab',
              {
                'workspace-setup__create-project-modal__header__tab--active':
                  selectedTab === CREATE_PROJECT_MODAL_TAB.CREATE,
              },
            )}
          >
            Create New Project
            <DocumentationLink
              documentationKey={LEGEND_STUDIO_DOCUMENTATION_KEY.CREATE_PROJECT}
            />
          </button>
          <button
            onClick={switchTab(CREATE_PROJECT_MODAL_TAB.IMPORT)}
            className={clsx(
              'workspace-setup__create-project-modal__header__tab',
              {
                'workspace-setup__create-project-modal__header__tab--active':
                  selectedTab === CREATE_PROJECT_MODAL_TAB.IMPORT,
              },
            )}
          >
            Import Project
            <DocumentationLink
              documentationKey={LEGEND_STUDIO_DOCUMENTATION_KEY.IMPORT_PROJECT}
            />
          </button>
        </div>
        <div className="workspace-setup__create-project-modal__content">
          {selectedTab === CREATE_PROJECT_MODAL_TAB.CREATE && (
            <CreateNewProjectTab />
          )}
          {selectedTab === CREATE_PROJECT_MODAL_TAB.IMPORT && (
            <ImportProjectTab />
          )}
        </div>
      </Modal>
    </Dialog>
  );
});
