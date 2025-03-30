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
import { BlankPanelContent } from '@finos/legend-art';
import type { DatabaseEditorState } from '../../../../stores/editor/editor-state/element-editor-state/database/DatabaseEditorState.js';

export const DatabaseJoinsPanel = observer(
  (props: { databaseEditorState: DatabaseEditorState }) => {
    const { databaseEditorState } = props;
    const database = databaseEditorState.database;
    const isReadOnly = databaseEditorState.isReadOnly;

    return (
      <BlankPanelContent>
        <div className="database-editor__joins-panel">
          {database.joins.length === 0 ? (
            <div className="database-editor__joins-panel__empty">
              No joins defined
            </div>
          ) : (
            database.joins.map((join) => (
              <div key={join.name} className="database-editor__join">
                <div className="database-editor__join__name">{join.name}</div>
              </div>
            ))
          )}
        </div>
      </BlankPanelContent>
    );
  },
);
