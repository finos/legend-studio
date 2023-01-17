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
export {
  FaTrash as TrashIcon,
  FaHistory as HistoryIcon,
  FaCrosshairs as CrosshairsIcon,
  FaLayerGroup as LayerGroupIcon,
  FaGhost as GhostIcon,
  FaLock as LockIcon,
  FaMask as MaskIcon,
  FaFile as FileIcon,
  FaLongArrowAltRight as LongArrowRightIcon,
  FaTimes as TimesIcon,
  FaTimesCircle as TimesCircleIcon,
  FaPlus as PlusIcon,
  FaCog as CogIcon,
  FaEye as EyeIcon,
  FaCaretDown as CaretDownIcon,
  FaFire as FireIcon,
  FaSave as SaveIcon,
  FaSquare as SquareIcon,
  FaRegSquare as EmptySquareIcon,
  FaCheckSquare as CheckSquareIcon,
  FaHashtag as HashtagIcon,
  FaHammer as HammerIcon,
  FaClock as ClockIcon,
  FaRegClock as EmptyClockIcon,
  FaToggleOn as ToggleIcon,
  FaQuestion as QuestionIcon,
  FaQuestionCircle as QuestionCircleIcon,
  FaInfoCircle as InfoCircleIcon,
  FaCompress as CompressIcon,
  FaMap as MapIcon,
  FaPlay as PlayIcon,
  FaGripVertical as VerticalDragHandleIcon,
  FaRobot as RobotIcon,
  FaArrowLeft as ArrowLeftIcon,
  FaArrowRight as ArrowRightIcon,
  FaArrowAltCircleDown as ArrowCircleDownIcon,
  FaArrowAltCircleRight as ArrowCircleRightIcon,
  FaArrowCircleRight as StickArrowCircleRightIcon,
  FaUser as UserIcon,
  FaShapes as ShapesIcon,
  FaEnvelope as EnvelopIcon,
  FaSkull as SkullIcon,
  FaDollarSign as DollarIcon,
  FaSearch as SearchIcon,
  FaStar as StarIcon,
  FaKey as KeyIcon,
  FaExternalLinkAlt as ExternalLinkIcon,
  FaExternalLinkSquareAlt as ExternalLinkSquareIcon,
  FaLightbulb as LightBulbIcon,
  FaRegLightbulb as EmptyLightBulbIcon,
  FaList as ListIcon,
  FaCircle as CircleIcon,
  FaRegCircle as EmptyCircleIcon,
  FaShieldAlt as ShieldIcon,
  FaTag as TagIcon,
  FaTags as TagsIcon,
  FaBolt as BoltIcon,
  FaCheckCircle as CheckCircleIcon,
  FaExclamationTriangle as ExclamationTriangleIcon,
  FaBug as BugIcon,
  FaCircleNotch as CircleNotchIcon,
  FaRegKeyboard as KeyboardIcon,
  FaUserSecret as HackerIcon,
  FaBuffer as BufferIcon, // to be reviewed, moved to LegendIcon
  FaSitemap as SitemapIcon, // to be reviewed, moved to LegendIcon
  FaExpand as ExpandIcon,
  FaExpandArrowsAlt as ExpandAllIcon,
  FaBrush as BrushIcon,
  FaSortAlphaDown as SortDownIcon,
  FaSort as SortIcon,
  FaSortAlphaDownAlt as SortDownAltIcon,
  FaFolderPlus as NewFolderIcon,
  FaCaretRight as CaretRightIcon,
  FaWrench as WrenchIcon,
  FaArrowDown as ArrowDownIcon,
  FaArrowUp as ArrowUpIcon,
  FaTerminal as TerminalIcon,
  FaTruckLoading as TruckLoadingIcon,
  FaFolderOpen as FolderOpenIcon,
  FaFolder as FolderIcon,
  FaFileCode as FileCodeIcon,
  FaCodeBranch as CodeBranchIcon,
  FaArrowAltCircleUp as ArrowCirceUpIcon,
  FaArrowAltCircleLeft as ArrowCircleLeftIcon,
  FaRegStopCircle as EmptyStopCircleIcon,
  FaAsterisk as AsteriskIcon,
  FaFilter as FilterIcon,
  FaExclamationCircle as ExclamationCircleIcon,
  FaRocket as RocketIcon,
  FaCheck as CheckIcon,
  FaBan as BanIcon,
  FaFileImport as FileImportIcon,
  FaUserFriends as UsersIcon,
  FaDownload as DownloadIcon,
  FaUpload as UploadIcon,
  FaRegWindowRestore as EmptyWindowRestoreIcon,
  FaPauseCircle as PauseCircleIcon,
  FaShare as ShareIcon,
  FaRegCopy as CopyIcon,
  FaFileAlt as FileAltIcon, // to be reviewed/combined
  FaEdit as PencilEditIcon, // to be reviewed/combined
  FaArrowsAltH as ArrowsAltHIcon, // to be reviewed/combined
  FaRegWindowMaximize as WindowMaximizeIcon, // to be reviewed/combined
  FaWindowMaximize as FilledWindowMaximizeIcon, // to be reviewed/combined
  FaLongArrowAltDown as LongArrowAltDownIcon, // to be reviewed/combined
  FaLongArrowAltUp as LongArrowAltUpIcon, // to be reviewed/combined
  FaMeteor as MeteorIcon, // to be reviewed/combined
  FaPiedPiperSquare as PiedPiperSquareIcon, // to be reviewed/combined
  FaPuzzlePiece as PuzzlePieceIcon, // to be reviewed/combined
  FaToggleOn as ToggleOnIcon,
  FaToggleOff as ToggleOffIcon,
  FaMapMarkerAlt as MapMarkerIcon,
  FaHatWizard as WizardHatIcon,
  FaRegLaughWink as FaceLaughWinkIcon,
  FaRegSadTear as FaceSadTearIcon,
  FaBusinessTime as BusinessTimeIcon, // to be reviewed/combined
  FaDatabase as DatabaseIcon,
  FaServer as ServerIcon,
  FaTable as TableIcon,
  FaArchive as ArchiveIcon,
  FaBrain as BrainIcon,
} from 'react-icons/fa';
export {
  GiWaterDrop as WaterDropIcon,
  GiBeard as BeardIcon,
  GiSunglasses as SunglassesIcon,
  GiHouseKeys as HouseKeys,
} from 'react-icons/gi';
export {
  MdManageSearch as ManageSearchIcon, // to be reviewed
  MdModeEdit as PencilIcon,
  MdTextFields as StringTypeIcon,
  MdMoreVert as MoreVerticalIcon,
  MdMoreHoriz as MoreHorizontalIcon,
  MdWrapText as WrapTextIcon,
  MdVerticalAlignBottom as VerticalAlignBottomIcon,
  MdRefresh as RefreshIcon,
  MdFunctions as SigmaIcon,
  MdCompareArrows as CompareIcon,
  MdPlaylistAddCheck as CheckListIcon,
  MdAdd as AddIcon, // to be reviewed
  MdEdit as EditIcon, // to be reviewed
  MdSubject as SubjectIcon,
  MdViewHeadline as ViewHeadlineIcon,
  MdAssistant as AssistantIcon,
  MdSettingsEthernet as SettingsEthernetIcon,
  MdLink as LinkIcon,
  MdWindow as WindowIcon,
  MdReviews as ReviewIcon,
} from 'react-icons/md';
export {
  VscError as ErrorIcon,
  VscWarning as WarningIcon,
  VscWordWrap as WordWrapIcon,
  VscGoToFile as GoToFileIcon,
  VscClose as CloseIcon,
  VscRunAll as RunAllIcon,
  VscRunErrors as RunErrorsIcon,
  VscOpenPreview as OpenPreviewIcon,
  VscDiff as DiffIcon,
  VscRegex as RegexIcon,
  VscVersions as VersionsIcon,
  VscCaseSensitive as CaseSensitiveIcon,
} from 'react-icons/vsc';
export {
  GoChevronDown as ChevronDownIcon,
  GoChevronUp as ChevronUpIcon,
  GoChevronRight as ChevronRightIcon,
  GoFileBinary as BinaryTypeIcon,
  GoGitPullRequest as GitPullRequestIcon,
  GoGitMerge as GitMergeIcon,
  GoCloudDownload as CloudDownloadIcon,
  GoCloudUpload as CloudUploadIcon,
  GoSync as SyncIcon,
  GoGitBranch as GitBranchIcon,
  GoX as XIcon,
  GoPlug as PluginIcon,
} from 'react-icons/go';
export { SiSwagger as SwaggerIcon } from 'react-icons/si';
export {
  IoResize as ResizeIcon,
  IoFileTrayFullOutline as FileTrayIcon,
  IoMenuOutline as MenuIcon,
  IoBeaker as BeakerIcon,
  IoFlaskSharp as FlaskIcon,
} from 'react-icons/io5';
export {
  BsChevronDown as ChevronDownThinIcon,
  BsFillTriangleFill as FilledTriangleIcon,
  BsFillFileEarmarkSpreadsheetFill as TabulatedDataFileIcon,
  BsBoxSeam as BundleIcon,
  BsGripVertical as VerticalDragHandleThinIcon,
  BsAlignTop as AlignTopIcon,
  BsAlignMiddle as AlignMiddleIcon,
  BsAlignBottom as AlignBottomIcon,
  BsAlignStart as AlignStartIcon,
  BsAlignCenter as AlignCenterIcon,
  BsAlignEnd as AlignEndIcon,
  BsDistributeHorizontal as DistributeHorizontalIcon,
  BsDistributeVertical as DistributeVerticalIcon,
} from 'react-icons/bs';
export {
  BiShapeTriangle as ShapeTriangleIcon,
  BiAtom as AtomIcon,
} from 'react-icons/bi';
export { CgOptions as OptionsIcon } from 'react-icons/cg';
export {
  FiPackage as PackageIcon,
  FiMinus as MinusIcon,
  FiMousePointer as MousePointerIcon,
  FiMove as MoveIcon,
  FiPlusCircle as PlusCircleIcon,
  FiSidebar as SidebarIcon,
  FiTriangle as TriangleIcon,
  FiZoomIn as ZoomInIcon,
  FiZoomOut as ZoomOutIcon,
  FiGitMerge as TruncatedGitMergeIcon, // to be reviewed/combined
} from 'react-icons/fi';
export {
  RiShapeLine as ShapeLineIcon,
  RiTestTubeFill as TestTubeIcon,
  RiRobotFill as DroidIcon,
} from 'react-icons/ri';
export {
  TbArrowsJoin2 as ArrowsJoinIcon,
  TbArrowsSplit2 as ArrowsSplitIcon,
  TbMathFunction as FunctionIcon,
  TbBook as RepoIcon,
} from 'react-icons/tb';
