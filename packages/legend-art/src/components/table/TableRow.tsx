// /**
//  * Copyright (c) 2020-present, Goldman Sachs
//  *
//  * Licensed under the Apache License, Version 2.0 (the "License");
//  * you may not use this file except in compliance with the License.
//  * You may obtain a copy of the License at
//  *
//  *     http://www.apache.org/licenses/LICENSE-2.0
//  *
//  * Unless required by applicable law or agreed to in writing, software
//  * distributed under the License is distributed on an "AS IS" BASIS,
//  * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//  * See the License for the specific language governing permissions and
//  * limitations under the License.
//  */

// import { capitalize } from '@finos/legend-shared';
// import { clsx } from 'clsx';
// import { observer } from 'mobx-react-lite';
// import React, { forwardRef } from 'react';
// import { KebabVerticalIcon } from '../CJS__Icon.cjs';

// export const TableHeader: React.FC<{
//   title: string;
//   children?: React.ReactNode;
//   className?: string;
// }> = (props) => {
//   const { title, children } = props;
//   return (
//     <div className="panel__header">
//       <div className="panel__header__title">
//         <div className="panel__header__title__label">{title}</div>
//       </div>
//       {children && <div className="panel__header__actions">{children}</div>}
//     </div>
//   );
// };

// export const TableMain = forwardRef<
//   HTMLDivElement,
//   { className?: string; headers: Array<string>; children: React.ReactNode }
// >(function TableTestingContent(props, ref) {
//   const { className, children, headers, ...otherProps } = props;
//   return (
//     <table className=" main__table">
//       <thead>
//         <tr>
//           {headers.map((header, idx) => (
//             <th key="idx">{header}</th>
//           ))}
//         </tr>
//       </thead>
//       <tbody>
//         <tr>
//           <td>table contents</td>
//           <td>tableTEsting</td>
//           <td>lorem</td>
//           <td>ipsum</td>
//           <button className="main__table__row__icon">
//             <KebabVerticalIcon />
//           </button>
//         </tr>
//         <tr>
//         <td>table contents</td>
//           <td>tableTEsting</td>
//           <td>lorem</td>
//           <td>ipsum</td>
//           <button className="main__table__row__icon">
//             <KebabVerticalIcon />
//           </button>{' '}
//         </tr>
//         <tr>
//         <td>table contents</td>
//           <td>tableTEsting</td>
//           <td>lorem</td>
//           <td>ipsum</td>
//           <button className="main__table__row__icon">
//             <KebabVerticalIcon />
//           </button>{' '}
//         </tr>
//       </tbody>
//     </table>
//   );
// });

// export const TableTestingContent = forwardRef<
//   HTMLDivElement,
//   { className?: string; children: React.ReactNode }
// >(function TableTestingContent(props, ref) {
//   const { className, children, ...otherProps } = props;
//   return (
//     <div ref={ref} className={clsx('menu', className)} {...otherProps}>
//       {children}
//     </div>
//   );
// });

// export const TableTestingContentItem: React.FC<{
//   children: React.ReactNode;
//   className?: string;
//   disabled?: boolean;
//   onClick?: () => void;
// }> = (props) => {
//   const { className, onClick, disabled, children, ...otherProps } = props;
//   return (
//     <button
//       className={clsx('menu__item', className)}
//       disabled={Boolean(disabled)}
//       onClick={onClick}
//       {...otherProps}
//     >
//       {children}
//     </button>
//   );
// };

// export const TableTestingContentDivider: React.FC<{
//   className?: string;
// }> = (props) => {
//   const { className, ...otherProps } = props;
//   return <div className={clsx('menu__divider', className)} {...otherProps} />;
// };

// export const TableTestingContentItemIcon: React.FC<{
//   children: React.ReactNode;
//   className?: string;
// }> = (props) => {
//   const { className, children, ...otherProps } = props;
//   return (
//     <div className={clsx('menu__item__icon', className)} {...otherProps}>
//       {children}
//     </div>
//   );
// };

// export const TableTestingContentItemBlankIcon: React.FC<{
//   className?: string;
// }> = (props) => {
//   const { className, ...otherProps } = props;
//   return (
//     <div className={clsx('menu__item__icon', className)} {...otherProps} />
//   );
// };

// export const TableTestingContentItemLabel: React.FC<{
//   children: React.ReactNode;
//   className?: string;
// }> = (props) => {
//   const { className, children, ...otherProps } = props;
//   return (
//     <div className={clsx('menu__item__label', className)} {...otherProps}>
//       {children}
//     </div>
//   );
// };

// export const TableActionItem: React.FC<{
//   tip: string;
//   className?: string;
//   disabled?: boolean;
//   children: React.ReactNode;
//   onClick?: () => void;
// }> = (props) => {
//   const { className, onClick, children, disabled, tip } = props;
//   return (
//     <button
//       className={clsx('panel__header__action', className)}
//       disabled={Boolean(disabled)}
//       onClick={onClick}
//       title={tip}
//     >
//       {children}
//     </button>
//   );
// };

// export const Table: React.FC<{
//   title: string;
//   children?: React.ReactNode;
//   className?: string;
// }> = (props) => {
//   const { title, children } = props;
//   return (
//     <div className="panel__header">
//       <div className="panel__header__title">
//         <div className="panel__header__title__label">{title}</div>
//       </div>
//       {children && <div className="panel__header__actions">{children}</div>}
//     </div>
//   );
// };

// export const oisfpsfiosapStringEditor = observer(
//   (props: {
//     propertyName: string;
//     description?: string;
//     value: string | undefined;
//     isReadOnly: boolean;
//     update: (value: string | undefined) => void;
//   }) => {
//     const { value, propertyName, description, isReadOnly, update } = props;
//     const displayValue = value ?? '';
//     const changeValue: React.ChangeEventHandler<HTMLInputElement> = (event) => {
//       const stringValue = event.target.value;
//       const updatedValue = stringValue ? stringValue : undefined;
//       update(updatedValue);
//     };

//     return (
//       <div className="panel__content__form__section">
//         <div className="panel__content__form__section__header__label">
//           svpToChangemhmhmmmmmmm {capitalize(propertyName)}
//         </div>
//         <div className="panel__content__form__section__header__prompt">
//           {description}
//         </div>
//         <input
//           className="panel__content__form__section__input"
//           spellCheck={false}
//           disabled={isReadOnly}
//           value={displayValue}
//           onChange={changeValue}
//         />
//       </div>
//     );
//   },
// );
