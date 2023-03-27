// const DataSpaceUsageShowcaseTDSSampleOutputViewer = observer(
//   (props: {
//     dataSpaceViewerState: DataSpaceViewerState;
//     showcase: HACKY__DataSpaceUsageShowcase;
//     sampleOutput: HACKY__DataSpaceUsageShowcaseTDSSampleOutput;
//   }) => {
//     const { showcase, sampleOutput: sampleOutput } = props;

//     const toggleShowSampleOutput = (): void =>
//       showcase.setShowSampleOutput(!showcase.showSampleOutput);

//     return (
//       <div
//         className={clsx('data-space__viewer__usage__block', {
//           'data-space__viewer__usage__block--collapsed':
//             !showcase.showSampleOutput,
//         })}
//       >
//         <div
//           className="data-space__viewer__usage__block__header"
//           onClick={toggleShowSampleOutput}
//         >
//           <div className="data-space__viewer__usage__block__header__toggler">
//             {showcase.showSampleOutput ? <CaretDownIcon /> : <CaretRightIcon />}
//           </div>
//           <div className="data-space__viewer__usage__block__header__title">
//             Sample Output
//           </div>
//         </div>
//         {showcase.showSampleOutput && (
//           <div className="data-space__viewer__usage__block__content">
//             <table className="table data-space__viewer__usage__block__content__table">
//               <thead>
//                 <tr>
//                   {sampleOutput.headers.map((header, idx) => (
//                     // eslint-disable-next-line react/no-array-index-key
//                     <th key={idx} className="table__cell--left">
//                       {header}
//                     </th>
//                   ))}
//                 </tr>
//               </thead>
//               <tbody>
//                 {sampleOutput.rows.map((row, idx) => (
//                   // eslint-disable-next-line react/no-array-index-key
//                   <tr key={idx}>
//                     {row.map((cell, rowIdx) => (
//                       // eslint-disable-next-line react/no-array-index-key
//                       <td key={rowIdx} className="table__cell--left">
//                         {cell}
//                       </td>
//                     ))}
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         )}
//       </div>
//     );
//   },
// );

// const DataSpaceUsageShowcaseSampleOutputViewer = observer(
//   (props: {
//     dataSpaceViewerState: DataSpaceViewerState;
//     showcase: HACKY__DataSpaceUsageShowcase;
//   }) => {
//     const { dataSpaceViewerState, showcase } = props;
//     if (
//       showcase.outputDescription.sampleOutput instanceof
//       HACKY__DataSpaceUsageShowcaseTDSSampleOutput
//     ) {
//       return (
//         <DataSpaceUsageShowcaseTDSSampleOutputViewer
//           dataSpaceViewerState={dataSpaceViewerState}
//           showcase={showcase}
//           sampleOutput={showcase.outputDescription.sampleOutput}
//         />
//       );
//     }
//     return (
//       <BlankPanelContent>Can&apos;t display sample output</BlankPanelContent>
//     );
//   },
// );

// const DataSpaceUsageShowcaseTDSOutputDescriptionViewer = observer(
//   (props: {
//     dataSpaceViewerState: DataSpaceViewerState;
//     showcase: HACKY__DataSpaceUsageShowcase;
//     description: HACKY__DataSpaceUsageShowcaseTDSOutputDescription;
//   }) => {
//     const { showcase, description: description } = props;

//     const toggleShowOutputDescription = (): void =>
//       showcase.setShowOutputDescription(!showcase.showOutputDescription);

//     return (
//       <div
//         className={clsx('data-space__viewer__usage__block', {
//           'data-space__viewer__usage__block--collapsed':
//             !showcase.showOutputDescription,
//         })}
//       >
//         <div
//           className="data-space__viewer__usage__block__header"
//           onClick={toggleShowOutputDescription}
//         >
//           <div className="data-space__viewer__usage__block__header__toggler">
//             {showcase.showOutputDescription ? (
//               <CaretDownIcon />
//             ) : (
//               <CaretRightIcon />
//             )}
//           </div>
//           <div className="data-space__viewer__usage__block__header__title">
//             Output Description
//           </div>
//         </div>
//         {showcase.showOutputDescription && (
//           <div className="data-space__viewer__usage__block__content">
//             <table className="table data-space__viewer__usage__block__content__table">
//               <thead>
//                 <tr>
//                   <th className="table__cell--left">Column Name</th>
//                   <th className="table__cell--left">Description</th>
//                   <th className="table__cell--left">Sample Values</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {description.columns.map((column) => (
//                   <tr key={column.uuid}>
//                     <td className="table__cell--left">{column.name}</td>
//                     <td className="table__cell--left">{column.description}</td>
//                     <td className="table__cell--left">
//                       {column.sampleValues.join(', ')}
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         )}
//       </div>
//     );
//   },
// );

