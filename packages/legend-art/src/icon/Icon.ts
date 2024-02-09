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

/**
 * Previously, these exports rely on ES module interop to expose `default` export
 * properly. But since we use `ESM` for Typescript resolution now, we lose this
 * so we have to workaround by importing these and re-export them from CJS
 *
 * TODO: remove these when the package properly work with Typescript's nodenext
 * module resolution
 *
 * @workaround ESM
 * See https://github.com/microsoft/TypeScript/issues/49298
 */
import ReactIcons from './CJS__ReactIcons.cjs';

/* eslint @typescript-eslint/no-unsafe-assignment: 0 */
const TB = ReactIcons.TB;
export const ArrowsJoinIcon = TB.TbArrowsJoin2;
export const ArrowsSplitIcon = TB.TbArrowsSplit2;
export const FunctionIcon = TB.TbMathFunction;
export const RepoIcon = TB.TbBook;
export const OffIcon = TB.TbCircleOff;
export const CalendarClockIcon = TB.TbCalendarTime;
export const LastModifiedIcon = TB.TbClockEdit;
export const SQLIcon = TB.TbSql;
export const Snowflake_BrandIcon = TB.TbBrandSnowflake;

const MD = ReactIcons.MD;
export const ManageSearchIcon = MD.MdManageSearch; // to be reviewed
export const PencilIcon = MD.MdModeEdit;
export const StringTypeIcon = MD.MdTextFields;
export const MoreVerticalIcon = MD.MdMoreVert;
export const MoreHorizontalIcon = MD.MdMoreHoriz;
export const WrapTextIcon = MD.MdWrapText;
export const SaveAsIcon = MD.MdSaveAs;
export const SaveCurrIcon = MD.MdSave;
export const VerticalAlignBottomIcon = MD.MdVerticalAlignBottom;
export const RefreshIcon = MD.MdRefresh;
export const SigmaIcon = MD.MdFunctions;
export const CompareIcon = MD.MdCompareArrows;
export const CheckListIcon = MD.MdPlaylistAddCheck;
export const AddIcon = MD.MdAdd; // to be reviewed
export const EditIcon = MD.MdEdit; // to be reviewed
export const SubjectIcon = MD.MdSubject;
export const ViewHeadlineIcon = MD.MdViewHeadline;
export const AssistantIcon = MD.MdAssistant;
export const SettingsEthernetIcon = MD.MdSettingsEthernet;
export const LinkIcon = MD.MdLink;
export const WindowIcon = MD.MdWindow;
export const ReviewIcon = MD.MdReviews;
export const CalculateIcon = MD.MdCalculate;
export const LaunchIcon = MD.MdRocketLaunch;
export const DatasetIcon = MD.MdOutlineDataset;
export const VerifiedIcon = MD.MdVerified;
export const QueryIcon = MD.MdQueryStats;
export const CenterFocusIcon = MD.MdFilterCenterFocus;
export const DescriptionIcon = MD.MdOutlineDescription;
export const QuestionAnswerIcon = MD.MdQuestionAnswer;
export const FoldIcon = MD.MdUnfoldLess;
export const UnfoldIcon = MD.MdUnfoldMore;

const VSC = ReactIcons.VSC;
export const ErrorIcon = VSC.VscError;
export const WarningIcon = VSC.VscWarning;
export const WordWrapIcon = VSC.VscWordWrap;
export const GoToFileIcon = VSC.VscGoToFile;
export const CloseIcon = VSC.VscClose;
export const RunAllIcon = VSC.VscRunAll;
export const RunErrorsIcon = VSC.VscRunErrors;
export const OpenPreviewIcon = VSC.VscOpenPreview;
export const DiffIcon = VSC.VscDiff;
export const RegexIcon = VSC.VscRegex;
export const VersionsIcon = VSC.VscVersions;
export const CaseSensitiveIcon = VSC.VscCaseSensitive;
export const WholeWordMatchIcon = VSC.VscWholeWord;
export const ReferencesIcon = VSC.VscReferences;
export const WandIcon = VSC.VscWand;
export const CollapseTreeIcon = VSC.VscCollapseAll;
export const ExpandTreeIcon = VSC.VscExpandAll;
export const SerializeIcon = VSC.VscJson;
export const TableIcon = VSC.VscTable;

