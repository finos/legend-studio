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

import type {
  PackageableElement,
  GraphManagerState,
} from '@finos/legend-graph';
import type { PackageableElementOption } from '../../stores/shared/PackageableElementOption.js';

const classifyElementGraphArea = (
  element: PackageableElement,
  graphManagerState: GraphManagerState,
): string =>
  graphManagerState.isSystemElement(element)
    ? 'system'
    : graphManagerState.isGeneratedElement(element)
    ? 'generated'
    : graphManagerState.isMainGraphElement(element)
    ? 'main'
    : graphManagerState.isDependencyElement(element)
    ? 'dependency'
    : '';

const generateOptionTooltipText = (
  element: PackageableElement,
  graphManagerState: GraphManagerState,
): string | undefined =>
  graphManagerState.isSystemElement(element)
    ? 'system element'
    : graphManagerState.isGeneratedElement(element)
    ? 'generated element'
    : graphManagerState.isDependencyElement(element)
    ? 'dependency element'
    : undefined;

export const getPackageableElementOptionFormatter = (props: {
  darkMode?: boolean;
  graphManagerState: GraphManagerState;
}): ((
  option: PackageableElementOption<PackageableElement>,
) => React.ReactNode) =>
  function PackageableElementOptionLabel(
    option: PackageableElementOption<PackageableElement>,
  ): React.ReactNode {
    const className = props.darkMode
      ? 'packageable-element-format-option-label--dark'
      : 'packageable-element-format-option-label';

    return (
      <div className={className}>
        <div
          title={`${generateOptionTooltipText(
            option.value,
            props.graphManagerState,
          )}`}
          className={`packageable-element-format-option-label-type packageable-element-format-option-label-type--${classifyElementGraphArea(
            option.value,
            props.graphManagerState,
          )}`}
        ></div>
        <div className={`${className}__name`}>{option.label}</div>
        {option.value.package && (
          <div className={`${className}__tag`}>{option.value.path}</div>
        )}
      </div>
    );
  };
