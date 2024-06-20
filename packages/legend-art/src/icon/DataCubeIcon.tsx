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

// NOTE: the icons in this file is pertained to only Data Cube, before
// merging them in the main icon registry, we should review them

import { GoBrowser, GoPin, GoX } from 'react-icons/go';
import { GrBottomCorner } from 'react-icons/gr';
import { MdOutlineInsertPageBreak } from 'react-icons/md';
import { HiOutlineCube } from 'react-icons/hi';
import { VscBook } from 'react-icons/vsc';
import { PiMouseScroll } from 'react-icons/pi';

export const DataCubeIcon = {
  Cube: HiOutlineCube,
  Documentation: VscBook,
  Pagination: MdOutlineInsertPageBreak,
  Pin: GoPin,
  ResizeCornerSE: GrBottomCorner,
  Scroll: PiMouseScroll,
  Window: GoBrowser,
  X: GoX,
};