const BS = ReactIcons.BS;
export const FilledTriangleIcon = BS.BsFillTriangleFill;
export const TabulatedDataFileIcon = BS.BsFillFileEarmarkSpreadsheetFill;
export const BundleIcon = BS.BsBoxSeam;
export const ThinVerticalDragHandleIcon = BS.BsGripVertical;
export const AlignTopIcon = BS.BsAlignTop;
export const AlignMiddleIcon = BS.BsAlignMiddle;
export const AlignBottomIcon = BS.BsAlignBottom;
export const AlignStartIcon = BS.BsAlignStart;
export const AlignCenterIcon = BS.BsAlignCenter;
export const AlignEndIcon = BS.BsAlignEnd;
export const DistributeHorizontalIcon = BS.BsDistributeHorizontal;
export const DistributeVerticalIcon = BS.BsDistributeVertical;
export const DataAccessIcon = BS.BsDatabaseFillLock;
export const DataReadyIcon = BS.BsDatabaseFillCheck;
export const ThinChevronUpIcon = BS.BsChevronUp;
export const ThinChevronDownIcon = BS.BsChevronDown;
export const ThinChevronRightIcon = BS.BsChevronRight;
export const ThinChevronLeftIcon = BS.BsChevronLeft;
export const QuestionSquareIcon = BS.BsQuestionSquare;
export const QuestionSquareFillIcon = BS.BsQuestionSquareFill;
export const GenericTextFileIcon = BS.BsTextLeft;

/**
 * using @react-icons/all-files/... to reduce bundle size
 * @react-icons/all-files doesn't contain all icons from react-icons
 * Reference:
 * https://github.com/react-icons/react-icons/blob/master/README.md
 * https://github.com/react-icons/react-icons/issues/154#issuecomment-895976123
 */

//======================================================= HI =======================================================
import { HiCode } from '@react-icons/all-files/hi/HiCode.js';
import { HiHome } from '@react-icons/all-files/hi/HiHome.js';

export const CodeIcon = HiCode;
export const HomeIcon = HiHome;

//======================================================= io5 =======================================================
import { IoOpenOutline } from '@react-icons/all-files/io5/IoOpenOutline.js';
import { IoResize } from '@react-icons/all-files/io5/IoResize.js';
import { IoFileTrayFullOutline } from '@react-icons/all-files/io5/IoFileTrayFullOutline.js';
import { IoMenuOutline } from '@react-icons/all-files/io5/IoMenuOutline.js';
import { IoBeaker } from '@react-icons/all-files/io5/IoBeaker.js';
import { IoFlaskSharp } from '@react-icons/all-files/io5/IoFlaskSharp.js';
import { IoSyncCircleSharp } from '@react-icons/all-files/io5/IoSyncCircleSharp.js';
import { IoStatsChart } from '@react-icons/all-files/io5/IoStatsChart.js';
import { IoHelpBuoy } from '@react-icons/all-files/io5/IoHelpBuoy.js';
import { IoCloudDownloadOutline } from '@react-icons/all-files/io5/IoCloudDownloadOutline.js';
import { IoCloudUploadOutline } from '@react-icons/all-files/io5/IoCloudUploadOutline.js';
import { IoHelp } from '@react-icons/all-files/io5/IoHelp.js';

export const OpenIcon = IoOpenOutline;
export const ResizeIcon = IoResize;
export const FileTrayIcon = IoFileTrayFullOutline;
export const MenuIcon = IoMenuOutline;
export const BeakerIcon = IoBeaker;
export const FlaskIcon = IoFlaskSharp;
export const AvailabilityIcon = IoSyncCircleSharp;
export const StatisticsIcon = IoStatsChart;
export const SupportIcon = IoHelpBuoy;
export const CloudDownloadIcon = IoCloudDownloadOutline;
export const CloudUploadIcon = IoCloudUploadOutline;
export const QuestionThinIcon = IoHelp;

