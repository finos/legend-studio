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
  CustomSelectorInput,
  PURE_MappingIcon,
  PURE_RuntimeIcon,
  PlayIcon,
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import { getMappingCompatibleClasses } from '@finos/legend-graph';
import {
  getPackageableElementOptionFormatter,
  buildElementOption,
  useApplicationStore,
} from '@finos/legend-application';
import {
  buildRuntimeValueOption,
  getRuntimeOptionFormatter,
  QueryBuilderClassSelector,
} from '../QueryBuilderSideBar.js';
import type {
  ServiceExecutionContext,
  ServiceQueryBuilderState,
} from '../../../stores/query-builder/workflows/ServiceQueryBuilderState.js';

type ExecutionContextOption = {
  label: string;
  value: ServiceExecutionContext;
};
const buildExecutionContextOption = (
  value: ServiceExecutionContext,
): ExecutionContextOption => ({
  label: value.key,
  value,
});

/**
 * This setup panel supports cascading in order: Execution Context -> Class
 *
 * In other words, we will only show:
 * - For class selector: the list of compatible classes with the selected mapping
 *
 * See details on propagation/cascading in {@link ServiceQueryBuilderState}
 */
const ServiceQueryBuilderSetupPanelContent = observer(
  (props: { queryBuilderState: ServiceQueryBuilderState }) => {
    const { queryBuilderState } = props;
    const applicationStore = useApplicationStore();

    // mapping
    const selectedMappingOption = queryBuilderState.mapping
      ? buildElementOption(queryBuilderState.mapping)
      : null;

    // runtime
    const selectedRuntimeOption = queryBuilderState.runtimeValue
      ? buildRuntimeValueOption(queryBuilderState.runtimeValue)
      : null;

    // execution context
    const executionContextOptions = queryBuilderState.executionContexts.map(
      buildExecutionContextOption,
    );
    const selectedExecutionContextOption =
      queryBuilderState.selectedExecutionContext
        ? buildExecutionContextOption(
            queryBuilderState.selectedExecutionContext,
          )
        : null;
    const onExecutionContextOptionChange = (
      option: ExecutionContextOption,
    ): void => {
      if (option.value === queryBuilderState.selectedExecutionContext) {
        return;
      }
      queryBuilderState.setSelectedExecutionContext(option.value);
      queryBuilderState.propagateExecutionContextChange(option.value);
      queryBuilderState.onExecutionContextChange?.(option.value);
    };

    // class
    const classes = queryBuilderState.mapping
      ? getMappingCompatibleClasses(
          queryBuilderState.mapping,
          queryBuilderState.graphManagerState.usableClasses,
        )
      : [];

    return (
      <>
        <div className="query-builder__setup__config-group">
          <div className="query-builder__setup__config-group__header">
            <div className="query-builder__setup__config-group__header__title">
              service execution context
            </div>
          </div>
          <div className="query-builder__setup__config-group__content">
            {/* We will display mapping and runtime selector for single-execution and execution context for multi-execution */}
            {Boolean(queryBuilderState.executionContexts.length) && (
              <>
                <div className="query-builder__setup__config-group__item">
                  <div
                    className="btn--sm query-builder__setup__config-group__item__label"
                    title="execution context"
                  >
                    <PlayIcon className="query-builder__setup__service__icon__execution-context" />
                  </div>
                  <CustomSelectorInput
                    className="panel__content__form__section__dropdown query-builder__setup__config-group__item__selector"
                    placeholder="Choose an execution context..."
                    options={executionContextOptions}
                    disabled={executionContextOptions.length <= 1}
                    onChange={onExecutionContextOptionChange}
                    value={selectedExecutionContextOption}
                    darkMode={!applicationStore.TEMPORARY__isLightThemeEnabled}
                  />
                </div>
              </>
            )}
            {!queryBuilderState.executionContexts.length && (
              <>
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
                    darkMode={!applicationStore.TEMPORARY__isLightThemeEnabled}
                    formatOptionLabel={getPackageableElementOptionFormatter({
                      darkMode:
                        !applicationStore.TEMPORARY__isLightThemeEnabled,
                    })}
                  />
                </div>
                <div className="query-builder__setup__config-group__item">
                  <div
                    className="btn--sm query-builder__setup__config-group__item__label"
                    title="runtime"
                  >
                    <PURE_RuntimeIcon />
                  </div>
                  <CustomSelectorInput
                    className="panel__content__form__section__dropdown query-builder__setup__config-group__item__selector"
                    disabled={true}
                    options={[]}
                    value={selectedRuntimeOption}
                    darkMode={!applicationStore.TEMPORARY__isLightThemeEnabled}
                    formatOptionLabel={getRuntimeOptionFormatter({
                      darkMode:
                        !applicationStore.TEMPORARY__isLightThemeEnabled,
                    })}
                  />
                </div>
              </>
            )}
          </div>
        </div>
        <QueryBuilderClassSelector
          queryBuilderState={queryBuilderState}
          classes={classes}
          noMatchMessage="No compatible class found for specified execution context"
        />
      </>
    );
  },
);

export const renderServiceQueryBuilderSetupPanelContent = (
  queryBuilderState: ServiceQueryBuilderState,
): React.ReactNode => (
  <ServiceQueryBuilderSetupPanelContent queryBuilderState={queryBuilderState} />
);
