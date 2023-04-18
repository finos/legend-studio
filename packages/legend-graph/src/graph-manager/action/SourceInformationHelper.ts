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

import { assertTrue } from '@finos/legend-shared';
import type { SourceInformation } from './SourceInformation.js';

// NOTE: @ is chosen because it is not part of identifier token in Pure grammar
// TODO: handle the case of quote identifier e.g. model::something::'I have an @ in me'
const COORDINATE_DELIMITER = '@';

export const extractSourceInformationCoordinates = (
  sourceInformation: SourceInformation | undefined,
): string[] | undefined => {
  if (!sourceInformation) {
    return undefined;
  }
  const coordinates = sourceInformation.sourceId.split(COORDINATE_DELIMITER);
  assertTrue(
    coordinates.length > 0,
    `Can't extract source information coordinates: source ID must be a joined string with delimiter '${COORDINATE_DELIMITER}'`,
  );
  return coordinates;
};

export const buildSourceInformationSourceId = (coordinates: string[]): string =>
  coordinates.join(COORDINATE_DELIMITER);
