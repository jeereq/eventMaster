/**
 * Icônes du site : point d'entrée unique, dessins Phosphor (licence MIT).
 * Les noms exportés restent ceux de Lucide pour ne pas toucher aux pages ; seul ce fichier choisit le dessin.
 * - Duotone : icônes qui illustrent (salle, billet, enveloppe…), avec un aplat léger.
 * - Bold : contrôles d'interface (flèches, croix, coche, plus).
 * - Classe `fill-…` pleine (`fill-current`, `fill-white`…) : style Fill, couleur du texte.
 *   Classe `fill-…/30` translucide : retirée, l'aplat du Duotone joue déjà ce rôle.
 * Les icônes dessinées pour EventMaster (custom.tsx) remplacent Phosphor quand leur nom y figure.
 * Ne pas importer 'lucide-react' ni '@phosphor-icons/react' directement dans le code.
 */
import type { ComponentType, SVGProps } from 'react';
import { CUSTOM_ICONS } from './custom';
import type { Icon as PhosphorIcon, IconWeight } from '@phosphor-icons/react';
import {
  AlignBottom as PhAlignBottom,
  AlignCenterHorizontal as PhAlignCenterHorizontal,
  AlignCenterVertical as PhAlignCenterVertical,
  AlignTop as PhAlignTop,
  CalendarX as PhCalendarX,
  DotsThree as PhDotsThree,
  Code as PhCode,
  ArrowElbowDownLeft as PhArrowElbowDownLeft,
  Disc as PhDisc,
  GraduationCap as PhGraduationCap,
  ListDashes as PhListDashes,
  Martini as PhMartini,
  Microphone as PhMicrophone,
  SprayBottle as PhSprayBottle,
  Selection as PhSelection,
  BoundingBox as PhBoundingBox,
  Aperture as PhAperture,
  Armchair as PhArmchair,
  ArrowArcLeft as PhArrowArcLeft,
  ArrowArcRight as PhArrowArcRight,
  ArrowClockwise as PhArrowClockwise,
  ArrowCounterClockwise as PhArrowCounterClockwise,
  ArrowDown as PhArrowDown,
  ArrowLeft as PhArrowLeft,
  ArrowRight as PhArrowRight,
  ArrowSquareOut as PhArrowSquareOut,
  ArrowUp as PhArrowUp,
  ArrowUpRight as PhArrowUpRight,
  ArrowsClockwise as PhArrowsClockwise,
  ArrowsHorizontal as PhArrowsHorizontal,
  ArrowsIn as PhArrowsIn,
  ArrowsOut as PhArrowsOut,
  ArrowsOutCardinal as PhArrowsOutCardinal,
  Baby as PhBaby,
  Barricade as PhBarricade,
  BeerStein as PhBeerStein,
  Bell as PhBell,
  BellRinging as PhBellRinging,
  BookOpen as PhBookOpen,
  BookmarkSimple as PhBookmarkSimple,
  Briefcase as PhBriefcase,
  Buildings as PhBuildings,
  Bus as PhBus,
  Calculator as PhCalculator,
  CalendarBlank as PhCalendarBlank,
  CalendarCheck as PhCalendarCheck,
  CalendarDots as PhCalendarDots,
  CalendarHeart as PhCalendarHeart,
  CalendarPlus as PhCalendarPlus,
  Camera as PhCamera,
  CameraSlash as PhCameraSlash,
  Car as PhCar,
  CaretDown as PhCaretDown,
  CaretLeft as PhCaretLeft,
  CaretRight as PhCaretRight,
  CaretUp as PhCaretUp,
  ChartBar as PhChartBar,
  ChartPie as PhChartPie,
  ChartLineUp as PhChartLineUp,
  ChatCircle as PhChatCircle,
  ChatText as PhChatText,
  Check as PhCheck,
  CheckCircle as PhCheckCircle,
  CheckSquare as PhCheckSquare,
  Circle as PhCircle,
  CircleNotch as PhCircleNotch,
  ClipboardText as PhClipboardText,
  Clock as PhClock,
  ClockCounterClockwise as PhClockCounterClockwise,
  Cloud as PhCloud,
  CloudArrowUp as PhCloudArrowUp,
  CloudSun as PhCloudSun,
  Coins as PhCoins,
  Columns as PhColumns,
  Compass as PhCompass,
  Confetti as PhConfetti,
  Copy as PhCopy,
  CreditCard as PhCreditCard,
  Crop as PhCrop,
  Crosshair as PhCrosshair,
  Crown as PhCrown,
  CubeFocus as PhCubeFocus,
  CurrencyDollar as PhCurrencyDollar,
  CursorClick as PhCursorClick,
  DeviceMobile as PhDeviceMobile,
  DiceFive as PhDiceFive,
  Door as PhDoor,
  DoorOpen as PhDoorOpen,
  DownloadSimple as PhDownloadSimple,
  Drop as PhDrop,
  EnvelopeSimple as PhEnvelopeSimple,
  Export as PhExport,
  Eye as PhEye,
  EyeSlash as PhEyeSlash,
  Feather as PhFeather,
  FileText as PhFileText,
  FileXls as PhFileXls,
  FilmSlate as PhFilmSlate,
  FilmStrip as PhFilmStrip,
  Flag as PhFlag,
  FlipHorizontal as PhFlipHorizontal,
  FlipVertical as PhFlipVertical,
  FloppyDisk as PhFloppyDisk,
  Flower as PhFlower,
  ArrowLineUp as PhArrowLineUp,
  ArrowLineDown as PhArrowLineDown,
  StackPlus as PhStackPlus,
  StackMinus as PhStackMinus,
  FolderSimpleStar as PhFolderSimpleStar,
  ForkKnife as PhForkKnife,
  Funnel as PhFunnel,
  GearSix as PhGearSix,
  Gift as PhGift,
  Globe as PhGlobe,
  GlobeHemisphereWest as PhGlobeHemisphereWest,
  GpsFix as PhGpsFix,
  GridFour as PhGridFour,
  Handshake as PhHandshake,
  Heart as PhHeart,
  House as PhHouse,
  Image as PhImage,
  ImageBroken as PhImageBroken,
  ImageSquare as PhImageSquare,
  Images as PhImages,
  Info as PhInfo,
  Key as PhKey,
  Keyboard as PhKeyboard,
  Layout as PhLayout,
  Lightbulb as PhLightbulb,
  Lightning as PhLightning,
  Link as PhLink,
  LinkBreak as PhLinkBreak,
  List as PhList,
  ListChecks as PhListChecks,
  ListNumbers as PhListNumbers,
  Lock as PhLock,
  LockOpen as PhLockOpen,
  MagicWand as PhMagicWand,
  MagnifyingGlass as PhMagnifyingGlass,
  MagnifyingGlassMinus as PhMagnifyingGlassMinus,
  MagnifyingGlassPlus as PhMagnifyingGlassPlus,
  MapPin as PhMapPin,
  MapTrifold as PhMapTrifold,
  MaskHappy as PhMaskHappy,
  Medal as PhMedal,
  Minus as PhMinus,
  Monitor as PhMonitor,
  Moon as PhMoon,
  MusicNote as PhMusicNote,
  MusicNotes as PhMusicNotes,
  NavigationArrow as PhNavigationArrow,
  Package as PhPackage,
  PaintBrush as PhPaintBrush,
  Palette as PhPalette,
  PaperPlaneTilt as PhPaperPlaneTilt,
  Path as PhPath,
  Pause as PhPause,
  PenNib as PhPenNib,
  PencilLine as PhPencilLine,
  PencilSimple as PhPencilSimple,
  PencilSimpleLine as PhPencilSimpleLine,
  Percent as PhPercent,
  PersonArmsSpread as PhPersonArmsSpread,
  Phone as PhPhone,
  Play as PhPlay,
  Plus as PhPlus,
  PlusCircle as PhPlusCircle,
  Presentation as PhPresentation,
  Printer as PhPrinter,
  Prohibit as PhProhibit,
  Pulse as PhPulse,
  PushPin as PhPushPin,
  QrCode as PhQrCode,
  Question as PhQuestion,
  Quotes as PhQuotes,
  Repeat as PhRepeat,
  Rows as PhRows,
  Rss as PhRss,
  Ruler as PhRuler,
  Scales as PhScales,
  Scan as PhScan,
  Scissors as PhScissors,
  Scroll as PhScroll,
  SelectionAll as PhSelectionAll,
  SelectionPlus as PhSelectionPlus,
  SelectionSlash as PhSelectionSlash,
  Shapes as PhShapes,
  ShareNetwork as PhShareNetwork,
  Shield as PhShield,
  ShieldCheck as PhShieldCheck,
  ShieldWarning as PhShieldWarning,
  SidebarSimple as PhSidebarSimple,
  SignIn as PhSignIn,
  SignOut as PhSignOut,
  SkipForward as PhSkipForward,
  Sliders as PhSliders,
  SlidersHorizontal as PhSlidersHorizontal,
  Sparkle as PhSparkle,
  SpeakerHifi as PhSpeakerHifi,
  SpeakerHigh as PhSpeakerHigh,
  SpeakerX as PhSpeakerX,
  Square as PhSquare,
  SquareSplitHorizontal as PhSquareSplitHorizontal,
  SquaresFour as PhSquaresFour,
  Stack as PhStack,
  Star as PhStar,
  Storefront as PhStorefront,
  Sun as PhSun,
  TShirt as PhTShirt,
  Table as PhTable,
  Tag as PhTag,
  Tent as PhTent,
  TextAlignCenter as PhTextAlignCenter,
  TextAlignLeft as PhTextAlignLeft,
  TextAlignRight as PhTextAlignRight,
  TextB as PhTextB,
  TextItalic as PhTextItalic,
  TextStrikethrough as PhTextStrikethrough,
  TextT as PhTextT,
  ThumbsUp as PhThumbsUp,
  Ticket as PhTicket,
  Translate as PhTranslate,
  Trash as PhTrash,
  Tray as PhTray,
  Tree as PhTree,
  TreeStructure as PhTreeStructure,
  TrendUp as PhTrendUp,
  Triangle as PhTriangle,
  Truck as PhTruck,
  UploadSimple as PhUploadSimple,
  User as PhUser,
  UserCheck as PhUserCheck,
  UserCircle as PhUserCircle,
  UserCircleGear as PhUserCircleGear,
  UserGear as PhUserGear,
  UserPlus as PhUserPlus,
  UsersThree as PhUsersThree,
  VideoCamera as PhVideoCamera,
  Wall as PhWall,
  Wallet as PhWallet,
  Warning as PhWarning,
  WarningCircle as PhWarningCircle,
  Wine as PhWine,
  X as PhX,
  XCircle as PhXCircle,
} from '@phosphor-icons/react/dist/ssr';

