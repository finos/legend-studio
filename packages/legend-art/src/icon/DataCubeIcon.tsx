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
import { GrCheckbox, GrCheckboxSelected } from 'react-icons/gr';
import {
  MdOutlineFormatBold,
  MdOutlineFormatItalic,
  MdOutlineStrikethroughS,
  MdOutlineFormatUnderlined,
  MdOutlineInsertPageBreak,
} from 'react-icons/md';
import {
  PiMouseScroll,
  PiTextAlignCenter,
  PiTextAlignLeft,
  PiTextAlignRight,
} from 'react-icons/pi';
import { RxLetterCaseCapitalize } from 'react-icons/rx';
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
  TbChevronDown,
  TbCaretRightFilled,
  TbMenu2,
  TbBug,
} from 'react-icons/tb';
import { VscError, VscInfo, VscQuestion } from 'react-icons/vsc';

export const DataCubeIcon = {
  AdvancedSettings: TbSettingsBolt,
  CaretDown: TbCaretDownFilled,
  CaretRight: TbCaretRightFilled,
  Checkbox: GrCheckbox,
  CheckboxSelected: GrCheckboxSelected,
  ChevronLeft: TbChevronLeft,
  ChevronRight: TbChevronRight,
  ChevronDown: TbChevronDown,
  Code: TbCode,
  Cube: TbCube,
  Debug: TbBug,
  Documentation: TbBook,
  DocumentationHint: VscQuestion,
  Error: VscError,
  FontBold: MdOutlineFormatBold,
  FontCase: RxLetterCaseCapitalize,
  FontItalic: MdOutlineFormatItalic,
  FontUnderline: MdOutlineFormatUnderlined,
  FontStrikethrough: MdOutlineStrikethroughS,
  Info: VscInfo,
  Loader: TbLoader2,
  Menu: TbMenu2,
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
  TextAlignLeft: PiTextAlignLeft,
  TextAlignCenter: PiTextAlignCenter,
  TextAlignRight: PiTextAlignRight,
  Window: GoBrowser,
  X: GoX,
  Warning: TbAlertTriangle,
  WarningCircle: TbExclamationCircle,
};
