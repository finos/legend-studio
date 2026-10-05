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

import {
  useEditorStore,
  useLegendAISuggestTelemetry,
  LEGEND_STUDIO_DOCUMENTATION_KEY,
  LEGENDAI_SUGGEST_STAGE,
  LEGENDAI_SUGGEST_SURFACE,
  type DSL_DataSpace_LegendStudioApplicationPlugin_Extension,
} from '@finos/legend-application-studio';
import { DataSpace } from '@finos/legend-extension-dsl-data-space/graph';
import {
  clsx,
  PanelForm,
  PanelFormTextField,
  PanelLoadingIndicator,
  SparkleIcon,
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import {
  assertErrorThrown,
  HttpStatus,
  NetworkClientError,
} from '@finos/legend-shared';
import { DataSpaceEditorState } from '../../stores/DataSpaceEditorState.js';
import {
  dataSpace_setDescription,
  dataSpace_setTitle,
} from '../../stores/studio/DSL_DataSpace_GraphModifierHelper.js';
import { DataSpaceDiagramsSection } from './DataSpaceDiagramsSection.js';
import { DataSpaceElementsSection } from './DataSpaceElementsSection.js';
import { DataSpaceSupportInfoSection } from './DataSpaceSupportInfoSection.js';
import {
  dataSpaceNeedsExecutionContextOrExecutable,
  InlineIssue,
} from './DataSpaceValidation.js';

export const DataSpaceHomeTab = observer(() => {
  const editorStore = useEditorStore();

  const dataSpaceState =
    editorStore.tabManagerState.getCurrentEditorState(DataSpaceEditorState);
  const dataSpace = dataSpaceState.dataSpace;
  const isReadOnly = dataSpaceState.isReadOnly;

  const handleTitleChange = (value: string | undefined): void => {
    dataSpace_setTitle(dataSpace, value);
  };

  const handleDescriptionChange = (value: string | undefined): void => {
    dataSpace_setDescription(dataSpace, value);
  };

  const legendAIUrl = editorStore.applicationStore.config.legendAIUrl;
  const aiDocSuggester = legendAIUrl
    ? editorStore.pluginManager
        .getApplicationPlugins()
        .map((p) =>
          (
            p as DSL_DataSpace_LegendStudioApplicationPlugin_Extension
          ).getExtraDataSpaceDocumentationAISuggester?.bind(p),
        )
        .find(Boolean)
    : undefined;
  const [isSuggestingWithAI, setIsSuggestingWithAI] = useState(false);
  const [aiDocSuggestion, setAIDocSuggestion] = useState<string | undefined>(
    undefined,
  );
  const aiSuggestTelemetry = useLegendAISuggestTelemetry(
    editorStore,
    {
      surface: LEGENDAI_SUGGEST_SURFACE.DATASPACE,
      elementPath: dataSpace.path,
    },
    { legendAIUrl, available: Boolean(aiDocSuggester), isReadOnly },
  );
  const suggestDocumentationWithAI = async (): Promise<void> => {
    if (!aiDocSuggester || !legendAIUrl) {
      return;
    }
    const request = aiSuggestTelemetry.launch({
      existingText: dataSpace.description,
    });
    setIsSuggestingWithAI(true);
    setAIDocSuggestion(undefined);
    let stage = LEGENDAI_SUGGEST_STAGE.SERIALIZE;
    try {
      const definitions =
        await editorStore.graphManagerState.graphManager.graphToPureCode(
          editorStore.graphManagerState.graph,
        );
      stage = LEGENDAI_SUGGEST_STAGE.REQUEST;
      const suggestion = await aiDocSuggester(
        { definitions, data_space_name: dataSpace.path },
        legendAIUrl,
      );
      const shouldShow = aiSuggestTelemetry.succeed(request, {
        suggestionText: suggestion.description,
        definitionsLength: definitions.length,
        currentText: dataSpace.description,
        confidence: suggestion.confidence,
      });
      if (!shouldShow) {
        editorStore.applicationStore.notificationService.notifyWarning(
          'LegendAI did not return a description suggestion for this data space',
        );
      }
      setAIDocSuggestion(shouldShow ? suggestion.description : undefined);
    } catch (error) {
      assertErrorThrown(error);
      aiSuggestTelemetry.fail(request, error, stage);
      if (
        error instanceof NetworkClientError &&
        (error.response.status === HttpStatus.UNAUTHORIZED ||
          error.response.status === HttpStatus.FORBIDDEN)
      ) {
        const docEntry =
          editorStore.applicationStore.documentationService.getDocEntry(
            LEGEND_STUDIO_DOCUMENTATION_KEY.LEGENDAI_HOW_TO_GET_ENTITLEMENTS,
          );
        if (docEntry?.url) {
          error.message = `${error.message}. Please check how to get entitlements: ${docEntry.url}`;
        }
      }
      throw error;
    } finally {
      setIsSuggestingWithAI(false);
    }
  };
  const applyAIDocSuggestion = (): void => {
    if (!aiDocSuggestion) {
      return;
    }
    const dataSpacePath = dataSpace.path;
    aiSuggestTelemetry.apply({
      existingText: dataSpace.description,
      appliedText: aiDocSuggestion,
      readCurrentText: (store) => {
        const element =
          store.graphManagerState.graph.getNullableElement(dataSpacePath);
        return element instanceof DataSpace
          ? { found: true, text: element.description }
          : { found: false };
      },
    });
    dataSpace_setDescription(dataSpace, aiDocSuggestion);
    setAIDocSuggestion(undefined);
  };
  const discardAIDocSuggestion = (): void => {
    aiSuggestTelemetry.discard();
    setAIDocSuggestion(undefined);
  };

  return (
    <PanelForm>
      {dataSpaceNeedsExecutionContextOrExecutable(dataSpace) && (
        <InlineIssue
          issue={{
            severity: 'error',
            message:
              'Add at least one execution context, or at least one executable.',
          }}
        />
      )}
      <PanelFormTextField
        name="Title"
        value={dataSpace.title ?? ''}
        prompt="Provide a title for this Data Space."
        update={handleTitleChange}
        placeholder="Enter title"
      />
      <div className="panel__content__form__section">
        <div className="panel__content__form__section__header__label">
          Description
          {aiDocSuggestion && (
            <span
              className="dataSpace-editor__ai-suggestion-badge"
              style={{ marginLeft: '0.8rem' }}
            >
              <SparkleIcon />
              AI Suggestion
            </span>
          )}
          {aiDocSuggester && !aiDocSuggestion && (
            <button
              className="dataSpace-editor__ai-suggest-btn"
              style={{ marginLeft: '0.8rem' }}
              onClick={(): void => {
                suggestDocumentationWithAI().catch(
                  editorStore.applicationStore.alertUnhandledError,
                );
              }}
              disabled={isSuggestingWithAI || isReadOnly}
              title="Use AI to suggest a description for this data space"
            >
              <SparkleIcon />
              <span>
                {isSuggestingWithAI ? 'Suggesting...' : 'Suggest with AI'}
              </span>
            </button>
          )}
        </div>
        <div className="panel__content__form__section__header__prompt">
          Provide a description for this Data Space.
        </div>
        <PanelLoadingIndicator isLoading={isSuggestingWithAI} />
        <textarea
          className={clsx('panel__content__form__section__textarea', {
            'textarea--ai-suggested': Boolean(aiDocSuggestion),
          })}
          spellCheck={false}
          disabled={isReadOnly}
          readOnly={Boolean(aiDocSuggestion)}
          value={aiDocSuggestion ?? dataSpace.description ?? ''}
          onChange={(event) => {
            handleDescriptionChange(event.target.value);
          }}
          placeholder="Enter description"
        />
        {aiDocSuggestion && (
          <div className="dataSpace-editor__ai-suggestion__actions">
            <button
              className="btn btn--dark dataSpace-editor__ai-suggestion__apply-btn"
              onClick={applyAIDocSuggestion}
              title="Apply AI suggestion to description"
            >
              Apply Suggestion
            </button>
            <button
              className="btn dataSpace-editor__ai-suggestion__dismiss-btn"
              onClick={discardAIDocSuggestion}
              title="Dismiss AI suggestion"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>
      <DataSpaceDiagramsSection />
      <DataSpaceElementsSection />
      <DataSpaceSupportInfoSection />
    </PanelForm>
  );
});