//======================================================= FA =======================================================
import { FaHistory } from '@react-icons/all-files/fa/FaHistory.js';
import { FaCrosshairs } from '@react-icons/all-files/fa/FaCrosshairs.js';
import { FaLayerGroup } from '@react-icons/all-files/fa/FaLayerGroup.js';
import { FaGhost } from '@react-icons/all-files/fa/FaGhost.js';
import { FaLock } from '@react-icons/all-files/fa/FaLock.js';
import { FaMask } from '@react-icons/all-files/fa/FaMask.js';
import { FaFile } from '@react-icons/all-files/fa/FaFile.js';
import { FaLongArrowAltRight } from '@react-icons/all-files/fa/FaLongArrowAltRight.js';
import { FaTimes } from '@react-icons/all-files/fa/FaTimes.js';
import { FaTimesCircle } from '@react-icons/all-files/fa/FaTimesCircle.js';
import { FaPlus } from '@react-icons/all-files/fa/FaPlus.js';
import { FaCog } from '@react-icons/all-files/fa/FaCog.js';
import { FaEye } from '@react-icons/all-files/fa/FaEye.js';
import { FaEyeSlash } from '@react-icons/all-files/fa/FaEyeSlash.js';
import { FaCaretUp } from '@react-icons/all-files/fa/FaCaretUp.js';
import { FaFire } from '@react-icons/all-files/fa/FaFire.js';
import { FaSave } from '@react-icons/all-files/fa/FaSave.js';
import { FaCaretDown } from '@react-icons/all-files/fa/FaCaretDown.js';
import { FaSquare } from '@react-icons/all-files/fa/FaSquare.js';
import { FaRegSquare } from '@react-icons/all-files/fa/FaRegSquare.js';
import { FaCheckSquare } from '@react-icons/all-files/fa/FaCheckSquare.js';
import { FaMinusSquare } from '@react-icons/all-files/fa/FaMinusSquare.js';
import { FaHashtag } from '@react-icons/all-files/fa/FaHashtag.js';
import { FaHammer } from '@react-icons/all-files/fa/FaHammer.js';
import { FaCommentDots } from '@react-icons/all-files/fa/FaCommentDots.js';
import { FaClock } from '@react-icons/all-files/fa/FaClock.js';
import { FaRegClock } from '@react-icons/all-files/fa/FaRegClock.js';
import { FaToggleOn } from '@react-icons/all-files/fa/FaToggleOn.js';
import { FaQuestion } from '@react-icons/all-files/fa/FaQuestion.js';
import { FaQuestionCircle } from '@react-icons/all-files/fa/FaQuestionCircle.js';
import { FaInfoCircle } from '@react-icons/all-files/fa/FaInfoCircle.js';
import { FaCompress } from '@react-icons/all-files/fa/FaCompress.js';
import { FaMap } from '@react-icons/all-files/fa/FaMap.js';
import { FaPlay } from '@react-icons/all-files/fa/FaPlay.js';
import { FaRobot } from '@react-icons/all-files/fa/FaRobot.js';
import { FaGripVertical } from '@react-icons/all-files/fa/FaGripVertical.js';
import { FaArrowRight } from '@react-icons/all-files/fa/FaArrowRight.js';
import { FaArrowLeft } from '@react-icons/all-files/fa/FaArrowLeft.js';
import { FaArrowAltCircleDown } from '@react-icons/all-files/fa/FaArrowAltCircleDown.js';
import { FaArrowAltCircleRight } from '@react-icons/all-files/fa/FaArrowAltCircleRight.js';
import { FaArrowCircleRight } from '@react-icons/all-files/fa/FaArrowCircleRight.js';
import { FaShapes } from '@react-icons/all-files/fa/FaShapes.js';
import { FaUser } from '@react-icons/all-files/fa/FaUser.js';
import { FaSkull } from '@react-icons/all-files/fa/FaSkull.js';
import { FaEnvelope } from '@react-icons/all-files/fa/FaEnvelope.js';
import { FaDollarSign } from '@react-icons/all-files/fa/FaDollarSign.js';
import { FaStar } from '@react-icons/all-files/fa/FaStar.js';
import { FaSearch } from '@react-icons/all-files/fa/FaSearch.js';
import { FaKey } from '@react-icons/all-files/fa/FaKey.js';
import { FaExternalLinkAlt } from '@react-icons/all-files/fa/FaExternalLinkAlt.js';
import { FaExternalLinkSquareAlt } from '@react-icons/all-files/fa/FaExternalLinkSquareAlt.js';
import { FaLightbulb } from '@react-icons/all-files/fa/FaLightbulb.js';
import { FaRegCircle } from '@react-icons/all-files/fa/FaRegCircle.js';
import { FaShieldAlt } from '@react-icons/all-files/fa/FaShieldAlt.js';
import { FaTag } from '@react-icons/all-files/fa/FaTag.js';
import { FaBolt } from '@react-icons/all-files/fa/FaBolt.js';
import { FaTags } from '@react-icons/all-files/fa/FaTags.js';
import { FaCheckCircle } from '@react-icons/all-files/fa/FaCheckCircle.js';
import { FaList } from '@react-icons/all-files/fa/FaList.js';
import { FaTrash } from '@react-icons/all-files/fa/FaTrash.js';
import { FaMinusCircle } from '@react-icons/all-files/fa/FaMinusCircle.js';
import { FaCircle } from '@react-icons/all-files/fa/FaCircle.js';
import { FaRegLightbulb } from '@react-icons/all-files/fa/FaRegLightbulb.js';
import { FaExclamationTriangle } from '@react-icons/all-files/fa/FaExclamationTriangle.js';
import { FaBug } from '@react-icons/all-files/fa/FaBug.js';
import { FaCircleNotch } from '@react-icons/all-files/fa/FaCircleNotch.js';
import { FaRegKeyboard } from '@react-icons/all-files/fa/FaRegKeyboard.js';
import { FaUserSecret } from '@react-icons/all-files/fa/FaUserSecret.js';
import { FaBuffer } from '@react-icons/all-files/fa/FaBuffer.js';
import { FaSitemap } from '@react-icons/all-files/fa/FaSitemap.js';
import { FaExpand } from '@react-icons/all-files/fa/FaExpand.js';
import { FaExpandArrowsAlt } from '@react-icons/all-files/fa/FaExpandArrowsAlt.js';
import { FaSortAlphaDown } from '@react-icons/all-files/fa/FaSortAlphaDown.js';
import { FaSortAlphaDownAlt } from '@react-icons/all-files/fa/FaSortAlphaDownAlt.js';
import { FaSort } from '@react-icons/all-files/fa/FaSort.js';
import { FaFolderPlus } from '@react-icons/all-files/fa/FaFolderPlus.js';
import { FaCaretLeft } from '@react-icons/all-files/fa/FaCaretLeft.js';
import { FaCaretRight } from '@react-icons/all-files/fa/FaCaretRight.js';
import { FaWrench } from '@react-icons/all-files/fa/FaWrench.js';
import { FaArrowDown } from '@react-icons/all-files/fa/FaArrowDown.js';
import { FaArrowUp } from '@react-icons/all-files/fa/FaArrowUp.js';
import { FaTerminal } from '@react-icons/all-files/fa/FaTerminal.js';
import { FaWindowMaximize } from '@react-icons/all-files/fa/FaWindowMaximize.js';
import { FaLongArrowAltDown } from '@react-icons/all-files/fa/FaLongArrowAltDown.js';
import { FaLongArrowAltUp } from '@react-icons/all-files/fa/FaLongArrowAltUp.js';
import { FaMeteor } from '@react-icons/all-files/fa/FaMeteor.js';
import { FaPiedPiperSquare } from '@react-icons/all-files/fa/FaPiedPiperSquare.js';
import { FaPuzzlePiece } from '@react-icons/all-files/fa/FaPuzzlePiece.js';
import { FaToggleOff } from '@react-icons/all-files/fa/FaToggleOff.js';
import { FaMapMarkerAlt } from '@react-icons/all-files/fa/FaMapMarkerAlt.js';
import { FaHatWizard } from '@react-icons/all-files/fa/FaHatWizard.js';
import { FaRegLaughWink } from '@react-icons/all-files/fa/FaRegLaughWink.js';
import { FaRegSadTear } from '@react-icons/all-files/fa/FaRegSadTear.js';
import { FaBusinessTime } from '@react-icons/all-files/fa/FaBusinessTime.js';
import { FaDatabase } from '@react-icons/all-files/fa/FaDatabase.js';
import { FaServer } from '@react-icons/all-files/fa/FaServer.js';
import { FaBrain } from '@react-icons/all-files/fa/FaBrain.js';
import { FaArchive } from '@react-icons/all-files/fa/FaArchive.js';
import { FaBookOpen } from '@react-icons/all-files/fa/FaBookOpen.js';
import { FaLevelDownAlt } from '@react-icons/all-files/fa/FaLevelDownAlt.js';
import { FaRegCalendarAlt } from '@react-icons/all-files/fa/FaRegCalendarAlt.js';
import { FaCalculator } from '@react-icons/all-files/fa/FaCalculator.js';
import { FaReadme } from '@react-icons/all-files/fa/FaReadme.js';
import { FaTruckLoading } from '@react-icons/all-files/fa/FaTruckLoading.js';
import { FaFolderOpen } from '@react-icons/all-files/fa/FaFolderOpen.js';
import { FaFolder } from '@react-icons/all-files/fa/FaFolder.js';
import { FaFileCode } from '@react-icons/all-files/fa/FaFileCode.js';
import { FaCodeBranch } from '@react-icons/all-files/fa/FaCodeBranch.js';
import { FaArrowAltCircleUp } from '@react-icons/all-files/fa/FaArrowAltCircleUp.js';
import { FaArrowAltCircleLeft } from '@react-icons/all-files/fa/FaArrowAltCircleLeft.js';
import { FaRegStopCircle } from '@react-icons/all-files/fa/FaRegStopCircle.js';
import { FaAsterisk } from '@react-icons/all-files/fa/FaAsterisk.js';
import { FaFilter } from '@react-icons/all-files/fa/FaFilter.js';
import { FaExclamationCircle } from '@react-icons/all-files/fa/FaExclamationCircle.js';
import { FaRocket } from '@react-icons/all-files/fa/FaRocket.js';
import { FaCheck } from '@react-icons/all-files/fa/FaCheck.js';
import { FaBan } from '@react-icons/all-files/fa/FaBan.js';
import { FaFileImport } from '@react-icons/all-files/fa/FaFileImport.js';
import { FaUserFriends } from '@react-icons/all-files/fa/FaUserFriends.js';
import { FaDownload } from '@react-icons/all-files/fa/FaDownload.js';
import { FaUpload } from '@react-icons/all-files/fa/FaUpload.js';
import { FaRegWindowRestore } from '@react-icons/all-files/fa/FaRegWindowRestore.js';
import { FaPauseCircle } from '@react-icons/all-files/fa/FaPauseCircle.js';
import { FaShare } from '@react-icons/all-files/fa/FaShare.js';
import { FaRegCopy } from '@react-icons/all-files/fa/FaRegCopy.js';
import { FaFileAlt } from '@react-icons/all-files/fa/FaFileAlt.js';
import { FaEdit } from '@react-icons/all-files/fa/FaEdit.js';
import { FaArrowsAltH } from '@react-icons/all-files/fa/FaArrowsAltH.js';
import { FaRegWindowMaximize } from '@react-icons/all-files/fa/FaRegWindowMaximize.js';