export type EmIconProps = Omit<SVGProps<SVGSVGElement>, 'ref'> & {
  size?: number | string;
  weight?: IconWeight;
  /** Accepté pour compatibilité avec l'ancien code Lucide ; Phosphor règle l'épaisseur par son style. */
  strokeWidth?: number | string;
  absoluteStrokeWidth?: boolean;
};

/** Type d'une icône du site (ancien nom conservé pour les pages existantes). */
export type LucideIcon = ComponentType<EmIconProps>;
export type LucideProps = EmIconProps;

const FILL_CLASS = /^fill-(?!none$)/;

/** Sépare les classes de remplissage : une classe pleine demande le style Fill, une translucide est retirée. */
function splitFill(className: string | undefined): { className: string | undefined; solid: boolean } {
  if (!className) return { className, solid: false };
  const classes = className.split(/\s+/).filter(Boolean);
  const fills = classes.filter((c) => FILL_CLASS.test(c));
  if (fills.length === 0) return { className, solid: false };
  return {
    className: classes.filter((c) => !FILL_CLASS.test(c)).join(' '),
    solid: fills.some((c) => !c.includes('/')),
  };
}

function make(Base: PhosphorIcon, defaultWeight: IconWeight, name: string): LucideIcon {
  const custom = CUSTOM_ICONS[name];
  if (custom) {
    function EmCustomIcon({ size = 24, weight: _weight, strokeWidth: _strokeWidth, absoluteStrokeWidth: _absolute, className, ...props }: EmIconProps) {
      void _weight;
      void _strokeWidth;
      void _absolute;
      const fill = splitFill(className);
      return custom({ size, solid: fill.solid, className: fill.className, ...props });
    }
    EmCustomIcon.displayName = name;
    return EmCustomIcon;
  }
  function EmIcon({ size = 24, weight, strokeWidth: _strokeWidth, absoluteStrokeWidth: _absolute, className, ...props }: EmIconProps) {
    void _strokeWidth;
    void _absolute;
    const fill = splitFill(className);
    return <Base size={size} weight={weight ?? (fill.solid ? 'fill' : defaultWeight)} className={fill.className} {...props} />;
  }
  EmIcon.displayName = name;
  return EmIcon;
}

