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

export const getPackageableElementOptionalFormatter = (props: {
  darkMode?: boolean;
  graphManagerStatePackage: GraphManagerState;
}): ((
  option: PackageableElementOption<PackageableElement>,
) => React.ReactNode) =>
  function PackageableElementOptionLabel(
    option: PackageableElementOption<PackageableElement>,
  ): React.ReactNode {
    const className = props.darkMode
      ? 'packageable-element-format-option-label--dark'
      : 'packageable-element-format-option-label';

    const element = option.value;

    const optionColor = props.graphManagerStatePackage.isPrimitiveTypeElement(
      element,
    )
      ? 'primitive'
      : props.graphManagerStatePackage.isSystemElement(element)
      ? 'system'
      : props.graphManagerStatePackage.isGeneratedElement(element)
      ? 'generated'
      : props.graphManagerStatePackage.isMainElement(element)
      ? 'generated'
      : props.graphManagerStatePackage.isDependencyElement(element)
      ? 'dependency'
      : '';

    return (
      <div className={className}>
        <span
          className={`packageable-element-format-option-label-type packageable-element-format-option-label-type--${optionColor}`}
        ></span>
        <div className={`${className}__name`}>{option.label}</div>
        {option.value.package && (
          <div className={`${className}__tag`}>{option.value.path}</div>
        )}
      </div>
    );
  };
