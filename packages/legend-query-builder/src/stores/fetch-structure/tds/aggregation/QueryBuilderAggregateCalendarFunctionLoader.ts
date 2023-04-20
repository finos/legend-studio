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

import { QueryBuilderAggregateCalendarFunction_Ytd } from './calendarFunctions/QueryBuilderAggregateCalendarFunction_Ytd.js';
import { QueryBuilderAggregateCalendarFunction_Annualized } from './calendarFunctions/QueryBuilderAggregateCalendarFunction_Annualized.js';
import type { QueryBuilderAggregateCalendarFunction } from './QueryBuilderAggregateCalendarFunction.js';
import { QueryBuilderAggregateCalendarFunction_Cme } from './calendarFunctions/QueryBuilderAggregateCalendarFunction_Cme.js';
import { QueryBuilderAggregateCalendarFunction_Cw } from './calendarFunctions/QueryBuilderAggregateCalendarFunction_Cw.js';
import { QueryBuilderAggregateCalendarFunction_Cw_Fm } from './calendarFunctions/QueryBuilderAggregateCalendarFunction_Cw_Fm.js';
import { QueryBuilderAggregateCalendarFunction_Cy_Minus2 } from './calendarFunctions/QueryBuilderAggregateCalendarFunction_Cy_Minus2.js';
import { QueryBuilderAggregateCalendarFunction_Cy_Minus3 } from './calendarFunctions/QueryBuilderAggregateCalendarFunction_Cy_Minus3.js';
import { QueryBuilderAggregateCalendarFunction_Mtd } from './calendarFunctions/QueryBuilderAggregateCalendarFunction_Mtd.js';
import { QueryBuilderAggregateCalendarFunction_P12Wa } from './calendarFunctions/QueryBuilderAggregateCalendarFunction_P12Wa.js';
import { QueryBuilderAggregateCalendarFunction_P12Wtd } from './calendarFunctions/QueryBuilderAggregateCalendarFunction_P12Wtd.js';
import { QueryBuilderAggregateCalendarFunction_P4Wa } from './calendarFunctions/QueryBuilderAggregateCalendarFunction_P4Wa.js';
import { QueryBuilderAggregateCalendarFunction_P4Wtd } from './calendarFunctions/QueryBuilderAggregateCalendarFunction_P4Wtd.js';
import { QueryBuilderAggregateCalendarFunction_P52Wa } from './calendarFunctions/QueryBuilderAggregateCalendarFunction_P52Wa.js';
import { QueryBuilderAggregateCalendarFunction_P52Wtd } from './calendarFunctions/QueryBuilderAggregateCalendarFunction_P52Wtd.js';
import { QueryBuilderAggregateCalendarFunction_Pma } from './calendarFunctions/QueryBuilderAggregateCalendarFunction_Pma.js';
import { QueryBuilderAggregateCalendarFunction_Pmtd } from './calendarFunctions/QueryBuilderAggregateCalendarFunction_Pmtd.js';
import { QueryBuilderAggregateCalendarFunction_Pqtd } from './calendarFunctions/QueryBuilderAggregateCalendarFunction_Pqtd.js';
import { QueryBuilderAggregateCalendarFunction_PriorDay } from './calendarFunctions/QueryBuilderAggregateCalendarFunction_PriorDay.js';
import { QueryBuilderAggregateCalendarFunction_PriorYear } from './calendarFunctions/QueryBuilderAggregateCalendarFunction_PriorYear.js';
import { QueryBuilderAggregateCalendarFunction_Pw } from './calendarFunctions/QueryBuilderAggregateCalendarFunction_Pw.js';
import { QueryBuilderAggregateCalendarFunction_Pw_Fm } from './calendarFunctions/QueryBuilderAggregateCalendarFunction_Pw_Fm.js';
import { QueryBuilderAggregateCalendarFunction_Pwa } from './calendarFunctions/QueryBuilderAggregateCalendarFunction_Pwa.js';
import { QueryBuilderAggregateCalendarFunction_Pwtd } from './calendarFunctions/QueryBuilderAggregateCalendarFunction_Pwtd.js';
import { QueryBuilderAggregateCalendarFunction_Pymtd } from './calendarFunctions/QueryBuilderAggregateCalendarFunction_Pymtd.js';
import { QueryBuilderAggregateCalendarFunction_Pyqtd } from './calendarFunctions/QueryBuilderAggregateCalendarFunction_Pyqtd.js';
import { QueryBuilderAggregateCalendarFunction_Pytd } from './calendarFunctions/QueryBuilderAggregateCalendarFunction_Pytd.js';
import { QueryBuilderAggregateCalendarFunction_Pywa } from './calendarFunctions/QueryBuilderAggregateCalendarFunction_Pywa.js';
import { QueryBuilderAggregateCalendarFunction_Pywtd } from './calendarFunctions/QueryBuilderAggregateCalendarFunction_Pywtd.js';
import { QueryBuilderAggregateCalendarFunction_Qtd } from './calendarFunctions/QueryBuilderAggregateCalendarFunction_Qtd.js';
import { QueryBuilderAggregateCalendarFunction_ReportEndDay } from './calendarFunctions/QueryBuilderAggregateCalendarFunction_ReportEndDay.js';
import { QueryBuilderAggregateCalendarFunction_Wtd } from './calendarFunctions/QueryBuilderAggregateCalendarFunction_Wtd.js';

