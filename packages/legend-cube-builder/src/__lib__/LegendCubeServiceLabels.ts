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

import { MESSAGE_SERVICE_NOT_READABLE } from '@finos/legend-cube';

// The text of service sources (PLAN §6.4), in progress: the source dialog's
// Service tab and a service's panel

export const CUBE_SERVICE_MESSAGE = {
  /** Why a service source isn't valid yet: its first line is the node's error */
  NOT_READABLE: `${MESSAGE_SERVICE_NOT_READABLE}\nPicking a service works; reading its columns and rows is still being built.`,
  NO_CATALOG: "This Legend deployment doesn't list services",
  CUBE_CHANGED:
    'The cube changed while the service was being added; pick it again.',
  NONE: 'No services are deployed.',
  NO_MATCH: 'No service matches the search.',
  IN_PROGRESS:
    "Services are in progress: a service can be added to the canvas, but Cube can't read it yet.",
} as const;

/** How many of the matching services the tab shows, when it doesn't show them all */
export const getShownServicesLabel = (
  shown: number,
  matching: number,
): string | undefined =>
  shown < matching
    ? `Showing ${shown} of ${matching} services: search to narrow the list`
    : undefined;
