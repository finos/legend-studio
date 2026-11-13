/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import type { LegendApplicationPlugin } from '@finos/legend-application';

/**
 * What the chat is about when a mode is switched on: the data product it
 * was opened from. Fields are undefined where the host does not know them.
 */
export interface LegendAIChatModeContext {
  dataProductPath: string | undefined;
  title: string | undefined;
  groupId: string | undefined;
  artifactId: string | undefined;
  versionId: string | undefined;
}

export interface LegendAIChatModeConfig {
  /** Unique identifier for this mode */
  key: string;
  /** Label of the mode's switch in the chat header */
  label: string;
  /** Renders the chat body while this mode is on; the header stays the host's. */
  renderChat: (context: LegendAIChatModeContext) => React.ReactNode;
}

export interface LegendAIChatMode_LegendApplicationPlugin_Extension
  extends LegendApplicationPlugin {
  /**
   * Get the modes this plugin adds to the Legend AI chat on data space and
   * data product pages; each gets a switch in the chat header.
   */
  getExtraLegendAIChatModeConfigs?(): LegendAIChatModeConfig[];
}

/** Every chat mode the application's plugins add. */
export function collectLegendAIChatModes(
  plugins: LegendApplicationPlugin[],
): LegendAIChatModeConfig[] {
  return plugins.flatMap(
    (plugin) =>
      (
        plugin as LegendAIChatMode_LegendApplicationPlugin_Extension
      ).getExtraLegendAIChatModeConfigs?.() ?? [],
  );
}
