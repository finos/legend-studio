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

import { SparkleIcon } from '@finos/legend-art';

export const DataProductWikiPlaceholder: React.FC<{ message: string }> = (
  props,
) => (
  <div className="data-space__viewer__wiki__placeholder">{props.message}</div>
);

export const DataProductPlaceholderPanel: React.FC<{
  header: string;
  message: string;
}> = (props) => {
  const { header, message } = props;

  return (
    <div className="data-space__viewer__panel">
      <div className="data-space__viewer__panel__header">
        <div className="data-space__viewer__panel__header__label">{header}</div>
      </div>
      <div className="data-space__viewer__panel__content">
        <div className="data-space__viewer__panel__content__placeholder">
          <SparkleIcon /> This is work in progress.{` ${message}`}
        </div>
      </div>
    </div>
  );
};
