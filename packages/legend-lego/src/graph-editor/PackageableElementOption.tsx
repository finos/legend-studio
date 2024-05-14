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
  type PackageableElement,
  isSystemElement,
  isGeneratedElement,
  isDependencyElement,
} from '@finos/legend-graph';

export interface PackageableElementOption<T extends PackageableElement> {
  label: string;
  value: T;
}

export const buildElementOption = <T extends PackageableElement>(
  element: T,
): PackageableElementOption<T> => ({
  label: element.name,
  value: element,
});

const getElementColorCode = (element: PackageableElement): string =>
  isSystemElement(element)
    ? 'system'
    : isGeneratedElement(element)
      ? 'generated'
      : isDependencyElement(element)
        ? 'dependency'
        : '';

const generateOptionTooltipText = (
  element: PackageableElement,
): string | undefined =>
  isSystemElement(element)
    ? 'system element'
    : isGeneratedElement(element)
      ? 'generated element'
      : isDependencyElement(element)
        ? 'dependency element'
        : undefined;

export const getPackageableElementOptionFormatter = (props: {
  darkMode?: boolean | undefined;
}): ((
  option: PackageableElementOption<PackageableElement>,
) => React.ReactNode) =>
  function PackageableElementOptionLabel(
    option: PackageableElementOption<PackageableElement>,
  ): React.ReactNode {
    const { darkMode } = props;
    const className = darkMode
      ? 'packageable-element-option-label--dark'
      : 'packageable-element-option-label';
    const colorCode = getElementColorCode(option.value);

    return (
      <div className={className}>
        <div
          title={generateOptionTooltipText(option.value)}
          className={`packageable-element-option-label__type ${
            colorCode
              ? `packageable-element-option-label__type--${colorCode}`
              : ''
          } `}
        ></div>
        <div className={`${className}__name`}>{option.label}</div>
        {option.value.package && (
          <div className={`${className}__tag`}>{option.value.path}</div>
        )}
      </div>
    );
  };
