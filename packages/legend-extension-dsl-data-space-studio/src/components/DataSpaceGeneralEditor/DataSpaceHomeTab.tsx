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
  EditorForm,
  EditorFormSection,
  useEditorStore,
  useLegendAISuggestTelemetry,
  LEGEND_STUDIO_DOCUMENTATION_KEY,
  LEGENDAI_SUGGEST_STAGE,
  LEGENDAI_SUGGEST_SURFACE,
  type DSL_DataSpace_LegendStudioApplicationPlugin_Extension,
} from '@finos/legend-application-studio';
import { DataSpace } from '@finos/legend-extension-dsl-data-space/graph';
import { PanelLoadingIndicator, SparkleIcon } from '@finos/legend-art';
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
import {
  buildDataSpaceAISuggestionRows,
  serializeDataSpaceAISuggestionFields,
  type DataSpaceAISuggestionRow,
} from '../../stores/DataSpaceAISuggestion.js';
import {
  DataSpaceAISuggestionReviewModal,
  type DataSpaceAISuggestionSelection,
} from './DataSpaceAISuggestionReviewModal.js';
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
  const [aiSuggestion, setAISuggestion] = useState<
    | { id: number; rows: DataSpaceAISuggestionRow[]; overwrite: boolean }
    | undefined
  >(undefined);
  const aiSuggestTelemetry = useLegendAISuggestTelemetry(
    editorStore,
    {
      surface: LEGENDAI_SUGGEST_SURFACE.DATASPACE,
      elementPath: dataSpace.path,
    },
    { legendAIUrl, available: Boolean(aiDocSuggester), isReadOnly },
  );
  const suggestDocumentationWithAI = async (
    overwrite: boolean,
  ): Promise<void> => {
    if (!aiDocSuggester || !legendAIUrl) {
      return;
    }
    const request = aiSuggestTelemetry.launch({
      existingText: dataSpace.description,
    });
    setIsSuggestingWithAI(true);
    let stage = LEGENDAI_SUGGEST_STAGE.SERIALIZE;
    try {
      const definitions =
        await editorStore.graphManagerState.graphManager.graphToPureCode(
          editorStore.graphManagerState.graph,
        );
      stage = LEGENDAI_SUGGEST_STAGE.REQUEST;
      const suggestion = await aiDocSuggester(
        { definitions, data_space_name: dataSpace.path, overwrite },
        legendAIUrl,
      );
      const rows = buildDataSpaceAISuggestionRows(dataSpace, suggestion);
      const shouldShow = aiSuggestTelemetry.succeed(request, {
        // the response is structured, so measure the parts that differ
        suggestionText: rows.map((row) => row.suggestedValue).join('\n'),
        definitionsLength: definitions.length,
        currentText: dataSpace.description,
      });
      if (!shouldShow && overwrite) {
        editorStore.applicationStore.notificationService.notifyWarning(
          'LegendAI did not return any suggestions for this data space',
        );
        setAISuggestion(undefined);
        return;
      }
      // with nothing new to fill in, still open the review so the user can
      // ask to regenerate the fields that already have a value
      setAISuggestion((prev) => ({
        id: (prev?.id ?? 0) + 1,
        rows,
        overwrite,
      }));
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
  const applyAISuggestion = (
    selection: DataSpaceAISuggestionSelection,
  ): void => {
    const existingText = dataSpace.description;
    selection.forEach(({ row, value }) => row.write(dataSpace, value));
    const appliedRows = selection.map(({ row }) => row);
    const dataSpacePath = dataSpace.path;
    aiSuggestTelemetry.apply({
      existingText,
      appliedText: serializeDataSpaceAISuggestionFields(dataSpace, appliedRows),
      readCurrentText: (store) => {
        const element =
          store.graphManagerState.graph.getNullableElement(dataSpacePath);
        return element instanceof DataSpace
          ? {
              found: true,
              text: serializeDataSpaceAISuggestionFields(element, appliedRows),
            }
          : { found: false };
      },
    });
    setAISuggestion(undefined);
  };
  const discardAISuggestion = (): void => {
    aiSuggestTelemetry.discard();
    setAISuggestion(undefined);
  };
  const runSuggestWithAI = (overwrite: boolean): void => {
    suggestDocumentationWithAI(overwrite).catch(
      editorStore.applicationStore.alertUnhandledError,
    );
  };

  return (
    <EditorForm>
      {dataSpaceNeedsExecutionContextOrExecutable(dataSpace) && (
        <InlineIssue
          issue={{
            severity: 'error',
            message:
              'Add at least one execution context, or at least one executable.',
          }}
        />
      )}
      <PanelLoadingIndicator isLoading={isSuggestingWithAI && !aiSuggestion} />
      <EditorFormSection
        title="About"
        description="The title and description people see when they browse and search data spaces."
        actions={
          aiDocSuggester && (
            <button
              className="dataSpace-editor__ai-suggest-btn"
              onClick={(): void => runSuggestWithAI(false)}
              disabled={isSuggestingWithAI || isReadOnly}
              title="Use AI to suggest titles and descriptions for this data space, its execution contexts, diagrams, and executables, then review which to keep"
            >
              <SparkleIcon />
              <span>
                {isSuggestingWithAI ? 'Suggesting...' : 'Suggest with AI'}
              </span>
            </button>
          )
        }
      >
        <label className="dataSpace-editor-field">
          <span className="dataSpace-editor-field__label">Title</span>
          <input
            className="input input--dark dataSpace-editor-field__input"
            spellCheck={false}
            disabled={isReadOnly}
            value={dataSpace.title ?? ''}
            onChange={(event): void =>
              handleTitleChange(event.target.value || undefined)
            }
            placeholder={dataSpace.name}
          />
        </label>
        <label className="dataSpace-editor-field">
          <span className="dataSpace-editor-field__label">Description</span>
          <textarea
            className="input input--dark dataSpace-editor-field__textarea"
            spellCheck={false}
            disabled={isReadOnly}
            value={dataSpace.description ?? ''}
            onChange={(event): void => {
              handleDescriptionChange(event.target.value);
            }}
            rows={4}
            placeholder="What data this data space gives access to, and who it is for"
          />
        </label>
      </EditorFormSection>
      {aiSuggestion && (
        <DataSpaceAISuggestionReviewModal
          key={aiSuggestion.id}
          rows={aiSuggestion.rows}
          overwrite={aiSuggestion.overwrite}
          isRegenerating={isSuggestingWithAI}
          onApply={applyAISuggestion}
          onDismiss={discardAISuggestion}
          onRegenerate={(): void => runSuggestWithAI(true)}
        />
      )}
      <DataSpaceDiagramsSection />
      <DataSpaceElementsSection />
      <DataSpaceSupportInfoSection />
    </EditorForm>
  );
});