export const HistoryIcon = FaHistory;
export const CrosshairsIcon = FaCrosshairs;
export const LayerGroupIcon = FaLayerGroup;
export const GhostIcon = FaGhost;
export const LockIcon = FaLock;
export const MaskIcon = FaMask;
export const FileIcon = FaFile;
export const LongArrowRightIcon = FaLongArrowAltRight;
export const TimesIcon = FaTimes;
export const TimesCircleIcon = FaTimesCircle;
export const PlusIcon = FaPlus;
export const CogIcon = FaCog;
export const EyeIcon = FaEye;
export const CloseEyeIcon = FaEyeSlash;
export const CaretUpIcon = FaCaretUp;
export const CaretDownIcon = FaCaretDown;
export const FireIcon = FaFire;
export const SaveIcon = FaSave;
export const SquareIcon = FaSquare;
export const EmptySquareIcon = FaRegSquare;
export const CheckSquareIcon = FaCheckSquare;
export const MinusSquareIcon = FaMinusSquare;
export const HashtagIcon = FaHashtag;
export const HammerIcon = FaHammer;
export const ChatIcon = FaCommentDots;
export const ClockIcon = FaClock;
export const EmptyClockIcon = FaRegClock;
export const ToggleIcon = FaToggleOn;
export const QuestionIcon = FaQuestion;
export const QuestionCircleIcon = FaQuestionCircle;
export const InfoCircleIcon = FaInfoCircle;
export const CompressIcon = FaCompress;
export const MapIcon = FaMap;
export const PlayIcon = FaPlay;
export const VerticalDragHandleIcon = FaGripVertical;
export const RobotIcon = FaRobot;
export const ArrowLeftIcon = FaArrowLeft;
export const ArrowRightIcon = FaArrowRight;
export const ArrowCircleDownIcon = FaArrowAltCircleDown;
export const ArrowCircleRightIcon = FaArrowAltCircleRight;
export const StickArrowCircleRightIcon = FaArrowCircleRight;
export const UserIcon = FaUser;
export const ShapesIcon = FaShapes;
export const EnvelopIcon = FaEnvelope;
export const SkullIcon = FaSkull;
export const DollarIcon = FaDollarSign;
export const SearchIcon = FaSearch;
export const StarIcon = FaStar;
export const KeyIcon = FaKey;
export const ExternalLinkIcon = FaExternalLinkAlt;
export const ExternalLinkSquareIcon = FaExternalLinkSquareAlt;
export const LightBulbIcon = FaLightbulb;
export const EmptyLightBulbIcon = FaRegLightbulb;
export const ListIcon = FaList;
export const CircleIcon = FaCircle;
export const MinusCircleIcon = FaMinusCircle;
export const TrashIcon = FaTrash;
export const EmptyCircleIcon = FaRegCircle;
export const ShieldIcon = FaShieldAlt;
export const TagIcon = FaTag;
export const TagsIcon = FaTags;
export const BoltIcon = FaBolt;
export const CheckCircleIcon = FaCheckCircle;
export const ExclamationTriangleIcon = FaExclamationTriangle;
export const BugIcon = FaBug;
export const CircleNotchIcon = FaCircleNotch;
export const KeyboardIcon = FaRegKeyboard;
export const HackerIcon = FaUserSecret;
export const BufferIcon = FaBuffer; // to be reviewed, moved to LegendIcon
export const SitemapIcon = FaSitemap; // to be reviewed, moved to LegendIcon
export const ExpandIcon = FaExpand;
export const ExpandAllIcon = FaExpandArrowsAlt;
export const SortDownIcon = FaSortAlphaDown;
export const SortIcon = FaSort;
export const SortDownAltIcon = FaSortAlphaDownAlt;
export const NewFolderIcon = FaFolderPlus;
export const CaretRightIcon = FaCaretRight;
export const CaretLeftIcon = FaCaretLeft;
export const WrenchIcon = FaWrench;
export const ArrowDownIcon = FaArrowDown;
export const ArrowUpIcon = FaArrowUp;
export const TerminalIcon = FaTerminal;
export const TruckLoadingIcon = FaTruckLoading;
export const FolderOpenIcon = FaFolderOpen;
export const FolderIcon = FaFolder;
export const FileCodeIcon = FaFileCode;
export const CodeBranchIcon = FaCodeBranch;
export const ArrowCircleUpIcon = FaArrowAltCircleUp;
export const ArrowCircleLeftIcon = FaArrowAltCircleLeft;
export const EmptyStopCircleIcon = FaRegStopCircle;
export const AsteriskIcon = FaAsterisk;
export const FilterIcon = FaFilter;
export const ExclamationCircleIcon = FaExclamationCircle;
export const RocketIcon = FaRocket;
export const CheckIcon = FaCheck;
export const BanIcon = FaBan;
export const FileImportIcon = FaFileImport;
export const UsersIcon = FaUserFriends;
export const DownloadIcon = FaDownload;
export const UploadIcon = FaUpload;
export const EmptyWindowRestoreIcon = FaRegWindowRestore;
export const PauseCircleIcon = FaPauseCircle;
export const ShareIcon = FaShare;
export const CopyIcon = FaRegCopy;
export const FileAltIcon = FaFileAlt; // to be reviewed/combined
export const PencilEditIcon = FaEdit; // to be reviewed/combined
export const ArrowsAltHIcon = FaArrowsAltH; // to be reviewed/combined
export const WindowMaximizeIcon = FaRegWindowMaximize; // to be reviewed/combined
export const FilledWindowMaximizeIcon = FaWindowMaximize; // to be reviewed/combined
export const LongArrowAltDownIcon = FaLongArrowAltDown; // to be reviewed/combined
export const LongArrowAltUpIcon = FaLongArrowAltUp; // to be reviewed/combined
export const MeteorIcon = FaMeteor; // to be reviewed/combined
export const PiedPiperSquareIcon = FaPiedPiperSquare; // to be reviewed/combined
export const PuzzlePieceIcon = FaPuzzlePiece; // to be reviewed/combined
export const ToggleOnIcon = FaToggleOn;
export const ToggleOffIcon = FaToggleOff;
export const MapMarkerIcon = FaMapMarkerAlt;
export const WizardHatIcon = FaHatWizard;
export const FaceLaughWinkIcon = FaRegLaughWink;
export const FaceSadTearIcon = FaRegSadTear;
export const BusinessTimeIcon = FaBusinessTime; // to be reviewed/combined
export const DatabaseIcon = FaDatabase;
export const ServerIcon = FaServer;
export const ArchiveIcon = FaArchive;
export const BrainIcon = FaBrain;
export const DocumentationIcon = FaBookOpen;
export const LevelDownIcon = FaLevelDownAlt; // to be reviewed/combined
export const CalendarIcon = FaRegCalendarAlt;
export const CalculatorIcon = FaCalculator;
export const ReadMeIcon = FaReadme;