export const getQueryBuilderCoreAggregrationCalendarFunctions =
  (): QueryBuilderAggregateCalendarFunction[] => [
    new QueryBuilderAggregateCalendarFunction_Annualized(),
    new QueryBuilderAggregateCalendarFunction_Ytd(),
    new QueryBuilderAggregateCalendarFunction_Cme(),
    new QueryBuilderAggregateCalendarFunction_Cw(),
    new QueryBuilderAggregateCalendarFunction_Cw_Fm(),
    new QueryBuilderAggregateCalendarFunction_Cy_Minus2(),
    new QueryBuilderAggregateCalendarFunction_Cy_Minus3(),
    new QueryBuilderAggregateCalendarFunction_Mtd(),
    new QueryBuilderAggregateCalendarFunction_P12Wa(),
    new QueryBuilderAggregateCalendarFunction_P12Wtd(),
    new QueryBuilderAggregateCalendarFunction_P4Wa(),
    new QueryBuilderAggregateCalendarFunction_P4Wtd(),
    new QueryBuilderAggregateCalendarFunction_P52Wa(),
    new QueryBuilderAggregateCalendarFunction_P52Wtd(),
    new QueryBuilderAggregateCalendarFunction_Pma(),
    new QueryBuilderAggregateCalendarFunction_Pmtd(),
    new QueryBuilderAggregateCalendarFunction_Pqtd(),
    new QueryBuilderAggregateCalendarFunction_PriorDay(),
    new QueryBuilderAggregateCalendarFunction_PriorYear(),
    new QueryBuilderAggregateCalendarFunction_Pw(),
    new QueryBuilderAggregateCalendarFunction_Pw_Fm(),
    new QueryBuilderAggregateCalendarFunction_Pwa(),
    new QueryBuilderAggregateCalendarFunction_Pwtd(),
    new QueryBuilderAggregateCalendarFunction_Pymtd(),
    new QueryBuilderAggregateCalendarFunction_Pyqtd(),
    new QueryBuilderAggregateCalendarFunction_Pytd(),
    new QueryBuilderAggregateCalendarFunction_Pywa(),
    new QueryBuilderAggregateCalendarFunction_Pywtd(),
    new QueryBuilderAggregateCalendarFunction_Qtd(),
    new QueryBuilderAggregateCalendarFunction_ReportEndDay(),
    new QueryBuilderAggregateCalendarFunction_Wtd(),
  ];
