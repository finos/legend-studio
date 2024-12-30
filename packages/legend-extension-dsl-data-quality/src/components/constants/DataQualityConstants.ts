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

export enum DATA_QUALITY_VALIDATION_TEST_ID {
  DATA_QUALITY_VALIDATION_EXPLORER = 'data-quality-validation__explorer',
  DATA_QUALITY_VALIDATION_TOOLTIP_ICON = 'data-quality-validation__tooltip__icon',
  DATA_QUALITY_VALIDATION_SETUP = 'data-quality-validation__setup',
  DATA_QUALITY_VALIDATION_TREE = 'data-quality-validation-tree',
  DATA_QUALITY_VALIDATION_RESULT_PANEL = 'data-quality-result-panel',
  DATA_QUALITY_VALIDATION_RESULT_ANALYTICS = 'data-quality-result-analytics',
}

export const USER_ATTESTATION_MESSAGE =
  'I attest that I am aware of the sensitive data leakage risk when exporting queried data. The data I export will only be used by me.';