//======================================================= GI =======================================================
import { GiWaterDrop } from '@react-icons/all-files/gi/GiWaterDrop.js';
import { GiBeard } from '@react-icons/all-files/gi/GiBeard.js';
import { GiSunglasses } from '@react-icons/all-files/gi/GiSunglasses.js';
import { GiHouseKeys } from '@react-icons/all-files/gi/GiHouseKeys.js';

export const WaterDropIcon = GiWaterDrop;
export const BeardIcon = GiBeard;
export const SunglassesIcon = GiSunglasses;
export const HouseKeys = GiHouseKeys;

//======================================================= GO =======================================================
import { GoChevronDown } from '@react-icons/all-files/go/GoChevronDown.js';
import { GoChevronUp } from '@react-icons/all-files/go/GoChevronUp.js';
import { GoChevronLeft } from '@react-icons/all-files/go/GoChevronLeft.js';
import { GoChevronRight } from '@react-icons/all-files/go/GoChevronRight.js';
import { GoFileBinary } from '@react-icons/all-files/go/GoFileBinary.js';
import { GoGitPullRequest } from '@react-icons/all-files/go/GoGitPullRequest.js';
import { GoGitMerge } from '@react-icons/all-files/go/GoGitMerge.js';
import { GoSync } from '@react-icons/all-files/go/GoSync.js';
import { GoGitBranch } from '@react-icons/all-files/go/GoGitBranch.js';
import { GoX } from '@react-icons/all-files/go/GoX.js';
import { GoPlug } from '@react-icons/all-files/go/GoPlug.js';

