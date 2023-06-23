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
const FA = ReactIcons.FA;
export const HistoryIcon = FA.FaHistory;
export const CrosshairsIcon = FA.FaCrosshairs;
export const LayerGroupIcon = FA.FaLayerGroup;
export const GhostIcon = FA.FaGhost;
export const LockIcon = FA.FaLock;
export const MaskIcon = FA.FaMask;
export const FileIcon = FA.FaFile;
export const LongArrowRightIcon = FA.FaLongArrowAltRight;
export const TimesIcon = FA.FaTimes;
export const TimesCircleIcon = FA.FaTimesCircle;
export const PlusIcon = FA.FaPlus;
export const CogIcon = FA.FaCog;
export const EyeIcon = FA.FaEye;
export const CloseEyeIcon = FA.FaEyeSlash;
export const CaretUpIcon = FA.FaCaretUp;
export const CaretDownIcon = FA.FaCaretDown;
export const FireIcon = FA.FaFire;
export const SaveIcon = FA.FaSave;
export const SquareIcon = FA.FaSquare;
export const EmptySquareIcon = FA.FaRegSquare;
export const CheckSquareIcon = FA.FaCheckSquare;
export const MinusSquareIcon = FA.FaMinusSquare;
export const HashtagIcon = FA.FaHashtag;
export const HammerIcon = FA.FaHammer;
export const ClockIcon = FA.FaClock;
export const EmptyClockIcon = FA.FaRegClock;
export const ToggleIcon = FA.FaToggleOn;
export const QuestionIcon = FA.FaQuestion;
export const QuestionCircleIcon = FA.FaQuestionCircle;
export const InfoCircleIcon = FA.FaInfoCircle;
export const CompressIcon = FA.FaCompress;
export const MapIcon = FA.FaMap;
export const PlayIcon = FA.FaPlay;
export const VerticalDragHandleIcon = FA.FaGripVertical;
export const RobotIcon = FA.FaRobot;
export const ArrowLeftIcon = FA.FaArrowLeft;
export const ArrowRightIcon = FA.FaArrowRight;
export const ArrowCircleDownIcon = FA.FaArrowAltCircleDown;
export const ArrowCircleRightIcon = FA.FaArrowAltCircleRight;
export const StickArrowCircleRightIcon = FA.FaArrowCircleRight;
export const UserIcon = FA.FaUser;
export const ShapesIcon = FA.FaShapes;
export const EnvelopIcon = FA.FaEnvelope;
export const SkullIcon = FA.FaSkull;
export const DollarIcon = FA.FaDollarSign;
export const SearchIcon = FA.FaSearch;
export const StarIcon = FA.FaStar;
export const KeyIcon = FA.FaKey;
export const ExternalLinkIcon = FA.FaExternalLinkAlt;
export const ExternalLinkSquareIcon = FA.FaExternalLinkSquareAlt;
export const LightBulbIcon = FA.FaLightbulb;
export const EmptyLightBulbIcon = FA.FaRegLightbulb;
export const ListIcon = FA.FaList;
export const CircleIcon = FA.FaCircle;
export const MinusCircleIcon = FA.FaMinusCircle;
export const TrashIcon = FA.FaTrash;
export const EmptyCircleIcon = FA.FaRegCircle;
export const ShieldIcon = FA.FaShieldAlt;
export const TagIcon = FA.FaTag;
export const TagsIcon = FA.FaTags;
export const BoltIcon = FA.FaBolt;
export const CheckCircleIcon = FA.FaCheckCircle;
export const ExclamationTriangleIcon = FA.FaExclamationTriangle;
export const BugIcon = FA.FaBug;
export const CircleNotchIcon = FA.FaCircleNotch;
export const KeyboardIcon = FA.FaRegKeyboard;
export const HackerIcon = FA.FaUserSecret;
export const BufferIcon = FA.FaBuffer; // to be reviewed, moved to LegendIcon
export const SitemapIcon = FA.FaSitemap; // to be reviewed, moved to LegendIcon
export const ExpandIcon = FA.FaExpand;
export const ExpandAllIcon = FA.FaExpandArrowsAlt;
export const SortDownIcon = FA.FaSortAlphaDown;
export const SortIcon = FA.FaSort;
export const SortDownAltIcon = FA.FaSortAlphaDownAlt;
export const NewFolderIcon = FA.FaFolderPlus;
export const CaretRightIcon = FA.FaCaretRight;
export const CaretLeftIcon = FA.FaCaretLeft;
export const WrenchIcon = FA.FaWrench;
export const ArrowDownIcon = FA.FaArrowDown;
export const ArrowUpIcon = FA.FaArrowUp;
export const TerminalIcon = FA.FaTerminal;
export const TruckLoadingIcon = FA.FaTruckLoading;
export const FolderOpenIcon = FA.FaFolderOpen;
export const FolderIcon = FA.FaFolder;
export const FileCodeIcon = FA.FaFileCode;
export const CodeBranchIcon = FA.FaCodeBranch;
export const ArrowCircleUpIcon = FA.FaArrowAltCircleUp;
export const ArrowCircleLeftIcon = FA.FaArrowAltCircleLeft;
export const EmptyStopCircleIcon = FA.FaRegStopCircle;
export const AsteriskIcon = FA.FaAsterisk;
export const FilterIcon = FA.FaFilter;
export const ExclamationCircleIcon = FA.FaExclamationCircle;
export const RocketIcon = FA.FaRocket;
export const CheckIcon = FA.FaCheck;
export const BanIcon = FA.FaBan;
export const FileImportIcon = FA.FaFileImport;
export const UsersIcon = FA.FaUserFriends;
export const DownloadIcon = FA.FaDownload;
export const UploadIcon = FA.FaUpload;
export const EmptyWindowRestoreIcon = FA.FaRegWindowRestore;
export const PauseCircleIcon = FA.FaPauseCircle;
export const ShareIcon = FA.FaShare;
export const CopyIcon = FA.FaRegCopy;
export const FileAltIcon = FA.FaFileAlt; // to be reviewed/combined
export const PencilEditIcon = FA.FaEdit; // to be reviewed/combined
export const ArrowsAltHIcon = FA.FaArrowsAltH; // to be reviewed/combined
export const WindowMaximizeIcon = FA.FaRegWindowMaximize; // to be reviewed/combined
export const FilledWindowMaximizeIcon = FA.FaWindowMaximize; // to be reviewed/combined
export const LongArrowAltDownIcon = FA.FaLongArrowAltDown; // to be reviewed/combined
export const LongArrowAltUpIcon = FA.FaLongArrowAltUp; // to be reviewed/combined
export const MeteorIcon = FA.FaMeteor; // to be reviewed/combined
export const PiedPiperSquareIcon = FA.FaPiedPiperSquare; // to be reviewed/combined
export const PuzzlePieceIcon = FA.FaPuzzlePiece; // to be reviewed/combined
export const ToggleOnIcon = FA.FaToggleOn;
export const ToggleOffIcon = FA.FaToggleOff;
export const MapMarkerIcon = FA.FaMapMarkerAlt;
export const WizardHatIcon = FA.FaHatWizard;
export const FaceLaughWinkIcon = FA.FaRegLaughWink;
export const FaceSadTearIcon = FA.FaRegSadTear;
export const BusinessTimeIcon = FA.FaBusinessTime; // to be reviewed/combined
export const DatabaseIcon = FA.FaDatabase;
export const ServerIcon = FA.FaServer;
export const ArchiveIcon = FA.FaArchive;
export const BrainIcon = FA.FaBrain;
export const DocumentationIcon = FA.FaBookOpen;
export const LevelDownIcon = FA.FaLevelDownAlt; // to be reviewed/combined
export const CalendarIcon = FA.FaRegCalendarAlt;

