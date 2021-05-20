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

import { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { useEditorStore } from '../../../../stores/EditorStore';
import {
  EntityDiffViewState,
  DIFF_VIEW_MODE,
} from '../../../../stores/editor-state/entity-diff-editor-state/EntityDiffViewState';
import { TextDiffView, JsonDiffView } from '../../../shared/DiffView';
import { MdCompareArrows } from 'react-icons/md';
import { VscGoToFile } from 'react-icons/vsc';
import type { EntityDiff } from '../../../../models/sdlc/models/comparison/EntityDiff';
import { EntityChangeType } from '../../../../models/sdlc/models/entity/EntityChange';
import { clsx } from '@finos/legend-studio-components';
import { EDITOR_LANGUAGE } from '../../../../stores/EditorConfig';
import { getPrettyLabelForRevision } from '../../../../stores/editor-state/entity-diff-editor-state/EntityDiffEditorState';
import { useApplicationStore } from '../../../../stores/ApplicationStore';

const getDiffItemTitle = (diff: EntityDiff): string | undefined => {
  switch (diff.entityChangeType) {
    case EntityChangeType.RENAME:
      return `${diff.newPath ? `${diff.newPath} \u2022 ` : ''}Renamed`;
    case EntityChangeType.DELETE:
      return `${diff.oldPath ? `${diff.oldPath} \u2022 ` : ''}Deleted`;
    case EntityChangeType.CREATE:
      return `${diff.newPath ? `${diff.newPath} \u2022 ` : ''}Created`;
    case EntityChangeType.MODIFY:
      return `${diff.newPath ? `${diff.newPath} \u2022 ` : ''}Modified`;
    default:
      return undefined; // no title
  }
};

export const EntityDiffSideBarItem = observer(
  (props: { diff: EntityDiff; isSelected: boolean; openDiff: () => void }) => {
    const { diff, isSelected, openDiff } = props;
    return (
      <button
        className={clsx('side-bar__panel__item', {
          'side-bar__panel__item--selected': isSelected,
        })}
        tabIndex={-1}
        title={getDiffItemTitle(diff)}
        onClick={openDiff}
      >
        <div className="diff-panel__item__info">
          <span
            className={clsx(
              'diff-panel__item__info-name',
              `diff-panel__item__info-name--${diff.entityChangeType.toLowerCase()}`,
            )}
          >
            {diff.entityName}
          </span>
          <span className="diff-panel__item__info-path">{diff.entityPath}</span>
        </div>
        <div
          className={clsx(
            'diff-panel__item__type',
            `diff-panel__item__type--${diff.entityChangeType.toLowerCase()}`,
          )}
        >
          {diff.getChangeTypeIcon()}
        </div>
      </button>
    );
  },
);

export const EntityDiffView = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const diffEditorState =
    editorStore.getCurrentEditorState(EntityDiffViewState);
  const {
    fromEntity,
    fromGrammarText,
    toEntity,
    toGrammarText,
    fromRevision,
    toRevision,
  } = diffEditorState;
  const goToElement = (): void => {
    if (diffEditorState.element) {
      editorStore.openElement(diffEditorState.element);
    }
  };

  useEffect(() => {
    diffEditorState.refresh();
  }, [diffEditorState]);
  useEffect(() => {
    diffEditorState
      .getFromGrammar()
      .catch(applicationStore.alertIllegalUnhandledError);
  }, [applicationStore, diffEditorState, diffEditorState.fromEntity]);
  useEffect(() => {
    diffEditorState
      .getToGrammar()
      .catch(applicationStore.alertIllegalUnhandledError);
  }, [applicationStore, diffEditorState, diffEditorState.toEntity]);

  return (
    <div className="entity-diff-view">
      <div className="entity-diff-view__header">
        <div className="entity-diff-view__header__info">
          <div className="entity-diff-view__header__info__revision-summary">
            <div className="entity-diff-view__header__info__revision-summary__revision">
              {getPrettyLabelForRevision(fromRevision)}
            </div>
            <div className="entity-diff-view__header__info__revision-summary__icon">
              <MdCompareArrows />
            </div>
            <div className="entity-diff-view__header__info__revision-summary__revision">
              {getPrettyLabelForRevision(toRevision)}
            </div>
          </div>
          <div className="entity-diff-view__header__info__comparison-summary">
            {diffEditorState.summaryText}
          </div>
        </div>
        <div className="entity-diff-view__header__actions">
          <button
            className="entity-diff-view__header__action"
            disabled={!diffEditorState.element}
            tabIndex={-1}
            onClick={goToElement}
            title={'Go to element'}
          >
            <VscGoToFile />
          </button>
        </div>
      </div>
      <div className="entity-diff-view__content">
        {diffEditorState.diffMode === DIFF_VIEW_MODE.GRAMMAR && (
          <TextDiffView
            language={EDITOR_LANGUAGE.PURE}
            from={fromGrammarText}
            to={toGrammarText}
          />
        )}
        {diffEditorState.diffMode === DIFF_VIEW_MODE.JSON && (
          <JsonDiffView from={fromEntity?.content} to={toEntity?.content} />
        )}
      </div>
    </div>
  );
});
