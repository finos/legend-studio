/**
 * Copyright Goldman Sachs
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

import type { V1_Variable } from '../../model/valueSpecification/V1_Variable';
import type { V1_RootGraphFetchTree } from '../../model/valueSpecification/raw/graph/V1_RootGraphFetchTree';
import type { V1_Lambda } from '../../model/valueSpecification/raw/V1_Lambda';
import type { V1_Class } from '../../model/valueSpecification/raw/V1_Class';
import type { V1_Enum } from '../../model/valueSpecification/raw/V1_Enum';
import type { V1_EnumValue } from '../../model/valueSpecification/raw/V1_EnumValue';
import type { V1_Path } from '../../model/valueSpecification/raw/path/V1_Path';
import type { V1_AppliedFunction } from './application/V1_AppliedFunction';
import type { V1_Collection } from '../../model/valueSpecification/raw/V1_Collection';
import type { V1_CDecimal } from '../../model/valueSpecification/raw/V1_CDecimal';
import type { V1_CInteger } from '../../model/valueSpecification/raw/V1_CInteger';
import type { V1_CString } from '../../model/valueSpecification/raw/V1_CString';
import type { V1_CFloat } from '../../model/valueSpecification/raw/V1_CFloat';
import type { V1_CDateTime } from '../../model/valueSpecification/raw/V1_CDateTime';
import type { V1_CStrictTime } from '../../model/valueSpecification/raw/V1_CStrictTime';
import type { V1_CStrictDate } from '../../model/valueSpecification/raw/V1_CStrictDate';
import type { V1_CLatestDate } from '../../model/valueSpecification/raw/V1_CLatestDate';
import type { V1_CBoolean } from '../../model/valueSpecification/raw/V1_CBoolean';
import type { V1_AggregateValue } from '../../model/valueSpecification/raw/V1_AggregateValue';
import type { V1_Pair } from '../../model/valueSpecification/raw/V1_Pair';
import type { V1_MappingInstance } from '../../model/valueSpecification/raw/V1_MappingInstance';
import type { V1_RuntimeInstance } from '../../model/valueSpecification/raw/V1_RuntimeInstance';
import type { V1_ExecutionContextInstance } from '../../model/valueSpecification/raw/V1_ExecutionContextInstance';
import type { V1_PropertyGraphFetchTree } from '../../model/valueSpecification/raw/graph/V1_PropertyGraphFetchTree';
import type { V1_SerializationConfig } from '../../model/valueSpecification/raw/V1_SerializationConfig';
import type { V1_UnitType } from '../../model/valueSpecification/raw/V1_UnitType';
import type { V1_KeyExpression } from '../../model/valueSpecification/raw/V1_KeyExpression';
import type { V1_PrimitiveType } from '../../model/valueSpecification/raw/V1_PrimitiveType';
import type { V1_UnitInstance } from '../../model/valueSpecification/raw/V1_UnitInstance';
import type { V1_PureList } from '../../model/valueSpecification/raw/V1_PureList';
import type { V1_TDSAggregateValue } from '../../model/valueSpecification/raw/V1_TDSAggregateValue';
import type { V1_TDSColumnInformation } from '../../model/valueSpecification/raw/V1_TDSColumnInformation';
import type { V1_TDSSortInformation } from '../../model/valueSpecification/raw/V1_TDSSortInformation';
import type { V1_TdsOlapRank } from '../../model/valueSpecification/raw/V1_TdsOlapRank';
import type { V1_TdsOlapAggregation } from '../../model/valueSpecification/raw/V1_TdsOlapAggregation';
import type { V1_AppliedProperty } from './application/V1_AppliedProperty';

export interface V1_ValueSpecificationVisitor<T> {
  visit_Class(valueSpecification: V1_Class): T;
  visit_Enum(valueSpecification: V1_Enum): T;
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
  visit_MappingInstance(valueSpecification: V1_MappingInstance): T;
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
}

export abstract class V1_ValueSpecification {
  abstract accept_ValueSpecificationVisitor<T>(
    visitor: V1_ValueSpecificationVisitor<T>,
  ): T;
}
