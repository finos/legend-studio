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

import type { PackageableElement } from '@finos/legend-graph';
import type { PackageableElementOption } from '../../stores/shared/PackageableElementOption.js';

export const getPackageableElementOptionalFormatter = (props?: {
  darkMode?: boolean;
}): ((
  option: PackageableElementOption<PackageableElement>,
) => React.ReactNode) =>
  function PackageableElementOptionLabel(
    option: PackageableElementOption<PackageableElement>,
  ): React.ReactNode {
    let optionType = '';
    //if no package, label type system
    if (
      option.value.package === undefined ||
      option.value.package.name === 'meta'
    ) {
      optionType = 'system';
    } else {
      optionType = 'generated';
    }

    const className = props?.darkMode
      ? 'packageable-element-format-option-label--dark'
      : 'packageable-element-format-option-label';

    return (
      <div className={className}>
        <span
          className={`packageable-element-format-option-label-type packageable-element-format-option-label-type__${optionType}`}
        ></span>
        <div className={`${className}__name`}>{option.label}</div>
        {option.value.package && (
          <div className={`${className}__tag`}>{option.value.path}</div>
        )}
      </div>
    );
  };