export const ChevronDownIcon = GoChevronDown;
export const ChevronUpIcon = GoChevronUp;
export const ChevronLeftIcon = GoChevronLeft;
export const ChevronRightIcon = GoChevronRight;
export const BinaryTypeIcon = GoFileBinary;
export const GitPullRequestIcon = GoGitPullRequest;
export const GitMergeIcon = GoGitMerge;
export const SyncIcon = GoSync;
export const GitBranchIcon = GoGitBranch;
export const XIcon = GoX;
export const PluginIcon = GoPlug;

//======================================================= SI =======================================================
import { SiSwagger } from '@react-icons/all-files/si/SiSwagger.js';

export const SwaggerIcon = SiSwagger; // to be reviewed

//======================================================= BI =======================================================

import { BiShapeTriangle } from '@react-icons/all-files/bi/BiShapeTriangle.js';
import { BiAtom } from '@react-icons/all-files/bi/BiAtom.js';
import { BiCabinet } from '@react-icons/all-files/bi/BiCabinet.js';

export const ShapeTriangleIcon = BiShapeTriangle;
export const AtomIcon = BiAtom;
export const CabinetIcon = BiCabinet;

//======================================================= CG =======================================================
import { CgOptions } from '@react-icons/all-files/cg/CgOptions.js';