const GI = ReactIcons.GI;
export const WaterDropIcon = GI.GiWaterDrop;
export const BeardIcon = GI.GiBeard;
export const SunglassesIcon = GI.GiSunglasses;
export const HouseKeys = GI.GiHouseKeys;

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

const GO = ReactIcons.GO;
export const ChevronDownIcon = GO.GoChevronDown;
export const ChevronUpIcon = GO.GoChevronUp;
export const ChevronLeftIcon = GO.GoChevronLeft;
export const ChevronRightIcon = GO.GoChevronRight;
export const BinaryTypeIcon = GO.GoFileBinary;
export const GitPullRequestIcon = GO.GoGitPullRequest;
export const GitMergeIcon = GO.GoGitMerge;
export const SyncIcon = GO.GoSync;
export const GitBranchIcon = GO.GoGitBranch;
export const XIcon = GO.GoX;
export const PluginIcon = GO.GoPlug;

const SI = ReactIcons.SI;
export const SwaggerIcon = SI.SiSwagger; // to be reviewed

const IO = ReactIcons.IO5;
export const ResizeIcon = IO.IoResize;
export const FileTrayIcon = IO.IoFileTrayFullOutline;
export const MenuIcon = IO.IoMenuOutline;
export const BeakerIcon = IO.IoBeaker;
export const FlaskIcon = IO.IoFlaskSharp;
export const AvailabilityIcon = IO.IoSyncCircleSharp;
export const StatisticsIcon = IO.IoStatsChart;
export const SupportIcon = IO.IoHelpBuoy;
export const CloudDownloadIcon = IO.IoCloudDownloadOutline;
export const CloudUploadIcon = IO.IoCloudUploadOutline;

const BS = ReactIcons.BS;
export const DisplayIcon = BS.BsDisplayFill;
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
export const GenericTextFileIcon = BS.BsTextLeft;

const BI = ReactIcons.BI;
export const ShapeTriangleIcon = BI.BiShapeTriangle;
export const AtomIcon = BI.BiAtom;

const CG = ReactIcons.CG;
export const OptionsIcon = CG.CgOptions;

const FI = ReactIcons.FI;
export const PackageIcon = FI.FiPackage;
export const MinusIcon = FI.FiMinus;
export const MousePointerIcon = FI.FiMousePointer;
export const MoveIcon = FI.FiMove;
export const PlusCircleIcon = FI.FiPlusCircle;
export const SidebarIcon = FI.FiSidebar;
export const TriangleIcon = FI.FiTriangle;
export const ZoomInIcon = FI.FiZoomIn;
export const ZoomOutIcon = FI.FiZoomOut;
export const TruncatedGitMergeIcon = FI.FiGitMerge; // to be reviewed/combined
export const AnchorLinkIcon = FI.FiLink;

const RI = ReactIcons.RI;
export const ShapeLineIcon = RI.RiShapeLine;
export const TestTubeIcon = RI.RiTestTubeFill;
export const DroidIcon = RI.RiRobotFill;
export const GovernanceIcon = RI.RiGovernmentFill;
export const CostCircleIcon = RI.RiMoneyDollarCircleFill;

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

const HI = ReactIcons.HI;
export const CodeIcon = HI.HiCode;
export const HomeIcon = HI.HiHome;
