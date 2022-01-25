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

module.exports = {
  configs: {
    'computationally-expensive': require('./configs/computationally-expensive')
      .config,
    recommended: require('./configs/recommended').config,
    'scripts-override': require('./configs/scripts-override').config,
  },
  rules: {
    'enforce-module-import-hierarchy': require('./rules/enforce-module-import-hierarchy'),
    'enforce-protocol-export-prefix': require('./rules/enforce-protocol-export-prefix'),
    'enforce-protocol-file-prefix': require('./rules/enforce-protocol-file-prefix'),
    'no-cross-protocol-version-import': require('./rules/no-cross-protocol-version-import'),
    'no-cross-workspace-non-export-usage': require('./rules/no-cross-workspace-non-export-usage'),
    'no-cross-workspace-source-usage': require('./rules/no-cross-workspace-source-usage'),
    'no-same-workspace-absolute-import': require('./rules/no-same-workspace-absolute-import'),
    'no-same-workspace-index-import': require('./rules/no-same-workspace-index-import'),
  },
};
