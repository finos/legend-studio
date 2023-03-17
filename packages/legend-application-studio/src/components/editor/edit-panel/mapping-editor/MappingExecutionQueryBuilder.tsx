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
import {
  buildElementOption,
  getPackageableElementOptionFormatter,
  useApplicationStore,
} from '@finos/legend-application';
import { CustomSelectorInput, PURE_MappingIcon } from '@finos/legend-art';
import { getMappingCompatibleClasses } from '@finos/legend-graph';
import { QueryBuilderClassSelector } from '@finos/legend-query-builder';
import type { MappingExecutionQueryBuilderState } from '../../../../stores/editor-state/element-editor-state/mapping/MappingExecutionQueryBuilderState.js';
import { useEditorStore } from '../../EditorStoreProvider.js';

/**
 * This setup panel supports limited cascading, we will only show:
 * - For class selector: the list of compatible class with the specified mapping
 */
const MappingExecutionQueryBuilderSetupPanelContent = observer(
  (props: { queryBuilderState: MappingExecutionQueryBuilderState }) => {
    const { queryBuilderState } = props;
    const applicationStore = useApplicationStore();
    const editorStore = useEditorStore();

    // mapping
    const selectedMappingOption = buildElementOption(
      queryBuilderState.executionMapping,
    );

    // class
    const classes = getMappingCompatibleClasses(
      queryBuilderState.executionMapping,
      queryBuilderState.graphManagerState.usableClasses,
    );

    return (
      <>
        <div className="query-builder__setup__config-group">
          <div className="query-builder__setup__config-group__header">
            <div className="query-builder__setup__config-group__header__title">
              execution context
            </div>
          </div>
          <div className="query-builder__setup__config-group__content">
            <div className="query-builder__setup__config-group__item">
              <div
                className="btn--sm query-builder__setup__config-group__item__label"
                title="mapping"
              >
                <PURE_MappingIcon />
              </div>
              <CustomSelectorInput
                className="panel__content__form__section__dropdown query-builder__setup__config-group__item__selector"
                disabled={true}
                options={[]}
                value={selectedMappingOption}
                darkMode={
                  !applicationStore.layoutService
                    .TEMPORARY__isLightColorThemeEnabled
                }
                formatOptionLabel={getPackageableElementOptionFormatter({
                  darkMode:
                    !applicationStore.layoutService
                      .TEMPORARY__isLightColorThemeEnabled,
                  graph: editorStore.graphManagerState.graph,
                })}
              />
            </div>
          </div>
        </div>
        <QueryBuilderClassSelector
          queryBuilderState={queryBuilderState}
          classes={classes}
          noMatchMessage="No compatible class found for specified mapping"
        />
      </>
    );
  },
);

export const renderMappingExecutionQueryBuilderSetupPanelContent = (
  queryBuilderState: MappingExecutionQueryBuilderState,
): React.ReactNode => (
  <MappingExecutionQueryBuilderSetupPanelContent
    queryBuilderState={queryBuilderState}
  />
);