export const OptionsIcon = CgOptions;

//======================================================= FI =======================================================
import { FiPackage } from '@react-icons/all-files/fi/FiPackage.js';
import { FiMinus } from '@react-icons/all-files/fi/FiMinus.js';
import { FiMousePointer } from '@react-icons/all-files/fi/FiMousePointer.js';
import { FiMove } from '@react-icons/all-files/fi/FiMove.js';
import { FiPlusCircle } from '@react-icons/all-files/fi/FiPlusCircle.js';
import { FiSidebar } from '@react-icons/all-files/fi/FiSidebar.js';
import { FiTriangle } from '@react-icons/all-files/fi/FiTriangle.js';
import { FiZoomIn } from '@react-icons/all-files/fi/FiZoomIn.js';
import { FiZoomOut } from '@react-icons/all-files/fi/FiZoomOut.js';
import { FiGitMerge } from '@react-icons/all-files/fi/FiGitMerge.js';
import { FiLink } from '@react-icons/all-files/fi/FiLink.js';

export const PackageIcon = FiPackage;
export const MinusIcon = FiMinus;
export const MousePointerIcon = FiMousePointer;
export const MoveIcon = FiMove;
export const PlusCircleIcon = FiPlusCircle;
export const SidebarIcon = FiSidebar;
export const TriangleIcon = FiTriangle;
export const ZoomInIcon = FiZoomIn;
export const ZoomOutIcon = FiZoomOut;
export const TruncatedGitMergeIcon = FiGitMerge; // to be reviewed/combined
export const AnchorLinkIcon = FiLink;

//======================================================= RI =======================================================
import { RiShapeLine } from '@react-icons/all-files/ri/RiShapeLine.js';
import { RiTestTubeFill } from '@react-icons/all-files/ri/RiTestTubeFill.js';
import { RiRobotFill } from '@react-icons/all-files/ri/RiRobotFill.js';
import { RiGovernmentFill } from '@react-icons/all-files/ri/RiGovernmentFill.js';
import { RiMoneyDollarCircleFill } from '@react-icons/all-files/ri/RiMoneyDollarCircleFill.js';

export const ShapeLineIcon = RiShapeLine;
export const TestTubeIcon = RiTestTubeFill;
export const DroidIcon = RiRobotFill;
export const GovernanceIcon = RiGovernmentFill;
export const CostCircleIcon = RiMoneyDollarCircleFill;

//======================================================= FC =======================================================
import { FcWorkflow } from '@react-icons/all-files/fc/FcWorkflow.js';

export const WorkflowIcon = FcWorkflow;
