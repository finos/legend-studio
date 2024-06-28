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
import { MdOutlineInsertPageBreak } from 'react-icons/md';
import { PiMouseScroll } from 'react-icons/pi';
import {
  TbBook,
  TbCube,
  TbNote,
  TbTable,
  TbTableColumn,
  TbTableRow,
  TbTableDown,
  TbTableOptions,
  TbColumnInsertRight,
  TbTablePlus,
  TbColumnRemove,
  TbColumns3,
  TbFreezeRow,
  TbFreezeColumn,
  TbFreezeRowColumn,
  TbCode,
  TbFilter,
  TbFilterPlus,
  TbFilterCode,
  TbSettingsFilled,
  TbChevronLeft,
  TbChevronRight,
  TbSearch,
  TbAlertTriangle,
  TbExclamationCircle,
  TbCaretDownFilled,
  TbLoader2,
  TbSettingsBolt,
  TbSettings,
} from 'react-icons/tb';

export const DataCubeIcon = {
  AdvancedSettings: TbSettingsBolt,
  CaretDown: TbCaretDownFilled,
  ChevronLeft: TbChevronLeft,
  ChevronRight: TbChevronRight,
  Code: TbCode,
  Cube: TbCube,
  Loader: TbLoader2,
  Documentation: TbBook,
  Note: TbNote,
  Pin: GoPin,
  Search: TbSearch,
  Settings: TbSettings,
  Table: TbTable,
  TableColumn: TbFreezeColumn,
  TableColumnOptions__Settings: TbSettingsFilled,
  TableColumns: TbColumns3,
  TableExtendedColumn: TbColumnInsertRight,
  TableFilter: TbFilter,
  TableFilterPlus: TbFilterPlus,
  TableFilterCode: TbFilterCode,
  TableGroupBy: TbTableColumn,
  TableOptions: TbTableOptions,
  TablePagination: MdOutlineInsertPageBreak,
  TablePivot: TbTableRow,
  TablePlus: TbTablePlus,
  TableRemoveColumn: TbColumnRemove,
  TableRow: TbFreezeRow,
  TableRowColumn: TbFreezeRowColumn,
  TableScroll: PiMouseScroll,
  TableSort: TbTableDown,
  Window: GoBrowser,
  X: GoX,
  Warning: TbAlertTriangle,
  WarningCircle: TbExclamationCircle,
};