// const DataSpaceUsageShowcaseOutputDescriptionViewer = observer(
//   (props: {
//     dataSpaceViewerState: DataSpaceViewerState;
//     showcase: HACKY__DataSpaceUsageShowcase;
//   }) => {
//     const { dataSpaceViewerState, showcase } = props;
//     if (
//       showcase.outputDescription instanceof
//       HACKY__DataSpaceUsageShowcaseTDSOutputDescription
//     ) {
//       return (
//         <DataSpaceUsageShowcaseTDSOutputDescriptionViewer
//           dataSpaceViewerState={dataSpaceViewerState}
//           showcase={showcase}
//           description={showcase.outputDescription}
//         />
//       );
//     }
//     return (
//       <BlankPanelContent>
//         Can&apos;t display output description
//       </BlankPanelContent>
//     );
//   },
// );

// const DataSpaceUsageShowcaseViewer = observer(
//   (props: {
//     dataSpaceViewerState: DataSpaceViewerState;
//     showcase: HACKY__DataSpaceUsageShowcase;
//   }) => {
//     const { dataSpaceViewerState, showcase } = props;
//     const applicationStore = useApplicationStore();

//     const toggleShowQuery = (): void =>
//       showcase.setShowQuery(!showcase.showQuery);
//     const copyQuery: React.MouseEventHandler<HTMLButtonElement> = (
//       event,
//     ): void => {
//       event.preventDefault();
//       event.stopPropagation();

//       applicationStore.clipboardService
//         .copyTextToClipboard(showcase.query)
//         .catch(applicationStore.alertUnhandledError);
//     };

//     return (
//       <div className="data-space__viewer__usage">
//         <div className="data-space__viewer__usage__title">{showcase.title}</div>
//         {showcase.description !== undefined && (
//           <div className="data-data-space__viewer__usage__description">
//             <MarkdownTextViewer
//               className="data-space__viewer__usage__description__markdown-content"
//               value={{
//                 value: showcase.description,
//               }}
//             />
//           </div>
//         )}
//         <div
//           className={clsx(
//             'data-space__viewer__usage__block data-space__viewer__usage__query',
//             {
//               'data-space__viewer__usage__block--collapsed':
//                 !showcase.showQuery,
//             },
//           )}
//         >
//           <div
//             className="data-space__viewer__usage__block__header"
//             onClick={toggleShowQuery}
//           >
//             <div className="data-space__viewer__usage__block__header__toggler">
//               {showcase.showQuery ? <CaretDownIcon /> : <CaretRightIcon />}
//             </div>
//             <div className="data-space__viewer__usage__block__header__title">
//               Query
//             </div>
//             <div className="data-space__viewer__usage__block__header__actions">
//               <button
//                 className="data-space__viewer__usage__block__header__action"
//                 tabIndex={-1}
//                 onClick={copyQuery}
//               >
//                 <CopyIcon />
//               </button>
//               <button
//                 className="data-space__viewer__usage__block__header__action"
//                 tabIndex={-1}
//               >
//                 <MoreHorizontalIcon />
//               </button>
//             </div>
//           </div>
//           {showcase.showQuery && (
//             <div className="data-space__viewer__usage__block__content">
//               <TextInputEditor
//                 inputValue={showcase.query}
//                 isReadOnly={true}
//                 language={EDITOR_LANGUAGE.PURE}
//                 hideGutter={true}
//                 showMiniMap={false}
//               />
//             </div>
//           )}
//         </div>
//         <DataSpaceUsageShowcaseOutputDescriptionViewer
//           dataSpaceViewerState={dataSpaceViewerState}
//           showcase={showcase}
//         />
//         <DataSpaceUsageShowcaseSampleOutputViewer
//           dataSpaceViewerState={dataSpaceViewerState}
//           showcase={showcase}
//         />
//       </div>
//     );
//   },
// );

// const DataSpaceUsageShowcasesPanel = observer(
//   (props: { dataSpaceViewerState: DataSpaceViewerState }) => {
//     const { dataSpaceViewerState } = props;

//     if (!dataSpaceViewerState.HACKY__previewExperimentalFeatures) {
//       return (
//         <BlankPanelContent>
//           Usage Showcases (Work in Progress)
//         </BlankPanelContent>
//       );
//     }
//     return (
//       <div className="data-space__viewer__main-panel__content data-space__viewer__usages">
//         {dataSpaceViewerState.dataSpaceAnalysisResult.HACKY__usageShowcases.map(
//           (showcase) => (
//             <DataSpaceUsageShowcaseViewer
//               key={showcase.uuid}
//               dataSpaceViewerState={dataSpaceViewerState}
//               showcase={showcase}
//             />
//           ),
//         )}
//       </div>
//     );
//   },
// );