export const CalendarOff = make(PhCalendarX, 'duotone', 'CalendarOff');
export const Code2 = make(PhCode, 'bold', 'Code2');
export const CornerDownLeft = make(PhArrowElbowDownLeft, 'bold', 'CornerDownLeft');
export const Disc3 = make(PhDisc, 'duotone', 'Disc3');
export const GraduationCap = make(PhGraduationCap, 'duotone', 'GraduationCap');
export const LayoutList = make(PhListDashes, 'bold', 'LayoutList');
export const Martini = make(PhMartini, 'duotone', 'Martini');
export const Mic2 = make(PhMicrophone, 'duotone', 'Mic2');
export const PanelLeftOpen = make(PhSidebarSimple, 'duotone', 'PanelLeftOpen');
export const SprayCan = make(PhSprayBottle, 'duotone', 'SprayCan');
export const UtensilsCrossed = make(PhForkKnife, 'duotone', 'UtensilsCrossed');
export const SquareDashed = make(PhSelection, 'bold', 'SquareDashed');
export const Fence = make(PhBoundingBox, 'duotone', 'Fence');
export const AlertCircle = make(PhWarningCircle, 'duotone', 'AlertCircle');
export const AlignCenter = make(PhTextAlignCenter, 'bold', 'AlignCenter');
export const AlignLeft = make(PhTextAlignLeft, 'bold', 'AlignLeft');
export const AlignRight = make(PhTextAlignRight, 'bold', 'AlignRight');
export const ArrowDown = make(PhArrowDown, 'bold', 'ArrowDown');
export const ArrowLeft = make(PhArrowLeft, 'bold', 'ArrowLeft');
export const ArrowRight = make(PhArrowRight, 'bold', 'ArrowRight');
export const ArrowUpRight = make(PhArrowUpRight, 'bold', 'ArrowUpRight');
export const Ban = make(PhProhibit, 'duotone', 'Ban');
export const Box = make(PhPackage, 'duotone', 'Box');
export const Building = make(PhBuildings, 'duotone', 'Building');
export const Building2 = make(PhBuildings, 'duotone', 'Building2');
export const Calculator = make(PhCalculator, 'duotone', 'Calculator');
export const Calendar = make(PhCalendarBlank, 'duotone', 'Calendar');
export const CalendarCheck = make(PhCalendarCheck, 'duotone', 'CalendarCheck');
export const CalendarDays = make(PhCalendarDots, 'duotone', 'CalendarDays');
export const CalendarHeart = make(PhCalendarHeart, 'duotone', 'CalendarHeart');
export const Camera = make(PhCamera, 'duotone', 'Camera');
export const Check = make(PhCheck, 'bold', 'Check');
export const CheckCircle = make(PhCheckCircle, 'duotone', 'CheckCircle');
export const CheckCircle2 = make(PhCheckCircle, 'duotone', 'CheckCircle2');
export const ChevronDown = make(PhCaretDown, 'bold', 'ChevronDown');
export const MoreHorizontal = make(PhDotsThree, 'bold', 'MoreHorizontal');
export const ChevronLeft = make(PhCaretLeft, 'bold', 'ChevronLeft');
export const ChevronRight = make(PhCaretRight, 'bold', 'ChevronRight');
export const ChevronUp = make(PhCaretUp, 'bold', 'ChevronUp');
export const Clock = make(PhClock, 'duotone', 'Clock');
export const Coins = make(PhCoins, 'duotone', 'Coins');
export const Compass = make(PhCompass, 'duotone', 'Compass');
export const Copy = make(PhCopy, 'duotone', 'Copy');
export const CreditCard = make(PhCreditCard, 'duotone', 'CreditCard');
export const Crop = make(PhCrop, 'bold', 'Crop');
export const DollarSign = make(PhCurrencyDollar, 'bold', 'DollarSign');
export const DoorClosed = make(PhDoor, 'duotone', 'DoorClosed');
export const Download = make(PhDownloadSimple, 'bold', 'Download');
export const Eye = make(PhEye, 'duotone', 'Eye');
export const EyeOff = make(PhEyeSlash, 'duotone', 'EyeOff');
export const FileText = make(PhFileText, 'duotone', 'FileText');
export const Heart = make(PhHeart, 'duotone', 'Heart');
export const HeartHandshake = make(PhHandshake, 'duotone', 'HeartHandshake');
export const HelpCircle = make(PhQuestion, 'duotone', 'HelpCircle');
export const Home = make(PhHouse, 'duotone', 'Home');
export const Image = make(PhImage, 'duotone', 'Image');
export const ImageIcon = make(PhImage, 'duotone', 'ImageIcon');
export const ImagePlus = make(PhImageSquare, 'duotone', 'ImagePlus');
export const Images = make(PhImages, 'duotone', 'Images');
export const Inbox = make(PhTray, 'duotone', 'Inbox');
export const Info = make(PhInfo, 'duotone', 'Info');
export const KeyRound = make(PhKey, 'duotone', 'KeyRound');
export const Layers = make(PhStack, 'duotone', 'Layers');
export const LayoutDashboard = make(PhSquaresFour, 'duotone', 'LayoutDashboard');
export const LayoutGrid = make(PhSquaresFour, 'duotone', 'LayoutGrid');
export const Link2Off = make(PhLinkBreak, 'bold', 'Link2Off');
export const List = make(PhList, 'bold', 'List');
export const Loader2 = make(PhCircleNotch, 'bold', 'Loader2');
export const Locate = make(PhCrosshair, 'bold', 'Locate');
export const Lock = make(PhLock, 'duotone', 'Lock');
export const LogOut = make(PhSignOut, 'duotone', 'LogOut');
export const Mail = make(PhEnvelopeSimple, 'duotone', 'Mail');
export const Map = make(PhMapTrifold, 'duotone', 'Map');
export const MapPin = make(PhMapPin, 'duotone', 'MapPin');
export const Maximize2 = make(PhArrowsOut, 'bold', 'Maximize2');
export const Menu = make(PhList, 'bold', 'Menu');
export const MessageCircle = make(PhChatCircle, 'duotone', 'MessageCircle');
export const MessageSquare = make(PhChatText, 'duotone', 'MessageSquare');
export const MessageSquareQuote = make(PhQuotes, 'duotone', 'MessageSquareQuote');
export const Minimize2 = make(PhArrowsIn, 'bold', 'Minimize2');
export const Minus = make(PhMinus, 'bold', 'Minus');
export const Moon = make(PhMoon, 'duotone', 'Moon');
export const Music = make(PhMusicNotes, 'duotone', 'Music');
export const Navigation = make(PhNavigationArrow, 'duotone', 'Navigation');
export const Paintbrush = make(PhPaintBrush, 'duotone', 'Paintbrush');
export const Palette = make(PhPalette, 'duotone', 'Palette');
export const PartyPopper = make(PhConfetti, 'duotone', 'PartyPopper');
export const Pause = make(PhPause, 'duotone', 'Pause');
export const Pencil = make(PhPencilSimple, 'duotone', 'Pencil');
export const Phone = make(PhPhone, 'duotone', 'Phone');
export const Play = make(PhPlay, 'duotone', 'Play');
export const Plus = make(PhPlus, 'bold', 'Plus');
export const PlusCircle = make(PhPlusCircle, 'duotone', 'PlusCircle');
export const Printer = make(PhPrinter, 'duotone', 'Printer');
export const QrCode = make(PhQrCode, 'duotone', 'QrCode');
export const Redo2 = make(PhArrowArcRight, 'bold', 'Redo2');
export const RefreshCw = make(PhArrowsClockwise, 'bold', 'RefreshCw');
export const Repeat = make(PhRepeat, 'bold', 'Repeat');
export const Rss = make(PhRss, 'duotone', 'Rss');
export const Scale = make(PhScales, 'duotone', 'Scale');
export const ScanLine = make(PhScan, 'duotone', 'ScanLine');
export const Search = make(PhMagnifyingGlass, 'bold', 'Search');
export const Send = make(PhPaperPlaneTilt, 'duotone', 'Send');
export const Share2 = make(PhShareNetwork, 'duotone', 'Share2');
export const Shield = make(PhShield, 'duotone', 'Shield');
export const ShieldCheck = make(PhShieldCheck, 'duotone', 'ShieldCheck');
export const SlidersHorizontal = make(PhSlidersHorizontal, 'bold', 'SlidersHorizontal');
export const Smartphone = make(PhDeviceMobile, 'duotone', 'Smartphone');
export const Sparkles = make(PhSparkle, 'duotone', 'Sparkles');
export const Speaker = make(PhSpeakerHifi, 'duotone', 'Speaker');
export const Star = make(PhStar, 'duotone', 'Star');
export const Store = make(PhStorefront, 'duotone', 'Store');
export const Sun = make(PhSun, 'duotone', 'Sun');
export const Table = make(PhTable, 'duotone', 'Table');
export const Tag = make(PhTag, 'duotone', 'Tag');
export const ThumbsUp = make(PhThumbsUp, 'duotone', 'ThumbsUp');
export const Ticket = make(PhTicket, 'duotone', 'Ticket');
export const Trash2 = make(PhTrash, 'duotone', 'Trash2');
export const Type = make(PhTextT, 'bold', 'Type');
export const Undo2 = make(PhArrowArcLeft, 'bold', 'Undo2');
export const Upload = make(PhUploadSimple, 'bold', 'Upload');
export const User = make(PhUser, 'duotone', 'User');
export const UserCog = make(PhUserGear, 'duotone', 'UserCog');
export const UserPen = make(PhUserCircleGear, 'duotone', 'UserPen');
export const Users = make(PhUsersThree, 'duotone', 'Users');
export const Utensils = make(PhForkKnife, 'duotone', 'Utensils');
export const Video = make(PhVideoCamera, 'duotone', 'Video');
export const Volume2 = make(PhSpeakerHigh, 'duotone', 'Volume2');
export const VolumeX = make(PhSpeakerX, 'duotone', 'VolumeX');
export const Wallet = make(PhWallet, 'duotone', 'Wallet');
export const Wand2 = make(PhMagicWand, 'duotone', 'Wand2');
export const Wine = make(PhWine, 'duotone', 'Wine');
export const X = make(PhX, 'bold', 'X');
export const XCircle = make(PhXCircle, 'duotone', 'XCircle');
export const Zap = make(PhLightning, 'duotone', 'Zap');
export const Accessibility = make(PhPersonArmsSpread, 'duotone', 'Accessibility');
export const AlertTriangle = make(PhWarning, 'duotone', 'AlertTriangle');
export const AlignCenterHorizontal = make(PhAlignCenterHorizontal, 'bold', 'AlignCenterHorizontal');
export const AlignCenterVertical = make(PhAlignCenterVertical, 'bold', 'AlignCenterVertical');
export const AlignEndVertical = make(PhAlignBottom, 'bold', 'AlignEndVertical');
export const AlignStartVertical = make(PhAlignTop, 'bold', 'AlignStartVertical');
export const Aperture = make(PhAperture, 'duotone', 'Aperture');
export const ArrowUp = make(PhArrowUp, 'bold', 'ArrowUp');
export const Baby = make(PhBaby, 'duotone', 'Baby');
export const BetweenHorizontalStart = make(PhRows, 'duotone', 'BetweenHorizontalStart');
export const BetweenVerticalStart = make(PhColumns, 'duotone', 'BetweenVerticalStart');
export const BookOpen = make(PhBookOpen, 'duotone', 'BookOpen');
export const BookmarkPlus = make(PhBookmarkSimple, 'duotone', 'BookmarkPlus');
export const BoxSelect = make(PhSelectionAll, 'bold', 'BoxSelect');
export const BrickWall = make(PhWall, 'duotone', 'BrickWall');
export const Briefcase = make(PhBriefcase, 'duotone', 'Briefcase');
export const Bus = make(PhBus, 'duotone', 'Bus');
export const CalendarPlus = make(PhCalendarPlus, 'duotone', 'CalendarPlus');
export const Car = make(PhCar, 'duotone', 'Car');
export const Circle = make(PhCircle, 'bold', 'Circle');
export const Clapperboard = make(PhFilmSlate, 'duotone', 'Clapperboard');
export const ClipboardList = make(PhClipboardText, 'duotone', 'ClipboardList');
export const Cloud = make(PhCloud, 'duotone', 'Cloud');
export const CloudSun = make(PhCloudSun, 'duotone', 'CloudSun');
export const Columns2 = make(PhColumns, 'duotone', 'Columns2');
export const Columns3 = make(PhSquareSplitHorizontal, 'duotone', 'Columns3');
export const Construction = make(PhBarricade, 'duotone', 'Construction');
export const Crosshair = make(PhCrosshair, 'bold', 'Crosshair');
export const Crown = make(PhCrown, 'duotone', 'Crown');
export const Dices = make(PhDiceFive, 'duotone', 'Dices');
export const DoorOpen = make(PhDoorOpen, 'duotone', 'DoorOpen');
export const Droplets = make(PhDrop, 'duotone', 'Droplets');
export const Edit3 = make(PhPencilSimpleLine, 'duotone', 'Edit3');
export const ExternalLink = make(PhArrowSquareOut, 'bold', 'ExternalLink');
export const Feather = make(PhFeather, 'duotone', 'Feather');
export const Film = make(PhFilmStrip, 'duotone', 'Film');
export const FlipHorizontal2 = make(PhFlipHorizontal, 'bold', 'FlipHorizontal2');
export const FlipVertical2 = make(PhFlipVertical, 'bold', 'FlipVertical2');
export const Flower2 = make(PhFlower, 'duotone', 'Flower2');
export const BringToFront = make(PhArrowLineUp, 'bold', 'BringToFront');
export const SendToBack = make(PhArrowLineDown, 'bold', 'SendToBack');
export const BringForward = make(PhStackPlus, 'bold', 'BringForward');
export const SendBackward = make(PhStackMinus, 'bold', 'SendBackward');
export const Gift = make(PhGift, 'duotone', 'Gift');
export const Group = make(PhSelectionPlus, 'bold', 'Group');
export const History = make(PhClockCounterClockwise, 'duotone', 'History');
export const Keyboard = make(PhKeyboard, 'duotone', 'Keyboard');
export const Languages = make(PhTranslate, 'duotone', 'Languages');
export const LayoutTemplate = make(PhLayout, 'duotone', 'LayoutTemplate');
export const Lightbulb = make(PhLightbulb, 'duotone', 'Lightbulb');
export const Link2 = make(PhLink, 'bold', 'Link2');
export const ListOrdered = make(PhListNumbers, 'bold', 'ListOrdered');
export const ListTree = make(PhTreeStructure, 'duotone', 'ListTree');
export const LocateFixed = make(PhGpsFix, 'bold', 'LocateFixed');
export const Move = make(PhArrowsOutCardinal, 'bold', 'Move');
export const MoveHorizontal = make(PhArrowsHorizontal, 'bold', 'MoveHorizontal');
export const Music2 = make(PhMusicNote, 'duotone', 'Music2');
export const PenLine = make(PhPencilLine, 'duotone', 'PenLine');
export const PenTool = make(PhPenNib, 'duotone', 'PenTool');
export const Presentation = make(PhPresentation, 'duotone', 'Presentation');
export const Rotate3d = make(PhCubeFocus, 'duotone', 'Rotate3d');
export const RotateCcw = make(PhArrowCounterClockwise, 'bold', 'RotateCcw');
export const RotateCw = make(PhArrowClockwise, 'bold', 'RotateCw');
export const Ruler = make(PhRuler, 'duotone', 'Ruler');
export const Save = make(PhFloppyDisk, 'duotone', 'Save');
export const Scissors = make(PhScissors, 'duotone', 'Scissors');
export const Scroll = make(PhScroll, 'duotone', 'Scroll');
export const Settings = make(PhGearSix, 'duotone', 'Settings');
export const Shapes = make(PhShapes, 'duotone', 'Shapes');
export const Share = make(PhExport, 'duotone', 'Share');
export const ShieldAlert = make(PhShieldWarning, 'duotone', 'ShieldAlert');
export const Shirt = make(PhTShirt, 'duotone', 'Shirt');
export const Sliders = make(PhSliders, 'bold', 'Sliders');
export const Square = make(PhSquare, 'bold', 'Square');
export const StepForward = make(PhSkipForward, 'duotone', 'StepForward');
export const Trees = make(PhTree, 'duotone', 'Trees');
export const Ungroup = make(PhSelectionSlash, 'bold', 'Ungroup');
export const Unlock = make(PhLockOpen, 'duotone', 'Unlock');
export const UserCheck = make(PhUserCheck, 'duotone', 'UserCheck');
export const UserPlus = make(PhUserPlus, 'duotone', 'UserPlus');
export const ZoomIn = make(PhMagnifyingGlassPlus, 'bold', 'ZoomIn');
export const ZoomOut = make(PhMagnifyingGlassMinus, 'bold', 'ZoomOut');
export const Activity = make(PhPulse, 'duotone', 'Activity');
export const Armchair = make(PhArmchair, 'duotone', 'Armchair');
export const Award = make(PhMedal, 'duotone', 'Award');
export const BarChart3 = make(PhChartBar, 'duotone', 'BarChart3');
export const Beer = make(PhBeerStein, 'duotone', 'Beer');
export const Bell = make(PhBell, 'duotone', 'Bell');
export const BellRing = make(PhBellRinging, 'duotone', 'BellRing');
export const Bold = make(PhTextB, 'bold', 'Bold');
export const Bookmark = make(PhBookmarkSimple, 'duotone', 'Bookmark');
export const CameraOff = make(PhCameraSlash, 'duotone', 'CameraOff');
export const CheckSquare = make(PhCheckSquare, 'duotone', 'CheckSquare');
export const Columns = make(PhColumns, 'duotone', 'Columns');
export const Edit2 = make(PhPencilSimple, 'duotone', 'Edit2');
export const FileSpreadsheet = make(PhFileXls, 'duotone', 'FileSpreadsheet');
export const Filter = make(PhFunnel, 'duotone', 'Filter');
export const Flag = make(PhFlag, 'duotone', 'Flag');
export const FolderHeart = make(PhFolderSimpleStar, 'duotone', 'FolderHeart');
export const Globe = make(PhGlobe, 'duotone', 'Globe');
export const GlobeLock = make(PhGlobeHemisphereWest, 'duotone', 'GlobeLock');
export const Grid = make(PhGridFour, 'duotone', 'Grid');
export const ImageOff = make(PhImageBroken, 'duotone', 'ImageOff');
export const Italic = make(PhTextItalic, 'bold', 'Italic');
export const Key = make(PhKey, 'duotone', 'Key');
export const Layout = make(PhLayout, 'duotone', 'Layout');
export const ListChecks = make(PhListChecks, 'bold', 'ListChecks');
export const LogIn = make(PhSignIn, 'duotone', 'LogIn');
export const Monitor = make(PhMonitor, 'duotone', 'Monitor');
export const MousePointerClick = make(PhCursorClick, 'duotone', 'MousePointerClick');
export const PanelLeft = make(PhSidebarSimple, 'duotone', 'PanelLeft');
export const PanelLeftClose = make(PhSidebarSimple, 'duotone', 'PanelLeftClose');
export const Percent = make(PhPercent, 'bold', 'Percent');
export const PieChart = make(PhChartPie, 'duotone', 'PieChart');
export const LineChart = make(PhChartLineUp, 'duotone', 'LineChart');
export const Pin = make(PhPushPin, 'duotone', 'Pin');
export const Redo = make(PhArrowArcRight, 'bold', 'Redo');
export const ScrollText = make(PhScroll, 'duotone', 'ScrollText');
export const Settings2 = make(PhSliders, 'duotone', 'Settings2');
export const Spline = make(PhPath, 'duotone', 'Spline');
export const Strikethrough = make(PhTextStrikethrough, 'bold', 'Strikethrough');
export const Tent = make(PhTent, 'duotone', 'Tent');
export const Theater = make(PhMaskHappy, 'duotone', 'Theater');
export const Trash = make(PhTrash, 'duotone', 'Trash');
export const TrendingUp = make(PhTrendUp, 'bold', 'TrendingUp');
export const Triangle = make(PhTriangle, 'bold', 'Triangle');
export const Truck = make(PhTruck, 'duotone', 'Truck');
export const Undo = make(PhArrowArcLeft, 'bold', 'Undo');
export const UploadCloud = make(PhCloudArrowUp, 'duotone', 'UploadCloud');
export const UserRound = make(PhUserCircle, 'duotone', 'UserRound');

// Logos des réseaux sociaux : dessins officiels, pas Phosphor.
export * from './brands';
