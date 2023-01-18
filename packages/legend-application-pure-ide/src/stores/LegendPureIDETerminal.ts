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

import { flowResult } from 'mobx';
import { FileCoordinate } from '../server/models/File.js';
import type { EditorStore } from './EditorStore.js';

const LEGEND_PURE_IDE_TERMINAL_WEBLINK_REGEX =
  /(?:(?<url>https?:[/]{2}[^\s"'!*(){}|\\^<>`]*[^\s"':,.!?{}|\\^~[\]`()<>])|(?<path>resource:(?<path_sourceId>\/?(?:\w\/)*\w+(?:.\w+)*) (?:line:(?<path_line>\d+)) (?:column:(?<path_column>\d+))))/;

export const setupTerminal = (editorStore: EditorStore): void => {
  editorStore.applicationStore.terminalService.terminal.setup({
    webLinkProvider: {
      handler: (event, text) => {
        const match = text.match(LEGEND_PURE_IDE_TERMINAL_WEBLINK_REGEX);
        if (match?.groups?.url) {
          editorStore.applicationStore.navigator.visitAddress(match.groups.url);
        } else if (
          match?.groups?.path &&
          match?.groups?.path_sourceId &&
          match?.groups?.path_column &&
          match?.groups?.path_line
        ) {
          flowResult(
            editorStore.loadFile(
              match.groups.path_sourceId,
              new FileCoordinate(
                match.groups.path_sourceId,
                Number.parseInt(match.groups.path_line, 10),
                Number.parseInt(match.groups.path_column, 10),
              ),
            ),
          ).catch(editorStore.applicationStore.alertUnhandledError);
        }
      },
      regex: LEGEND_PURE_IDE_TERMINAL_WEBLINK_REGEX,
    },
  });
};
