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
  AlignBottomIcon,
  AlignMiddleIcon,
  AlignTopIcon,
  ArrowsJoinIcon,
  CompressIcon,
  DataCubeIcon,
  DatabaseImportIcon,
  clsx,
  FilterIcon,
  LayerGroupIcon,
  PackageIcon,
  PencilIcon,
  QuestionSquareIcon,
  SigmaIcon,
  SortIcon,
  TableIcon,
} from '@finos/legend-art';

/** The icon of each icon name a node definition gives (`NodeDefinition.icon`) */
const NODE_ICONS: Readonly<
  Record<string, React.FC<{ className?: string; title?: string }>>
> = {
  table: TableIcon,
  dataProduct: PackageIcon,
  ingest: DatabaseImportIcon,
  filter: FilterIcon,
  join: ArrowsJoinIcon,
  concat: LayerGroupIcon,
  limit: AlignTopIcon,
  drop: AlignBottomIcon,
  slice: AlignMiddleIcon,
  distinct: CompressIcon,
  restrict: DataCubeIcon.TableColumns,
  group: DataCubeIcon.TableGroupBy,
  partition: SigmaIcon,
  rename: PencilIcon,
  sort: SortIcon,
};

/** Whether a node definition's icon name maps to an icon, rather than the question mark */
export const hasCubeNodeIcon = (name: string): boolean =>
  Object.hasOwn(NODE_ICONS, name);

/** A node type's icon; an unknown name, or an Unknown node, gets a question mark */
export const CubeNodeIcon: React.FC<{
  icon: string | undefined;
  className?: string;
}> = (props) => {
  const { icon, className } = props;
  // an own key only: a name such as `constructor` must not reach Object's
  const Icon =
    icon !== undefined && hasCubeNodeIcon(icon)
      ? (NODE_ICONS[icon] ?? QuestionSquareIcon)
      : QuestionSquareIcon;
  return <Icon className={clsx(className)} />;
};
