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

import {
  CalendarIcon,
  clsx,
  EmptyClockIcon,
  HashtagIcon,
  ListIcon,
  QuestionIcon,
  SitemapIcon,
  StringTypeIcon,
  ToggleIcon,
} from '@finos/legend-art';
import { type CubeType, TypeFamily } from '@finos/legend-cube';

// A type's icon, apart from the column picker, so a definition flow
// (`@finos/legend-cube-builder/definition-flow`) shows a parameter's type
// without loading the editor's

const FAMILY_ICONS: Readonly<
  Partial<Record<TypeFamily, React.FC<{ className?: string }>>>
> = {
  [TypeFamily.STRING]: StringTypeIcon,
  [TypeFamily.BOOLEAN]: ToggleIcon,
  [TypeFamily.INTEGER]: HashtagIcon,
  [TypeFamily.FLOAT]: HashtagIcon,
  [TypeFamily.DECIMAL]: HashtagIcon,
  [TypeFamily.NUMBER]: HashtagIcon,
  [TypeFamily.STRICT_DATE]: CalendarIcon,
  [TypeFamily.DATETIME]: CalendarIcon,
  [TypeFamily.DATE]: CalendarIcon,
  [TypeFamily.STRICT_TIME]: EmptyClockIcon,
  [TypeFamily.ENUM]: ListIcon,
  // a JSON document: its fields as a tree (PLAN §11.20)
  [TypeFamily.VARIANT]: SitemapIcon,
};

/** The icon of a column type's family: text, number, date, ...; a question mark for the rest */
export const CubeColumnTypeIcon: React.FC<{
  type: CubeType;
  className?: string;
}> = (props) => {
  const Icon = FAMILY_ICONS[props.type.family] ?? QuestionIcon;
  return <Icon className={clsx('shrink-0', props.className)} />;
};
