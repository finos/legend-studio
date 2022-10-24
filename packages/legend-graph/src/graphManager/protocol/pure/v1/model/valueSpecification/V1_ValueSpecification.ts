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

import type { V1_Variable } from '../../model/valueSpecification/V1_Variable.js';
import type { V1_RootGraphFetchTree } from '../../model/valueSpecification/raw/graph/V1_RootGraphFetchTree.js';
import type { V1_Lambda } from '../../model/valueSpecification/raw/V1_Lambda.js';
import type { V1_EnumValue } from '../../model/valueSpecification/raw/V1_EnumValue.js';
import type { V1_Path } from '../../model/valueSpecification/raw/path/V1_Path.js';
import type { V1_AppliedFunction } from './application/V1_AppliedFunction.js';
import type { V1_Collection } from '../../model/valueSpecification/raw/V1_Collection.js';
import type { V1_CDecimal } from '../../model/valueSpecification/raw/V1_CDecimal.js';
import type { V1_CInteger } from '../../model/valueSpecification/raw/V1_CInteger.js';
import type { V1_CString } from '../../model/valueSpecification/raw/V1_CString.js';
import type { V1_CFloat } from '../../model/valueSpecification/raw/V1_CFloat.js';
import type { V1_CDateTime } from '../../model/valueSpecification/raw/V1_CDateTime.js';
import type { V1_CStrictTime } from '../../model/valueSpecification/raw/V1_CStrictTime.js';
import type { V1_CStrictDate } from '../../model/valueSpecification/raw/V1_CStrictDate.js';
import type { V1_CLatestDate } from '../../model/valueSpecification/raw/V1_CLatestDate.js';
import type { V1_CBoolean } from '../../model/valueSpecification/raw/V1_CBoolean.js';
import type { V1_AggregateValue } from '../../model/valueSpecification/raw/V1_AggregateValue.js';
import type { V1_Pair } from '../../model/valueSpecification/raw/V1_Pair.js';
import type { V1_RuntimeInstance } from '../../model/valueSpecification/raw/V1_RuntimeInstance.js';
import type { V1_ExecutionContextInstance } from '../../model/valueSpecification/raw/V1_ExecutionContextInstance.js';
import type { V1_PropertyGraphFetchTree } from '../../model/valueSpecification/raw/graph/V1_PropertyGraphFetchTree.js';
import type { V1_SerializationConfig } from '../../model/valueSpecification/raw/V1_SerializationConfig.js';
import type { V1_UnitType } from '../../model/valueSpecification/raw/V1_UnitType.js';
import type { V1_KeyExpression } from '../../model/valueSpecification/raw/V1_KeyExpression.js';
import type { V1_PrimitiveType } from '../../model/valueSpecification/raw/V1_PrimitiveType.js';
import type { V1_UnitInstance } from '../../model/valueSpecification/raw/V1_UnitInstance.js';
import type { V1_PureList } from '../../model/valueSpecification/raw/V1_PureList.js';
import type { V1_TDSAggregateValue } from '../../model/valueSpecification/raw/V1_TDSAggregateValue.js';
import type { V1_TDSColumnInformation } from '../../model/valueSpecification/raw/V1_TDSColumnInformation.js';
import type { V1_TDSSortInformation } from '../../model/valueSpecification/raw/V1_TDSSortInformation.js';
import type { V1_TdsOlapRank } from './raw/V1_TDSOlapRank.js';
import type { V1_TdsOlapAggregation } from './raw/V1_TDSOlapAggregation.js';
import type { V1_AppliedProperty } from './application/V1_AppliedProperty.js';
import type { V1_PackageableElementPtr } from './raw/V1_PackageableElementPtr.js';
import type { V1_HackedClass } from './raw/V1_HackedClass.js';
import type { V1_HackedUnit } from './raw/V1_HackedUnit.js';
import type { V1_INTERNAL__UnknownValueSpecification } from './V1_INTERNAL__UnknownValueSpecfication.js';

export interface V1_ValueSpecificationVisitor<T> {
  visit_PackageableElementPtr(valueSpecification: V1_PackageableElementPtr): T;
  visit_HackedClass(valueSpecification: V1_HackedClass): T;
  visit_HackedUnit(valueSpecification: V1_HackedUnit): T;

  visit_EnumValue(valueSpecification: V1_EnumValue): T;
  visit_Variable(valueSpecification: V1_Variable): T;
  visit_Lambda(valueSpecification: V1_Lambda): T;
  visit_Path(valueSpecification: V1_Path): T;
  visit_AppliedFunction(valueSpecification: V1_AppliedFunction): T;
  visit_AppliedProperty(valueSpecification: V1_AppliedProperty): T;
  visit_Collection(valueSpecification: V1_Collection): T;
  visit_CInteger(valueSpecification: V1_CInteger): T;
  visit_CDecimal(valueSpecification: V1_CDecimal): T;
  visit_CString(valueSpecification: V1_CString): T;
  visit_CBoolean(valueSpecification: V1_CBoolean): T;
  visit_CFloat(valueSpecification: V1_CFloat): T;
  visit_CDateTime(valueSpecification: V1_CDateTime): T;
  visit_CStrictDate(valueSpecification: V1_CStrictDate): T;
  visit_CStrictTime(valueSpecification: V1_CStrictTime): T;
  visit_CLatestDate(valueSpecification: V1_CLatestDate): T;

  visit_AggregateValue(valueSpecification: V1_AggregateValue): T;
  visit_Pair(valueSpecification: V1_Pair): T;
  visit_RuntimeInstance(valueSpecification: V1_RuntimeInstance): T;
  visit_ExecutionContextInstance(
    valueSpecification: V1_ExecutionContextInstance,
  ): T;
  visit_PureList(valueSpecification: V1_PureList): T;
  visit_RootGraphFetchTree(valueSpecification: V1_RootGraphFetchTree): T;
  visit_PropertyGraphFetchTree(
    valueSpecification: V1_PropertyGraphFetchTree,
  ): T;
  visit_SerializationConfig(valueSpecification: V1_SerializationConfig): T;
  visit_UnitType(valueSpecification: V1_UnitType): T;
  visit_UnitInstance(valueSpecification: V1_UnitInstance): T;
  visit_KeyExpression(valueSpecification: V1_KeyExpression): T;
  visit_PrimitiveType(valueSpecification: V1_PrimitiveType): T;

  // TDS
  visit_TDSAggregateValue(valueSpecification: V1_TDSAggregateValue): T;
  visit_TDSColumnInformation(valueSpecification: V1_TDSColumnInformation): T;
  visit_TDSSortInformation(valueSpecification: V1_TDSSortInformation): T;
  visit_TdsOlapRank(valueSpecification: V1_TdsOlapRank): T;
  visit_TdsOlapAggregation(valueSpecification: V1_TdsOlapAggregation): T;

  visit_INTERNAL__UnknownValueSpecfication(
    valueSpecification: V1_INTERNAL__UnknownValueSpecification,
  ): T;
}

export abstract class V1_ValueSpecification {
  abstract accept_ValueSpecificationVisitor<T>(
    visitor: V1_ValueSpecificationVisitor<T>,
  ): T;
}
