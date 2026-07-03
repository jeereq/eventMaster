'use client';

import React, { useEffect, useState, useRef } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { uploadImageFile, uploadDataUrlImage, isCloudinaryUrl } from '@/lib/cloudinaryUpload';
import { extractPaletteFromSource, type TemplatePalette } from '@/lib/imagePalette';
import { buildMockupTemplate, applyMockupToEditor, applyMockupTextMode, buildTextElementsFromOcrLines, type MockupImportTextMode } from '@/lib/templateMockupImport';
import { extractTextFromImageSource, mergeOcrIntoMockupElements } from '@/lib/templateOcrImport';
import { 
  Mail, PlusCircle, Trash2, Edit3, ArrowLeft, Save, 
  Sparkles, CheckCircle2, AlertCircle, Type, Image, 
  Columns, Settings, Eye, CheckSquare, Loader2, XCircle,
  Spline, Triangle, Plus, Trash, Layout, Palette, Square,
  ArrowUp, ArrowDown, Crop, Copy, Upload, Globe
} from 'lucide-react';
import { PageHeader, Alert, Button } from '@/components/ui';
import TemplateCardGrid from '@/components/templates/TemplateCardGrid';
import {
  type RsvpField,
  type CanvasSizePreset,
  CANVAS_SIZE_PRESETS,
  RSVP_FIELD_CATEGORIES,
  RSVP_FIELD_TYPE_LABELS,
  createDefaultRsvpField,
  getCanvasStyle,
  slugifyAnalyticsKey,
} from '@/lib/rsvpFormFields';

interface TemplateItem {
  id: string;
  name: string;
  content: any;
  createdAt: string;
  tenantId?: string | null;
  showOnLanding?: boolean;
  tenant?: {
    name: string;
  } | null;
}

interface CanvasElement {
  id: string;
  type: 'text' | 'image' | 'button' | 'rsvp-block' | 'curve' | 'triangle' | 'divider';
  text: string; // Used for text content, button text, image placeholder, shape labels
  color: string; // Main color (text color, button bg, shape fill, stroke color)
  fontSize: string; // Font size (for text/button) or stroke width/size for shapes
  align: 'left' | 'center' | 'right';
  
  // Advanced properties
  imageUrl?: string;
  imageWidth?: string;
  imageHeight?: string;
  imageObjectFit?: 'cover' | 'contain' | 'fill' | 'none';
  
  // Shape properties
  strokeWidth?: string;
  shapeSize?: string;
  
  // Customizable RSVP fields
  rsvpFields?: RsvpField[];
  /** inline = dans l'invitation ; outside = panneau sous la zone de design */
  rsvpPlacement?: 'inline' | 'outside';

  // New properties for high-end styling
  width?: 'full' | 'half' | 'third';
  fontFamily?: string;
  letterSpacing?: string;
  bold?: boolean;
  italic?: boolean;
  dividerStyle?: 'solid' | 'dashed' | 'ornament-flower' | 'ornament-diamond' | 'ornament-star' | 'ornament-leaves' | 'ornament-lace';
  curveStyle?: 'wave' | 'arc' | 'flourish-1' | 'flourish-2' | 'spiral' | 'infinity';
  imageStyle?: 'rounded' | 'circle' | 'arch' | 'oval' | 'gold-frame' | 'vintage' | 'shadow-luxury';
  buttonStyle?: 'filled' | 'outline' | 'pill' | 'gold-glow' | 'double-border' | 'minimalist';
  buttonLink?: string;
}

const darkenColor = (hex: string, percent = 30) => {
  if (!hex || !hex.startsWith('#')) return hex || '#000000';
  let r = parseInt(hex.slice(1, 3), 16);
  let g = parseInt(hex.slice(3, 5), 16);
  let b = parseInt(hex.slice(5, 7), 16);
  r = Math.max(0, Math.floor(r * (1 - percent / 100)));
  g = Math.max(0, Math.floor(g * (1 - percent / 100)));
  b = Math.max(0, Math.floor(b * (1 - percent / 100)));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

const lightenColor = (hex: string, percent = 30) => {
  if (!hex || !hex.startsWith('#')) return hex || '#ffffff';
  let r = parseInt(hex.slice(1, 3), 16);
  let g = parseInt(hex.slice(3, 5), 16);
  let b = parseInt(hex.slice(5, 7), 16);
  r = Math.min(255, Math.floor(r + (255 - r) * (percent / 100)));
  g = Math.min(255, Math.floor(g + (255 - g) * (percent / 100)));
  b = Math.min(255, Math.floor(b + (255 - b) * (percent / 100)));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

export default function TemplatesPage() {
  const { user, planFeatures, tenant } = useAuth();
  const canUseCustomTemplates = user?.role === 'SUPER_ADMIN' || planFeatures?.customTemplates !== false;
  const canUseMockupImport = canUseCustomTemplates;
  const canUseMockupOcr = user?.role === 'SUPER_ADMIN' || planFeatures?.mockupOcr === true;
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [canvasElements, setCanvasElements] = useState<CanvasElement[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  // Super Admin specific states
  const [tenants, setTenants] = useState<{ id: string; name: string }[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  
  // Global template properties
  const [bgType, setBgType] = useState<'color' | 'image' | 'pattern'>('pattern');
  const [bgColor, setBgColor] = useState('#faf8f5');
  const [bgImageUrl, setBgImageUrl] = useState('');
  const [bgPattern, setBgPattern] = useState<'none' | 'paper' | 'watercolor' | 'boho' | 'linen' | 'marble' | 'gold-dust' | 'parchment' | 'velvet'>('paper');
  const [frameType, setFrameType] = useState<'none' | 'arch' | 'double-border' | 'gold-border' | 'floral-wreath' | 'floral-arch' | 'boho-dried' | 'gold-leaves-circle' | 'minimal-leaves'>('double-border');
  const [fontTheme, setFontTheme] = useState('classic');
  const [floralColor, setFloralColor] = useState('#b91c1c');
  const [floralType, setFloralType] = useState<'roses' | 'cherry-blossom' | 'gold-leaves' | 'sunflowers' | 'eucalyptus'>('roses');
  const [floralDensity, setFloralDensity] = useState<number>(40);

  // Landing page metadata (modèles globaux super admin)
  const [landingCategory, setLandingCategory] = useState<'private' | 'corporate' | 'casual'>('private');
  const [landingDescription, setLandingDescription] = useState('');
  const [showOnLanding, setShowOnLanding] = useState(false);
  const [canvasSizePreset, setCanvasSizePreset] = useState<CanvasSizePreset>('standard');
  const [canvasWidth, setCanvasWidth] = useState(CANVAS_SIZE_PRESETS.standard.width);
  const [canvasHeight, setCanvasHeight] = useState(CANVAS_SIZE_PRESETS.standard.height);

  // Property editing states for selected element
  const [elText, setElText] = useState('');
  const [elColor, setElColor] = useState('#1e293b');
  const [elFontSize, setElFontSize] = useState('16px');
  const [elAlign, setElAlign] = useState<'left' | 'center' | 'right'>('center');
  const [elImageUrl, setElImageUrl] = useState('');
  const [elImageWidth, setElImageWidth] = useState('100%');
  const [elImageHeight, setElImageHeight] = useState('200px');
  const [elImageObjectFit, setElImageObjectFit] = useState<'cover' | 'contain' | 'fill' | 'none'>('cover');
  const [elStrokeWidth, setElStrokeWidth] = useState('3px');
  const [elShapeSize, setElShapeSize] = useState('60px');
  const [elRsvpFields, setElRsvpFields] = useState<RsvpField[]>([]);
  const [elRsvpPlacement, setElRsvpPlacement] = useState<'inline' | 'outside'>('inline');
  const [elWidth, setElWidth] = useState<'full' | 'half' | 'third'>('full');
  const [elFontFamily, setElFontFamily] = useState('Cormorant Garamond');
  const [elLetterSpacing, setElLetterSpacing] = useState('normal');
  const [elBold, setElBold] = useState(false);
  const [elItalic, setElItalic] = useState(false);
  const [elDividerStyle, setElDividerStyle] = useState<'solid' | 'dashed' | 'ornament-flower' | 'ornament-diamond' | 'ornament-star' | 'ornament-leaves' | 'ornament-lace'>('ornament-flower');
  const [elCurveStyle, setElCurveStyle] = useState<'wave' | 'arc' | 'flourish-1' | 'flourish-2' | 'spiral' | 'infinity'>('wave');
  const [elImageStyle, setElImageStyle] = useState<'rounded' | 'circle' | 'arch' | 'oval' | 'gold-frame' | 'vintage' | 'shadow-luxury'>('rounded');
  const [elButtonStyle, setElButtonStyle] = useState<'filled' | 'outline' | 'pill' | 'gold-glow' | 'double-border' | 'minimalist'>('filled');
  const [elButtonLink, setElButtonLink] = useState('');

  // Error/Success state
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  // Cropper States
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState('');
  const [cropZoom, setCropZoom] = useState(1);
  const [cropPanX, setCropPanX] = useState(0);
  const [cropPanY, setCropPanY] = useState(0);
  const [cropAspectRatio, setCropAspectRatio] = useState<'1:1' | '16:9' | '4:3' | '2:3' | 'free'>('1:1');
  const [cropImageNaturalWidth, setCropImageNaturalWidth] = useState(0);
  const [cropImageNaturalHeight, setCropImageNaturalHeight] = useState(0);
  const [isDraggingCrop, setIsDraggingCrop] = useState(false);
  const [dragStartCrop, setDragStartCrop] = useState({ x: 0, y: 0 });
  const [imageUploading, setImageUploading] = useState(false);
  const [mockupImporting, setMockupImporting] = useState(false);
  const [importedPalette, setImportedPalette] = useState<TemplatePalette | null>(null);
  const [importedWithOcr, setImportedWithOcr] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<number | null>(null);
  const [mockupImportModalOpen, setMockupImportModalOpen] = useState(false);
  const [pendingMockupFile, setPendingMockupFile] = useState<File | null>(null);
  const [pendingMockupOpenEditor, setPendingMockupOpenEditor] = useState(true);
  const [mockupImportMode, setMockupImportMode] = useState<MockupImportTextMode>('placeholders');
  const mockupInputRef = useRef<HTMLInputElement>(null);
  const mockupEditorInputRef = useRef<HTMLInputElement>(null);

  const loadTemplates = async () => {
    try {
      const data = await api.get('/templates');
      setTemplates(data);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des modèles');
    } finally {
      setLoading(false);
    }
  };

  const loadTenants = async () => {
    if (user?.role === 'SUPER_ADMIN') {
      try {
        const data = await api.get('/admin/stats');
        if (data && data.tenants) {
          setTenants(data.tenants);
        }
      } catch (err) {
        console.error('Erreur lors du chargement des organisations:', err);
      }
    }
  };

  useEffect(() => {
    if (user) {
      loadTemplates();
      loadTenants();
    }
  }, [user]);

  useEffect(() => {
    if (editorOpen && !canUseCustomTemplates) {
      setEditorOpen(false);
    }
  }, [editorOpen, canUseCustomTemplates]);

  useEffect(() => {
    if (selectedTenantId) {
      setShowOnLanding(false);
    }
  }, [selectedTenantId]);

  useEffect(() => {
    if (typeof window !== 'undefined' && templates.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const editId = params.get('edit');
      if (editId) {
        const t = templates.find(temp => temp.id === editId);
        if (t) {
          handleEditTemplateClick(t);
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    }
  }, [templates]);

  const handleCreateTemplateClick = () => {
    if (!canUseCustomTemplates) return;
    setEditingTemplateId(null);
    setTemplateName('Nouveau Modèle d\'Invitation');
    setSelectedTenantId('');
    setImportedPalette(null);
    setImportedWithOcr(false);
    setCanvasElements([
      { id: '1', type: 'text', text: 'CÉLÉBRATION UNIQUE', color: '#c5a059', fontSize: '12px', align: 'center', width: 'full', fontFamily: 'Montserrat', letterSpacing: '0.2em', bold: true },
      { id: '2', type: 'text', text: 'Hassan & Ayesha', color: '#1e293b', fontSize: '32px', align: 'center', width: 'full', fontFamily: 'Great Vibes' },
      { id: '3', type: 'divider', text: '', color: '#c5a059', fontSize: '14px', align: 'center', width: 'full', dividerStyle: 'ornament-flower' },
      { id: '4', type: 'text', text: 'Rejoignez-nous pour célébrer notre union le dimanche 15 juin à 19h00.', color: '#475569', fontSize: '16px', align: 'center', width: 'full', fontFamily: 'Cormorant Garamond', italic: true },
      { id: '5', type: 'text', text: 'DIMANCHE', color: '#1e293b', fontSize: '12px', align: 'center', width: 'third', fontFamily: 'Montserrat', letterSpacing: '0.1em', bold: true },
      { id: '6', type: 'text', text: '15 JUIN', color: '#c5a059', fontSize: '16px', align: 'center', width: 'third', fontFamily: 'Cormorant Garamond', bold: true },
      { id: '7', type: 'text', text: '19H00', color: '#1e293b', fontSize: '12px', align: 'center', width: 'third', fontFamily: 'Montserrat', letterSpacing: '0.1em', bold: true },
      { id: '8', type: 'divider', text: '', color: '#cbd5e1', fontSize: '12px', align: 'center', width: 'full', dividerStyle: 'solid' },
      { 
        id: '9', 
        type: 'rsvp-block', 
        text: 'Confirmer votre présence', 
        color: '#c5a059', 
        fontSize: '16px', 
        align: 'center',
        width: 'full',
        rsvpFields: [
          { id: 'f1', type: 'select', label: 'Choix du menu', options: 'Poulet, Poisson, Végétarien', required: true, analyticsKey: 'choix_menu', category: 'preference' },
          { id: 'f2', type: 'yes_no', label: 'Accompagné d\'un plus one', required: false, analyticsKey: 'plus_one', category: 'logistics' },
          { id: 'f3', type: 'number', label: 'Nombre de personnes', required: false, analyticsKey: 'nombre_personnes', category: 'logistics', placeholder: 'Ex. : 2' },
        ],
        rsvpPlacement: 'outside',
      },
    ]);
    
    // Set global styles for paper texture and double border
    setBgType('pattern');
    setBgColor('#faf8f5');
    setBgImageUrl('');
    setBgPattern('paper');
    setFrameType('double-border');
    setFontTheme('classic');
    setFloralColor('#b91c1c');
    setFloralType('roses');
    setFloralDensity(40);
    setLandingCategory('private');
    setLandingDescription('');
    setShowOnLanding(false);
    setCanvasSizePreset('standard');
    setCanvasWidth(CANVAS_SIZE_PRESETS.standard.width);
    setCanvasHeight(CANVAS_SIZE_PRESETS.standard.height);
    
    setSelectedElementId(null);
    setEditorOpen(true);
  };

  const handleEditTemplateClick = (t: TemplateItem) => {
    if (!canUseCustomTemplates) return;
    setEditingTemplateId(t.id);
    setTemplateName(t.name);
    setCanvasElements(t.content?.elements || []);
    setSelectedTenantId(t.tenantId || '');
    
    // Load global styles
    const global = t.content?.global || {};
    setBgType(global.bgType || 'pattern');
    setBgColor(global.bgColor || '#faf8f5');
    setBgImageUrl(global.bgImageUrl || '');
    setBgPattern(global.bgPattern || 'paper');
    setFrameType(global.frameType || 'double-border');
    setFontTheme(global.fontTheme || 'classic');
    setFloralColor(global.floralColor || '#b91c1c');
    setFloralType(global.floralType || 'roses');
    setFloralDensity(global.floralDensity !== undefined ? global.floralDensity : 40);
    setImportedPalette(global.palette || null);
    setLandingCategory(global.landingCategory || 'private');
    setLandingDescription(global.landingDescription || '');
    setShowOnLanding(Boolean(t.showOnLanding));
    setCanvasSizePreset(global.canvasSizePreset || 'standard');
    const dims = global.canvasSizePreset && global.canvasSizePreset !== 'custom'
      ? CANVAS_SIZE_PRESETS[global.canvasSizePreset as Exclude<CanvasSizePreset, 'custom'>]
      : null;
    setCanvasWidth(global.canvasWidth || dims?.width || CANVAS_SIZE_PRESETS.standard.width);
    setCanvasHeight(global.canvasHeight || dims?.height || CANVAS_SIZE_PRESETS.standard.height);
    
    setSelectedElementId(null);
    setEditorOpen(true);
  };

  useEffect(() => {
    if (typeof window === 'undefined' || !canUseCustomTemplates) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('new') !== '1') return;
    handleCreateTemplateClick();
    window.history.replaceState({}, document.title, window.location.pathname);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- ouverture unique via ?new=1
  }, [canUseCustomTemplates]);

  const handleAddElement = (type: 'text' | 'image' | 'button' | 'rsvp-block' | 'curve' | 'triangle' | 'divider') => {
    const newElement: CanvasElement = {
      id: Date.now().toString(),
      type,
      text: type === 'text' ? 'Double-cliquez pour modifier ce texte' :
            type === 'button' ? 'Bouton Action' :
            type === 'image' ? 'Image d\'illustration' :
            type === 'curve' ? 'Ligne courbe décorative' :
            type === 'triangle' ? 'Triangle décoratif' : 
            type === 'divider' ? '' : 'Confirmer ma présence',
      color: type === 'button' ? '#4f46e5' : 
             type === 'curve' || type === 'triangle' || type === 'divider' ? '#c5a059' : '#1e293b',
      fontSize: type === 'text' ? '16px' : 
                type === 'curve' ? '3px' : '15px',
      align: 'center',
      width: 'full',
      fontFamily: type === 'text' || type === 'button' ? 'Cormorant Garamond' : undefined,
      letterSpacing: 'normal',
      bold: false,
      italic: false,
      imageUrl: type === 'image' ? '' : undefined,
      imageWidth: type === 'image' ? '100%' : undefined,
      imageHeight: type === 'image' ? '200px' : undefined,
      imageObjectFit: type === 'image' ? 'cover' : undefined,
      strokeWidth: type === 'curve' ? '3px' : undefined,
      shapeSize: type === 'triangle' ? '60px' : undefined,
      dividerStyle: type === 'divider' ? 'ornament-flower' : undefined,
      curveStyle: type === 'curve' ? 'wave' : undefined,
      imageStyle: type === 'image' ? 'rounded' : undefined,
      buttonStyle: type === 'button' ? 'filled' : undefined,
      buttonLink: type === 'button' ? '' : undefined,
      rsvpFields: type === 'rsvp-block' ? [
        { id: 'f1', type: 'select', label: 'Choix du menu', options: 'Poulet, Poisson, Végétarien', required: true, analyticsKey: 'choix_menu', category: 'preference' },
      ] : undefined,
      rsvpPlacement: type === 'rsvp-block' ? 'inline' as const : undefined,
    };
    setCanvasElements([...canvasElements, newElement]);
    setSelectedElementId(newElement.id);
    
    // Set local states
    setElText(newElement.text);
    setElColor(newElement.color);
    setElFontSize(newElement.fontSize);
    setElAlign(newElement.align);
    setElWidth('full');
    setElFontFamily(newElement.fontFamily || 'Cormorant Garamond');
    setElLetterSpacing('normal');
    setElBold(false);
    setElItalic(false);
    setElImageUrl('');
    setElImageWidth('100%');
    setElImageHeight('200px');
    setElImageObjectFit('cover');
    setElStrokeWidth('3px');
    setElShapeSize('60px');
    setElDividerStyle('ornament-flower');
    setElCurveStyle('wave');
    setElImageStyle('rounded');
    setElButtonStyle('filled');
    setElButtonLink('');
    setElRsvpFields(newElement.rsvpFields || []);
    setElRsvpPlacement(newElement.rsvpPlacement || 'inline');
  };

  const handleElementSelect = (id: string) => {
    setSelectedElementId(id);
    const el = canvasElements.find(e => e.id === id);
    if (el) {
      setElText(el.text);
      setElColor(el.color);
      setElFontSize(el.fontSize);
      setElAlign(el.align);
      setElWidth(el.width || 'full');
      setElFontFamily(el.fontFamily || 'Cormorant Garamond');
      setElLetterSpacing(el.letterSpacing || 'normal');
      setElBold(el.bold || false);
      setElItalic(el.italic || false);
      setElImageUrl(el.imageUrl || '');
      setElImageWidth(el.imageWidth || '100%');
      setElImageHeight(el.imageHeight || '200px');
      setElImageObjectFit(el.imageObjectFit || 'cover');
      setElStrokeWidth(el.strokeWidth || '3px');
      setElShapeSize(el.shapeSize || '60px');
      setElDividerStyle(el.dividerStyle || 'ornament-flower');
      setElCurveStyle(el.curveStyle || 'wave');
      setElImageStyle(el.imageStyle || 'rounded');
      setElButtonStyle(el.buttonStyle || 'filled');
      setElButtonLink(el.buttonLink || '');
      setElRsvpFields(el.rsvpFields || []);
      setElRsvpPlacement(el.rsvpPlacement || 'inline');
    }
  };

  const handlePropertyChange = (field: keyof CanvasElement, value: any) => {
    if (!selectedElementId) return;
    
    if (field === 'text') setElText(value);
    if (field === 'color') setElColor(value);
    if (field === 'fontSize') setElFontSize(value);
    if (field === 'align') setElAlign(value as any);
    if (field === 'width') setElWidth(value);
    if (field === 'fontFamily') setElFontFamily(value);
    if (field === 'letterSpacing') setElLetterSpacing(value);
    if (field === 'bold') setElBold(value);
    if (field === 'italic') setElItalic(value);
    if (field === 'imageUrl') setElImageUrl(value);
    if (field === 'imageWidth') setElImageWidth(value);
    if (field === 'imageHeight') setElImageHeight(value);
    if (field === 'imageObjectFit') setElImageObjectFit(value);
    if (field === 'strokeWidth') setElStrokeWidth(value);
    if (field === 'shapeSize') setElShapeSize(value);
    if (field === 'dividerStyle') setElDividerStyle(value);
    if (field === 'curveStyle') setElCurveStyle(value);
    if (field === 'imageStyle') setElImageStyle(value);
    if (field === 'buttonStyle') setElButtonStyle(value);
    if (field === 'buttonLink') setElButtonLink(value);
    if (field === 'rsvpFields') setElRsvpFields(value);
    if (field === 'rsvpPlacement') setElRsvpPlacement(value);

    setCanvasElements(canvasElements.map(el => {
      if (el.id === selectedElementId) {
        return { ...el, [field]: value };
      }
      return el;
    }));
  };

  // Move element up in the list
  const handleMoveElementUp = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (index === 0) return; // Already at the top
    
    const updatedElements = [...canvasElements];
    const temp = updatedElements[index];
    updatedElements[index] = updatedElements[index - 1];
    updatedElements[index - 1] = temp;
    
    setCanvasElements(updatedElements);
  };

  // Move element down in the list
  const handleMoveElementDown = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (index === canvasElements.length - 1) return; // Already at the bottom
    
    const updatedElements = [...canvasElements];
    const temp = updatedElements[index];
    updatedElements[index] = updatedElements[index + 1];
    updatedElements[index + 1] = temp;
    
    setCanvasElements(updatedElements);
  };

  const uploadToCloudinary = async (source: File | string): Promise<string> => {
    if (typeof source === 'string' && (isCloudinaryUrl(source) || source.startsWith('http'))) {
      return source;
    }
    setImageUploading(true);
    try {
      if (source instanceof File) {
        const result = await uploadImageFile(source);
        return result.url;
      }
      if (source.startsWith('data:image/')) {
        const result = await uploadDataUrlImage(source);
        return result.url;
      }
      throw new Error('Format d\'image non supporté.');
    } finally {
      setImageUploading(false);
    }
  };

  const handleMockupImport = async (
    file: File,
    openEditor = true,
    textMode: MockupImportTextMode = 'placeholders',
  ) => {
    setError('');
    if (!canUseMockupImport) return;
    setMockupImporting(true);
    setOcrProgress(null);
    const useOcr = textMode === 'ocr';
    try {
      const palette = await extractPaletteFromSource(file);
      const uploaded = await uploadImageFile(file);
      let mockup = buildMockupTemplate(uploaded.url, palette);

      if (useOcr) {
        if (!canUseMockupOcr) {
          setError('La détection de texte (OCR) nécessite le forfait Business Premium 2 ou supérieur.');
          return;
        }
        setOcrProgress(0);
        const ocr = await extractTextFromImageSource(file, (p) => setOcrProgress(Math.round(p * 100)));
        if (ocr.lines.length > 0) {
          mockup = {
            ...mockup,
            elements: mergeOcrIntoMockupElements(mockup.elements, ocr.lines) as typeof mockup.elements,
          };
        } else {
          mockup = applyMockupTextMode(mockup, 'placeholders');
        }
        setOcrProgress(null);
      } else {
        mockup = applyMockupTextMode(mockup, textMode);
      }

      applyMockupToEditor(mockup, {
        setTemplateName,
        setCanvasElements: (elements) => setCanvasElements(elements),
        setBgType,
        setBgColor,
        setBgImageUrl,
        setBgPattern: (v) => setBgPattern(v),
        setFrameType: (v) => setFrameType(v),
        setFontTheme,
        setFloralColor,
        setFloralType: (v) => setFloralType(v),
        setFloralDensity,
        setSelectedElementId,
      });
      setImportedPalette(palette);
      setImportedWithOcr(useOcr);
      setEditingTemplateId(null);
      if (openEditor) setEditorOpen(true);
      setSuccess(
        useOcr
          ? 'Maquette importée — texte de l\'image détecté et appliqué aux emplacements.'
          : textMode === 'image-only'
            ? 'Maquette importée — fond image et palette uniquement. Ajoutez vos éléments.'
            : textMode === 'structure-only'
              ? 'Maquette importée — structure sans blocs texte (RSVP, boutons…).'
              : 'Maquette importée — emplacements texte génériques ajoutés.',
      );
    } catch (err: any) {
      setError(err.message || 'Impossible d\'importer la maquette.');
    } finally {
      setMockupImporting(false);
      setOcrProgress(null);
    }
  };

  const handleMockupFileChange = async (e: React.ChangeEvent<HTMLInputElement>, openEditor = true) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!canUseMockupImport) return;
    if (!file.type.startsWith('image/')) {
      setError('Veuillez sélectionner une image (JPEG, PNG, WebP).');
      return;
    }
    setPendingMockupFile(file);
    setPendingMockupOpenEditor(openEditor);
    setMockupImportMode('placeholders');
    setMockupImportModalOpen(true);
  };

  const handleConfirmMockupImport = async () => {
    if (!pendingMockupFile) return;
    setMockupImportModalOpen(false);
    const file = pendingMockupFile;
    const openEditor = pendingMockupOpenEditor;
    const mode = mockupImportMode;
    setPendingMockupFile(null);
    await handleMockupImport(file, openEditor, mode);
  };

  const renderMockupImportModal = () => {
    if (!mockupImportModalOpen || !pendingMockupFile) return null;

    const modes: Array<{
      id: MockupImportTextMode;
      title: string;
      description: string;
      disabled?: boolean;
      badge?: string;
    }> = [
      {
        id: 'image-only',
        title: 'Fond image uniquement',
        description: 'Importe la palette et l\'image de fond, sans aucun élément par-dessus.',
      },
      {
        id: 'placeholders',
        title: 'Avec emplacements texte',
        description: 'Ajoute des blocs texte génériques (titre, date, lieu…) à personnaliser.',
      },
      {
        id: 'structure-only',
        title: 'Sans blocs texte',
        description: 'Conserve RSVP, boutons et séparateurs, mais supprime tous les blocs texte.',
      },
      {
        id: 'ocr',
        title: 'Détecter le texte de l\'image (OCR)',
        description: 'Lit le texte sur l\'image et remplit les emplacements texte du modèle.',
        disabled: !canUseMockupOcr,
        badge: canUseMockupOcr ? 'Premium 2+' : 'Premium 2 requis',
      },
    ];

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
        <div className="bg-white rounded-[28px] border border-slate-100 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col animate-fade-in">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-900">Mode d&apos;import de la maquette</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Fichier : <span className="font-semibold text-slate-700">{pendingMockupFile.name}</span>
            </p>
          </div>
          <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
            {modes.map((mode) => (
              <label
                key={mode.id}
                className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition ${
                  mockupImportMode === mode.id
                    ? 'border-indigo-500 bg-indigo-50/40'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                } ${mode.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <input
                  type="radio"
                  name="mockup-import-mode"
                  value={mode.id}
                  checked={mockupImportMode === mode.id}
                  disabled={mode.disabled}
                  onChange={() => setMockupImportMode(mode.id)}
                  className="mt-1 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="min-w-0">
                  <span className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-slate-800">{mode.title}</span>
                    {mode.badge && (
                      <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                        {mode.badge}
                      </span>
                    )}
                  </span>
                  <span className="block text-xs text-slate-500 mt-1 leading-relaxed">{mode.description}</span>
                </span>
              </label>
            ))}
          </div>
          <div className="p-6 border-t border-slate-100 flex gap-3 justify-end bg-slate-50/50">
            <button
              type="button"
              onClick={() => {
                setMockupImportModalOpen(false);
                setPendingMockupFile(null);
              }}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleConfirmMockupImport}
              disabled={mockupImportMode === 'ocr' && !canUseMockupOcr}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition shadow-md"
            >
              Importer
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Handle image file upload → Cloudinary
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const url = await uploadToCloudinary(file);
      handlePropertyChange('imageUrl', url);
    } catch (err: any) {
      setError(err.message || 'Échec de l\'upload image.');
    }
  };

  const [cropTarget, setCropTarget] = useState<'element' | 'background'>('element');

  const handleOpenCropper = (target: 'element' | 'background') => {
    const src = target === 'element' ? elImageUrl : bgImageUrl;
    if (!src) return;
    setCropTarget(target);
    setCropImageSrc(src);
    setCropZoom(1);
    setCropPanX(0);
    setCropPanY(0);
    setCropAspectRatio(target === 'background' ? '2:3' : '1:1');
    setCropperOpen(true);
  };

  const handleApplyCrop = () => {
    if (!cropImageSrc) return;

    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = async () => {
      try {
        const containerWidth = 400;
        const containerHeight = 300;
        const imageRatio = img.naturalWidth / img.naturalHeight;
        const containerRatio = containerWidth / containerHeight;
        
        let displayedWidth = 0;
        let displayedHeight = 0;
        
        if (imageRatio > containerRatio) {
          displayedWidth = containerWidth;
          displayedHeight = containerWidth / imageRatio;
        } else {
          displayedHeight = containerHeight;
          displayedWidth = containerHeight * imageRatio;
        }

        let cropWidth = 200;
        let cropHeight = 200;
        
        if (cropAspectRatio === '1:1') {
          cropWidth = 200;
          cropHeight = 200;
        } else if (cropAspectRatio === '16:9') {
          cropWidth = 280;
          cropHeight = 157.5;
        } else if (cropAspectRatio === '4:3') {
          cropWidth = 240;
          cropHeight = 180;
        } else if (cropAspectRatio === '2:3') {
          cropWidth = 160;
          cropHeight = 240;
        } else {
          cropWidth = 240;
          cropHeight = 180;
        }

        const scale = img.naturalWidth / displayedWidth;
        
        const imgLeft = (containerWidth - displayedWidth * cropZoom) / 2 + cropPanX;
        const imgTop = (containerHeight - displayedHeight * cropZoom) / 2 + cropPanY;
        
        const cropLeft = (containerWidth - cropWidth) / 2;
        const cropTop = (containerHeight - cropHeight) / 2;
        
        const relativeLeft = cropLeft - imgLeft;
        const relativeTop = cropTop - imgTop;
        
        const sourceX = (relativeLeft / cropZoom) * scale;
        const sourceY = (relativeTop / cropZoom) * scale;
        const sourceWidth = (cropWidth / cropZoom) * scale;
        const sourceHeight = (cropHeight / cropZoom) * scale;

        const canvas = document.createElement('canvas');
        canvas.width = sourceWidth;
        canvas.height = sourceHeight;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          ctx.drawImage(
            img,
            sourceX,
            sourceY,
            sourceWidth,
            sourceHeight,
            0,
            0,
            sourceWidth,
            sourceHeight
          );
          
          const croppedBase64 = canvas.toDataURL('image/jpeg', 0.92);
          const cloudUrl = await uploadToCloudinary(croppedBase64);
          if (cropTarget === 'element') {
            handlePropertyChange('imageUrl', cloudUrl);
          } else {
            setBgImageUrl(cloudUrl);
          }
          setCropperOpen(false);
        }
      } catch (err: any) {
        console.error('Erreur lors du rognage de l\'image:', err);
        setError(err.message || 'Impossible de rogner l\'image. Veuillez réessayer.');
      }
    };

    img.onerror = (err) => {
      console.error('Erreur de chargement de l\'image pour le rognage:', err);
      setError('Impossible de charger l\'image pour le rognage.');
    };

    img.src = cropImageSrc;
  };

  // Drag handlers for the cropper
  const handleCropMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingCrop(true);
    setDragStartCrop({ x: e.clientX - cropPanX, y: e.clientY - cropPanY });
  };

  const handleCropMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingCrop) return;
    setCropPanX(e.clientX - dragStartCrop.x);
    setCropPanY(e.clientY - dragStartCrop.y);
  };

  const handleCropMouseUp = () => {
    setIsDraggingCrop(false);
  };

  // Touch handlers for mobile devices
  const handleCropTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    setIsDraggingCrop(true);
    setDragStartCrop({ 
      x: e.touches[0].clientX - cropPanX, 
      y: e.touches[0].clientY - cropPanY 
    });
  };

  const handleCropTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingCrop || e.touches.length !== 1) return;
    setCropPanX(e.touches[0].clientX - dragStartCrop.x);
    setCropPanY(e.touches[0].clientY - dragStartCrop.y);
  };

  // Global background image upload → Cloudinary
  const handleGlobalImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const url = await uploadToCloudinary(file);
      setBgImageUrl(url);
      setBgType('image');
    } catch (err: any) {
      setError(err.message || 'Échec de l\'upload de l\'image de fond.');
    }
  };

  // Customizable RSVP fields management
  const handleAddRsvpField = () => {
    const newField = createDefaultRsvpField();
    const updatedFields = [...elRsvpFields, newField];
    handlePropertyChange('rsvpFields', updatedFields);
  };

  const handleUpdateRsvpField = (fieldId: string, key: keyof RsvpField, value: any) => {
    const updatedFields = elRsvpFields.map(f => {
      if (f.id === fieldId) {
        const updated = { ...f, [key]: value };
        if (key === 'label' && !f.analyticsKey?.trim()) {
          updated.analyticsKey = slugifyAnalyticsKey(value);
        }
        return updated;
      }
      return f;
    });
    handlePropertyChange('rsvpFields', updatedFields);
  };

  const handleCanvasPresetChange = (preset: CanvasSizePreset) => {
    setCanvasSizePreset(preset);
    if (preset !== 'custom' && CANVAS_SIZE_PRESETS[preset]) {
      setCanvasWidth(CANVAS_SIZE_PRESETS[preset].width);
      setCanvasHeight(CANVAS_SIZE_PRESETS[preset].height);
    }
  };

  const handleDeleteRsvpField = (fieldId: string) => {
    const updatedFields = elRsvpFields.filter(f => f.id !== fieldId);
    handlePropertyChange('rsvpFields', updatedFields);
  };

  const handleDeleteElement = (id: string) => {
    setCanvasElements(canvasElements.filter(el => el.id !== id));
    if (selectedElementId === id) {
      setSelectedElementId(null);
    }
  };

  const handleSaveTemplate = async () => {
    setError('');
    setSuccess('');
    
    if (!templateName.trim()) {
      setError('Le nom du modèle est obligatoire.');
      return;
    }

    setSaving(true);
    try {
      const isGlobalTemplate = user?.role === 'SUPER_ADMIN' && !selectedTenantId;
      const payload: Record<string, unknown> = {
        name: templateName,
        content: { 
          global: {
            bgType,
            bgColor,
            bgImageUrl,
            bgPattern,
            frameType,
            fontTheme,
            floralColor,
            floralType,
            floralDensity,
            canvasSizePreset,
            canvasWidth,
            canvasHeight,
            ...(isGlobalTemplate ? { landingCategory, landingDescription: landingDescription.trim() || undefined } : {}),
            ...(importedPalette ? { palette: importedPalette, importedFromMockup: true, importedWithOcr } : {}),
          },
          elements: canvasElements 
        },
        targetTenantId: user?.role === 'SUPER_ADMIN' ? (selectedTenantId || null) : undefined,
      };
      if (isGlobalTemplate) {
        payload.showOnLanding = showOnLanding;
      }

      if (editingTemplateId) {
        await api.put(`/templates/${editingTemplateId}`, payload);
        setSuccess('Modèle d\'invitation mis à jour avec succès !');
      } else {
        await api.post('/templates', payload);
        setSuccess('Modèle d\'invitation enregistré avec succès !');
      }

      setEditorOpen(false);
      loadTemplates();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la sauvegarde du modèle.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!canUseCustomTemplates) return;
    if (!confirm('Supprimer ce modèle d\'invitation ?')) return;
    try {
      await api.delete(`/templates/${id}`);
      setTemplates(templates.filter(t => t.id !== id));
      setSuccess('Modèle supprimé.');
    } catch (err: any) {
      setError('Erreur lors de la suppression.');
    }
  };

  const handleDuplicateTemplate = async (t: TemplateItem) => {
    if (!canUseCustomTemplates) return;
    try {
      setLoading(true);
      const payload = {
        name: `${t.name} (Copie)`,
        content: t.content,
        targetTenantId: t.tenantId || null
      };
      await api.post('/templates', payload);
      setSuccess(`Modèle "${t.name}" dupliqué avec succès !`);
      loadTemplates();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la duplication du modèle.');
      setLoading(false);
    }
  };

  // Helper to get background style
  const getBackgroundStyle = (type: string, color: string, url: string, pattern: string) => {
    if (type === 'color') return { backgroundColor: color };
    if (type === 'image' && url) return { backgroundImage: `url(${url})`, backgroundSize: 'cover', backgroundPosition: 'center' };
    if (type === 'pattern') {
      if (pattern === 'paper') {
        return {
          backgroundColor: color || '#faf8f5',
          backgroundImage: 'radial-gradient(rgba(0,0,0,0.03) 1px, transparent 0), radial-gradient(rgba(0,0,0,0.02) 1px, transparent 0)',
          backgroundSize: '8px 8px',
          backgroundPosition: '0 0, 4px 4px',
        };
      }
      if (pattern === 'watercolor') {
        return {
          background: `radial-gradient(circle at 10% 10%, rgba(243, 224, 217, 0.6) 0%, transparent 60%), radial-gradient(circle at 90% 90%, rgba(225, 212, 198, 0.6) 0%, transparent 60%), radial-gradient(circle at 50% 50%, ${color || '#fdfbf7'} 0%, 100%)`,
        };
      }
      if (pattern === 'boho') {
        return { backgroundColor: color || '#faf6f0' };
      }
      if (pattern === 'linen') {
        return {
          backgroundColor: color || '#f4f1ea',
          backgroundImage: `
            linear-gradient(90deg, rgba(180,170,150,0.08) 1px, transparent 1px),
            linear-gradient(rgba(180,170,150,0.08) 1px, transparent 1px)
          `,
          backgroundSize: '4px 4px',
        };
      }
      if (pattern === 'marble') {
        return {
          backgroundColor: color || '#f5f5f5',
          backgroundImage: `
            radial-gradient(circle at 30% 20%, rgba(197,160,89,0.04) 0%, transparent 40%),
            radial-gradient(circle at 80% 70%, rgba(197,160,89,0.04) 0%, transparent 40%),
            linear-gradient(135deg, rgba(0,0,0,0.01) 0%, rgba(0,0,0,0.01) 10%, transparent 10%, transparent 50%, rgba(0,0,0,0.01) 50%, rgba(0,0,0,0.01) 60%, transparent 60%, transparent 100%)
          `,
          backgroundSize: '100% 100%, 100% 100%, 40px 40px',
        };
      }
      if (pattern === 'gold-dust') {
        return {
          backgroundColor: color || '#1e1b18',
          backgroundImage: `
            radial-gradient(circle at 20% 30%, rgba(197,160,89,0.2) 1px, transparent 1px),
            radial-gradient(circle at 75% 40%, rgba(197,160,89,0.2) 2px, transparent 2px),
            radial-gradient(circle at 50% 80%, rgba(197,160,89,0.15) 1.5px, transparent 1.5px),
            radial-gradient(circle at 10% 75%, rgba(197,160,89,0.12) 2.5px, transparent 2.5px),
            radial-gradient(circle at 90% 15%, rgba(197,160,89,0.2) 1px, transparent 1px)
          `,
          backgroundSize: '120px 120px, 150px 150px, 100px 100px, 180px 180px, 140px 140px',
        };
      }
      if (pattern === 'parchment') {
        return {
          background: `radial-gradient(circle, ${color || '#f1e6d2'} 0%, #e4d3b2 100%)`,
          boxShadow: 'inset 0 0 40px rgba(139,90,43,0.15)',
        };
      }
      if (pattern === 'velvet') {
        return {
          background: `radial-gradient(circle at 50% 30%, ${color || '#4a0e17'} 0%, #1a0307 100%)`,
        };
      }
    }
    return { backgroundColor: '#ffffff' };
  };

  const fontFamilies = [
    { id: 'Cormorant Garamond', label: 'Cormorant Garamond (Classique Serif)' },
    { id: 'Playfair Display', label: 'Playfair Display (Élégant Serif)' },
    { id: 'Great Vibes', label: 'Great Vibes (Cursive Calligraphie)' },
    { id: 'Alex Brush', label: 'Alex Brush (Signature Cursive)' },
    { id: 'Montserrat', label: 'Montserrat (Moderne Sans)' },
    { id: 'Cinzel', label: 'Cinzel (Impérial Romain)' },
    { id: 'Dancing Script', label: 'Dancing Script (Manuscrit)' },
    { id: 'Pinyon Script', label: 'Pinyon Script (Cursive de Luxe)' },
    { id: 'Monsieur La Doulaise', label: 'Monsieur La Doulaise (Calligraphie Royale)' },
    { id: 'Italiana', label: 'Italiana (Saphir Minimaliste)' },
    { id: 'Bodoni Moda', label: 'Bodoni Moda (Haute Couture Serif)' },
    { id: 'Allura', label: 'Allura (Romantique Cursive)' },
    { id: 'Parisienne', label: 'Parisienne (Classique Paris)' },
    { id: 'Prata', label: 'Prata (Serif Moderne)' },
    { id: 'Sacramento', label: 'Sacramento (Rétro Chic)' },
    { id: 'Marcellus', label: 'Marcellus (Sleek Romain)' },
  ];

  const letterSpacings = [
    { id: 'normal', label: 'Normal' },
    { id: '0.05em', label: 'Serré (0.05em)' },
    { id: '0.1em', label: 'Espacé (0.1em)' },
    { id: '0.15em', label: 'Très espacé (0.15em)' },
    { id: '0.2em', label: 'Luxury (0.2em)' },
  ];


  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 bg-slate-200 rounded-lg w-1/3 animate-pulse" />
        <div className="h-64 bg-slate-200 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (editorOpen && canUseCustomTemplates) {
    return (
      <>
        {renderMockupImportModal()}
      <div className="space-y-6">
        {/* Load Google Fonts stylesheet */}
        <link 
          href="https://fonts.googleapis.com/css2?family=Alex+Brush&family=Cinzel:wght@400;600;700&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,400&family=Dancing+Script:wght@500;700&family=Great+Vibes&family=Montserrat:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Pinyon+Script&family=Monsieur+La+Doulaise&family=Italiana&family=Bodoni+Moda:ital,wght@0,400;0,700;1,400&family=Allura&family=Parisienne&family=Prata&family=Sacramento&family=Marcellus&display=swap" 
          rel="stylesheet" 
        />

        {/* Editor Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setEditorOpen(false)}
              className="p-2 hover:bg-slate-100 rounded-xl transition text-slate-600"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <input 
                type="text" 
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="text-xl font-extrabold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none px-1 transition"
                placeholder="Nom du modèle"
              />
              <div className="flex flex-wrap items-center gap-2 mt-0.5">
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Éditeur Visuel d'Invitation</p>
                {user?.role === 'SUPER_ADMIN' && (
                  <>
                    <span className="text-slate-300 text-xs">•</span>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Organisation :</span>
                    <select
                      value={selectedTenantId}
                      onChange={(e) => setSelectedTenantId(e.target.value)}
                      className="text-[11px] font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">Global (Tous / Public)</option>
                      {tenants.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </>
                )}
              </div>
            </div>
          </div>
          <button 
            onClick={handleSaveTemplate}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition shadow-md shadow-indigo-100 disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4.5 h-4.5 animate-spin" />
                Sauvegarde...
              </>
            ) : (
              <>
                <Save className="w-4.5 h-4.5" />
                Sauvegarder le modèle
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-3 text-sm">
            <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Editor Workspace */}
        <div className="grid lg:grid-cols-4 gap-8 items-start">
          {/* Left Toolbox */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-6 shadow-sm">
            {canUseMockupImport && (
            <div className="space-y-3 pb-4 border-b border-slate-100">
              <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Importer ma maquette
              </h3>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Image + palette automatique. Choisissez ensuite le mode : avec ou sans texte, ou OCR
                {canUseMockupOcr ? ' (Premium 2+).' : '.'}
              </p>
              {ocrProgress !== null && (
                <p className="text-[10px] text-indigo-600 font-bold">OCR en cours… {ocrProgress}%</p>
              )}
              <input
                ref={mockupEditorInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => handleMockupFileChange(e, false)}
              />
              <button
                type="button"
                disabled={mockupImporting || imageUploading}
                onClick={() => mockupEditorInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-indigo-200 rounded-2xl hover:border-indigo-500 hover:bg-indigo-50/30 text-indigo-700 font-bold text-xs transition cursor-pointer"
              >
                {mockupImporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                {mockupImporting ? 'Analyse en cours…' : 'Choisir une image'}
              </button>
              {importedPalette && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(['primary', 'secondary', 'accent', 'background'] as const).map((key) => (
                    <span
                      key={key}
                      className="inline-flex items-center gap-1 text-[9px] font-bold text-slate-500 uppercase"
                      title={importedPalette[key]}
                    >
                      <span
                        className="w-4 h-4 rounded-md border border-slate-200 shadow-sm"
                        style={{ backgroundColor: importedPalette[key] }}
                      />
                      {key.slice(0, 3)}
                    </span>
                  ))}
                </div>
              )}
            </div>
            )}

            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">Composants</h3>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => handleAddElement('text')}
                className="flex flex-col items-center gap-2 p-3.5 border border-slate-150 rounded-2xl hover:border-indigo-500 hover:bg-indigo-50/20 text-slate-700 hover:text-indigo-700 font-semibold text-xs transition"
              >
                <Type className="w-5 h-5" />
                <span>Texte</span>
              </button>
              <button 
                onClick={() => handleAddElement('button')}
                className="flex flex-col items-center gap-2 p-3.5 border border-slate-150 rounded-2xl hover:border-indigo-500 hover:bg-indigo-50/20 text-slate-700 hover:text-indigo-700 font-semibold text-xs transition"
              >
                <Columns className="w-5 h-5" />
                <span>Bouton</span>
              </button>
              <button 
                onClick={() => handleAddElement('image')}
                className="flex flex-col items-center gap-2 p-3.5 border border-slate-150 rounded-2xl hover:border-indigo-500 hover:bg-indigo-50/20 text-slate-700 hover:text-indigo-700 font-semibold text-xs transition"
              >
                <Image className="w-5 h-5" />
                <span>Image</span>
              </button>
              <button 
                onClick={() => handleAddElement('divider')}
                className="flex flex-col items-center gap-2 p-3.5 border border-slate-150 rounded-2xl hover:border-indigo-500 hover:bg-indigo-50/20 text-slate-700 hover:text-indigo-700 font-semibold text-xs transition"
              >
                <Palette className="w-5 h-5" />
                <span>Séparateur</span>
              </button>
              <button 
                onClick={() => handleAddElement('curve')}
                className="flex flex-col items-center gap-2 p-3.5 border border-slate-150 rounded-2xl hover:border-indigo-500 hover:bg-indigo-50/20 text-slate-700 hover:text-indigo-700 font-semibold text-xs transition"
              >
                <Spline className="w-5 h-5" />
                <span>Courbe</span>
              </button>
              <button 
                onClick={() => handleAddElement('triangle')}
                className="flex flex-col items-center gap-2 p-3.5 border border-slate-150 rounded-2xl hover:border-indigo-500 hover:bg-indigo-50/20 text-slate-700 hover:text-indigo-700 font-semibold text-xs transition"
              >
                <Triangle className="w-5 h-5" />
                <span>Triangle</span>
              </button>
              <button 
                onClick={() => handleAddElement('rsvp-block')}
                className="flex flex-col items-center gap-2 p-3.5 border border-slate-150 rounded-2xl hover:border-indigo-500 hover:bg-indigo-50/20 text-slate-700 hover:text-indigo-700 font-semibold text-xs transition col-span-2"
              >
                <CheckSquare className="w-5 h-5" />
                <span>Formulaire RSVP</span>
              </button>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <button 
                onClick={() => setSelectedElementId(null)}
                className="w-full flex items-center justify-center gap-2 p-2.5 border border-slate-200 rounded-xl hover:border-indigo-500 hover:bg-indigo-50/20 text-slate-600 hover:text-indigo-700 font-bold text-xs transition"
              >
                <Settings className="w-4 h-4" />
                Paramètres Globaux
              </button>
            </div>
          </div>

          {/* Center Canvas Preview */}
          <div className="lg:col-span-2 space-y-4">
            <div className="text-center space-y-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                <Eye className="w-3.5 h-3.5" /> Zone de prévisualisation de l'invitation
              </span>
              <p className="text-[10px] text-slate-400 font-semibold">
                {canvasWidth} × {canvasHeight} px
                {canvasSizePreset !== 'custom' ? ` · ${CANVAS_SIZE_PRESETS[canvasSizePreset as Exclude<CanvasSizePreset, 'custom'>]?.label.split(' (')[0] || canvasSizePreset}` : ' · Personnalisé'}
              </p>
            </div>
            
            <div className="flex justify-center">
            {/* Main Canvas Card */}
            <div 
              style={{
                ...getBackgroundStyle(bgType, bgColor, bgImageUrl, bgPattern),
                ...getCanvasStyle({ canvasSizePreset, canvasWidth, canvasHeight }),
              }}
              className={`border border-slate-200 p-8 shadow-md relative overflow-hidden transition-all duration-300 ${
                frameType === 'arch' ? 'rounded-t-[240px] border-t-2 border-x-2 border-amber-200/60' : 'rounded-3xl'
              }`}
            >
              {/* Double Border Frame */}
              {frameType === 'double-border' && (
                <>
                  <div className="absolute inset-3 border border-amber-500/20 rounded-2xl pointer-events-none" />
                  <div className="absolute inset-4 border border-amber-500/10 rounded-2xl pointer-events-none" />
                </>
              )}

              {/* Gold Border Frame */}
              {frameType === 'gold-border' && (
                <div className="absolute inset-3 border border-amber-500/30 rounded-2xl pointer-events-none shadow-[0_0_15px_rgba(197,160,89,0.05)]" />
              )}

              {/* Floral Wreath Frame */}
              {frameType === 'floral-wreath' && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-25">
                  <svg className="w-80 h-80 text-amber-600" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="0.5">
                    <circle cx="50" cy="50" r="35" strokeDasharray="2 2" />
                    {[...Array(16)].map((_, i) => {
                      const angle = (i * 22.5 * Math.PI) / 180;
                      const x = 50 + 35 * Math.cos(angle);
                      const y = 50 + 35 * Math.sin(angle);
                      return (
                        <g key={i} transform={`translate(${x}, ${y}) rotate(${i * 22.5 + 90})`}>
                          <path d="M0,0 C-3,-6 0,-10 3,-6 C6,-3 3,0 0,0" fill="currentColor" fillOpacity="0.3" />
                          <path d="M0,0 C3,-6 0,-10 -3,-6 C-6,-3 -3,0 0,0" fill="currentColor" fillOpacity="0.3" />
                        </g>
                      );
                    })}
                  </svg>
                </div>
              )}

              {/* Floral Arch Frame */}
              {frameType === 'floral-arch' && (
                <div className="absolute inset-0 pointer-events-none z-0">
                  <svg className="w-full h-full" viewBox="0 0 400 600" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <radialGradient id={`floral-arch-grad-${floralColor.replace('#', '')}`} cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor={lightenColor(floralColor, 40)} />
                        <stop offset="60%" stopColor={floralColor} />
                        <stop offset="100%" stopColor={darkenColor(floralColor, 40)} />
                      </radialGradient>
                    </defs>

                    {/* Main Arch branches */}
                    <path 
                      d="M15,500 Q15,80 200,30 T385,500" 
                      stroke={floralType === 'gold-leaves' ? '#d4af37' : '#3f492a'} 
                      strokeWidth="3" 
                      fill="none" 
                      opacity="0.4"
                    />
                    <path 
                      d="M30,500 Q30,100 200,50 T370,500" 
                      stroke={floralType === 'gold-leaves' ? '#b59410' : '#2d361e'} 
                      strokeWidth="2" 
                      fill="none" 
                      opacity="0.3"
                    />

                    {/* Generate dense flowers and leaves along the arch */}
                    {[...Array(floralDensity)].map((_, i) => {
                      const t = i / (floralDensity - 1);
                      // Parabolic arch formula:
                      // x goes from 15 to 385
                      const x = 15 + t * 370;
                      // y is a parabola: high in the middle (y=30), low at the ends (y=480)
                      const y = 30 + 4 * (480 - 30) * Math.pow(t - 0.5, 2);

                      // Deterministic pseudo-random offsets for organic look
                      const seed1 = Math.sin(i * 123.45);
                      const seed2 = Math.cos(i * 678.90);
                      const offsetX = seed1 * 15;
                      const offsetY = seed2 * 15;
                      const scale = 0.7 + Math.abs(seed1) * 0.6; // Scale between 0.7 and 1.3
                      const rotation = seed2 * 180; // Random rotation

                      const px = x + offsetX;
                      const py = y + offsetY;

                      // Skip some flowers near the bottom to make it cascade naturally (thinner at the bottom)
                      const isNearBottom = t < 0.1 || t > 0.9;
                      const skipFlower = isNearBottom && (i % 3 === 0);

                      return (
                        <g key={i} transform={`translate(${px}, ${py}) scale(${scale}) rotate(${rotation})`}>
                          {/* Leaves (always render leaves behind flowers) */}
                          {floralType !== 'gold-leaves' && (
                            <>
                              {/* Leaf 1 */}
                              <path 
                                d="M0,0 C-10,-15 -25,-10 -20,5 C-15,10 -5,5 0,0" 
                                fill={floralType === 'eucalyptus' ? '#7d8c5c' : '#4d7c0f'} 
                                opacity="0.85" 
                              />
                              {/* Leaf 2 */}
                              <path 
                                d="M0,0 C10,-15 25,-10 20,5 C15,10 5,5 0,0" 
                                fill={floralType === 'eucalyptus' ? '#92a173' : '#3f6212'} 
                                opacity="0.85" 
                              />
                            </>
                          )}

                          {/* Specific Flower Types */}
                          {!skipFlower && (
                            <>
                              {floralType === 'roses' && (
                                <>
                                  {/* Red Rose Petals */}
                                  <circle cx="0" cy="0" r="10" fill={`url(#floral-arch-grad-${floralColor.replace('#', '')})`} />
                                  <path d="M-6,-4 C-10,-10 -2,-12 -4,-6" fill={darkenColor(floralColor, 15)} opacity="0.9" />
                                  <path d="M6,-4 C10,-10 2,-12 4,-6" fill={darkenColor(floralColor, 15)} opacity="0.9" />
                                  <path d="M-6,4 C-10,10 -2,12 -4,6" fill={darkenColor(floralColor, 10)} opacity="0.9" />
                                  <path d="M6,4 C10,10 2,12 4,6" fill={darkenColor(floralColor, 10)} opacity="0.9" />
                                  {/* Rose Center */}
                                  <circle cx="0" cy="0" r="4" fill={darkenColor(floralColor, 30)} />
                                  <circle cx="0" cy="0" r="2" fill="#fef08a" opacity="0.8" />
                                </>
                              )}

                              {floralType === 'cherry-blossom' && (
                                <>
                                  {/* 5 Blossoms petals */}
                                  {[...Array(5)].map((_, j) => {
                                    const angle = (j * 72 * Math.PI) / 180;
                                    const rx = 8 * Math.cos(angle);
                                    const ry = 8 * Math.sin(angle);
                                    return (
                                      <path 
                                        key={j}
                                        d={`M0,0 C${rx * 1.5},${ry * 0.5} ${rx * 1.5},${ry * 1.5} 0,0`} 
                                        fill={floralColor} 
                                        stroke={darkenColor(floralColor, 20)}
                                        strokeWidth="0.5"
                                      />
                                    );
                                  })}
                                  <circle cx="0" cy="0" r="3" fill="#fef08a" />
                                  <circle cx="0" cy="0" r="1" fill="#ca8a04" />
                                </>
                              )}

                              {floralType === 'gold-leaves' && (
                                <>
                                  {/* Gold Leaf 1 */}
                                  <path 
                                    d="M0,0 C-8,-12 -18,-8 -15,4 C-12,8 -4,4 0,0" 
                                    fill={floralColor} 
                                    stroke={darkenColor(floralColor, 20)}
                                    strokeWidth="0.5"
                                  />
                                  {/* Gold Leaf 2 */}
                                  <path 
                                    d="M0,0 C8,-12 18,-8 15,4 C12,8 4,4 0,0" 
                                    fill={lightenColor(floralColor, 20)} 
                                    stroke={darkenColor(floralColor, 10)}
                                    strokeWidth="0.5"
                                  />
                                  {/* Gold Berries */}
                                  <circle cx="-2" cy="-6" r="2" fill="#ffffff" stroke={floralColor} strokeWidth="0.5" />
                                  <circle cx="2" cy="-6" r="1.5" fill="#fef3c7" stroke={floralColor} strokeWidth="0.5" />
                                </>
                              )}

                              {floralType === 'sunflowers' && (
                                <>
                                  {/* Sunflower Petals */}
                                  {[...Array(12)].map((_, j) => {
                                    const rot = j * 30;
                                    return (
                                      <ellipse 
                                        key={j}
                                        cx="0"
                                        cy="-8"
                                        rx="3"
                                        ry="7"
                                        fill={floralColor}
                                        transform={`rotate(${rot})`}
                                      />
                                    );
                                  })}
                                  {/* Center seed head */}
                                  <circle cx="0" cy="0" r="5" fill="#451a03" />
                                  <circle cx="0" cy="0" r="4" fill="#1c1917" stroke="#78350f" strokeWidth="0.5" />
                                </>
                              )}

                              {floralType === 'eucalyptus' && (
                                <>
                                  {/* Eucalyptus round leaves */}
                                  <circle cx="-5" cy="-5" r="8" fill={floralColor} opacity="0.9" />
                                  <circle cx="5" cy="5" r="7" fill={lightenColor(floralColor, 15)} opacity="0.9" />
                                  <circle cx="-2" cy="6" r="6" fill={darkenColor(floralColor, 15)} opacity="0.8" />
                                  {/* White berries */}
                                  <circle cx="4" cy="-4" r="2" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.5" />
                                  <circle cx="7" cy="-2" r="1.5" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="0.5" />
                                </>
                              )}
                            </>
                          )}
                        </g>
                      );
                    })}
                  </svg>
                </div>
              )}

              {/* Boho Dried Frame */}
              {frameType === 'boho-dried' && (
                <>
                  <div className="absolute top-0 left-0 w-32 h-32 pointer-events-none opacity-25 text-amber-800">
                    <svg className="w-full h-full" viewBox="0 0 100 100" fill="currentColor">
                      <path d="M0,0 C20,10 40,30 50,50 C40,45 25,35 0,30 Z" />
                      <path d="M0,0 C10,20 30,40 50,50 C45,40 35,25 30,0 Z" />
                      <path d="M0,0 C15,15 35,35 50,50 Z" stroke="currentColor" strokeWidth="1" />
                    </svg>
                  </div>
                  <div className="absolute bottom-0 right-0 w-32 h-32 pointer-events-none opacity-25 text-amber-800 transform rotate-180">
                    <svg className="w-full h-full" viewBox="0 0 100 100" fill="currentColor">
                      <path d="M0,0 C20,10 40,30 50,50 C40,45 25,35 0,30 Z" />
                      <path d="M0,0 C10,20 30,40 50,50 C45,40 35,25 30,0 Z" />
                      <path d="M0,0 C15,15 35,35 50,50 Z" stroke="currentColor" strokeWidth="1" />
                    </svg>
                  </div>
                </>
              )}

              {/* Gold Leaves Circle Frame */}
              {frameType === 'gold-leaves-circle' && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <svg className="w-80 h-80 text-amber-500" viewBox="0 0 100 100" fill="none">
                    <circle cx="50" cy="50" r="38" stroke="currentColor" strokeWidth="0.5" />
                    {[...Array(20)].map((_, i) => {
                      const angle = (i * 18 * Math.PI) / 180;
                      const x = 50 + 38 * Math.cos(angle);
                      const y = 50 + 38 * Math.sin(angle);
                      return (
                        <g key={i} transform={`translate(${x}, ${y}) rotate(${i * 18 + 45})`}>
                          <path d="M0,0 C2,-5 6,-7 8,-2 C6,3 2,3 0,0" fill="currentColor" fillOpacity="0.6" />
                          <circle cx="-2" cy="-2" r="1" fill="#fef3c7" stroke="currentColor" strokeWidth="0.1" />
                        </g>
                      );
                    })}
                  </svg>
                </div>
              )}

              {/* Minimal Leaves Frame */}
              {frameType === 'minimal-leaves' && (
                <>
                  <div className="absolute top-4 right-4 w-24 h-24 pointer-events-none opacity-30 text-emerald-800">
                    <svg className="w-full h-full" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1">
                      <path d="M10,90 Q50,50 90,10" />
                      <path d="M50,50 Q60,30 75,25 Q65,45 50,50" fill="currentColor" fillOpacity="0.2" />
                      <path d="M30,70 Q40,50 55,45 Q45,65 30,70" fill="currentColor" fillOpacity="0.2" />
                      <path d="M70,30 Q80,10 95,5 Q85,25 70,30" fill="currentColor" fillOpacity="0.2" />
                    </svg>
                  </div>
                  <div className="absolute bottom-4 left-4 w-24 h-24 pointer-events-none opacity-30 text-emerald-800 transform rotate-180">
                    <svg className="w-full h-full" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1">
                      <path d="M10,90 Q50,50 90,10" />
                      <path d="M50,50 Q60,30 75,25 Q65,45 50,50" fill="currentColor" fillOpacity="0.2" />
                      <path d="M30,70 Q40,50 55,45 Q45,65 30,70" fill="currentColor" fillOpacity="0.2" />
                      <path d="M70,30 Q80,10 95,5 Q85,25 70,30" fill="currentColor" fillOpacity="0.2" />
                    </svg>
                  </div>
                </>
              )}

              {/* Boho Botanical Corners */}
              {bgPattern === 'boho' && (
                <>
                  {/* Top-Left Branch */}
                  <svg className="absolute top-2 left-2 w-20 h-24 text-amber-800/15 pointer-events-none" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10,10 C30,15 60,35 70,70" />
                    <path d="M25,14 C22,22 18,28 12,30 C18,26 24,22 28,15" fill="currentColor" fillOpacity="0.1" />
                    <path d="M40,22 C38,32 32,40 24,44 C32,38 38,30 42,24" fill="currentColor" fillOpacity="0.1" />
                    <path d="M55,35 C52,45 45,52 36,56 C45,50 52,42 56,36" fill="currentColor" fillOpacity="0.1" />
                    <path d="M65,52 C62,62 55,68 46,72 C55,66 62,58 66,53" fill="currentColor" fillOpacity="0.1" />
                  </svg>
                  {/* Bottom-Right Branch */}
                  <svg className="absolute bottom-2 right-2 w-20 h-24 text-amber-800/15 pointer-events-none transform rotate-180" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10,10 C30,15 60,35 70,70" />
                    <path d="M25,14 C22,22 18,28 12,30 C18,26 24,22 28,15" fill="currentColor" fillOpacity="0.1" />
                    <path d="M40,22 C38,32 32,40 24,44 C32,38 38,30 42,24" fill="currentColor" fillOpacity="0.1" />
                    <path d="M55,35 C52,45 45,52 36,56 C45,50 52,42 56,36" fill="currentColor" fillOpacity="0.1" />
                    <path d="M65,52 C62,62 55,68 46,72 C55,66 62,58 66,53" fill="currentColor" fillOpacity="0.1" />
                  </svg>
                </>
              )}

              {/* Elements Grid Container */}
              <div className="relative z-10 flex flex-wrap gap-y-4 -mx-2">
                {canvasElements.length === 0 ? (
                  <div className="w-full text-center py-24 text-slate-400">
                    <Sparkles className="w-10 h-10 mx-auto mb-3 text-slate-300 animate-pulse" />
                    <p className="text-sm font-medium">Votre canevas est vide.</p>
                    <p className="text-xs mt-1">Ajoutez des composants à partir de la boîte à outils à gauche.</p>
                  </div>
                ) : (
                  canvasElements
                    .filter((el) => !(el.type === 'rsvp-block' && el.rsvpPlacement === 'outside'))
                    .map((el, index) => {
                    const isSelected = selectedElementId === el.id;
                    const widthClass = el.width === 'half' ? 'w-1/2 px-2' : el.width === 'third' ? 'w-1/3 px-2' : 'w-full px-2';
                    
                    return (
                      <div 
                        key={el.id}
                        onClick={(e) => { e.stopPropagation(); handleElementSelect(el.id); }}
                        className={`${widthClass} group transition cursor-pointer relative`}
                      >
                        <div className={`p-2.5 rounded-xl border transition ${isSelected ? 'border-indigo-500 bg-indigo-50/10 shadow-sm' : 'border-dashed border-transparent hover:border-slate-300/55'}`}>
                          {/* Element Controls (Delete & Reorder) */}
                          <div className="absolute -top-2.5 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                            {/* Move Up */}
                            {index > 0 && (
                              <button 
                                onClick={(e) => handleMoveElementUp(index, e)}
                                className="bg-slate-700 hover:bg-slate-800 text-white p-1 rounded-full shadow transition"
                                title="Déplacer vers le haut"
                              >
                                <ArrowUp className="w-3 h-3" />
                              </button>
                            )}
                            {/* Move Down */}
                            {index < canvasElements.length - 1 && (
                              <button 
                                onClick={(e) => handleMoveElementDown(index, e)}
                                className="bg-slate-700 hover:bg-slate-800 text-white p-1 rounded-full shadow transition"
                                title="Déplacer vers le bas"
                              >
                                <ArrowDown className="w-3 h-3" />
                              </button>
                            )}
                            {/* Delete */}
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDeleteElement(el.id); }}
                              className="bg-rose-500 hover:bg-rose-600 text-white p-1 rounded-full shadow transition"
                              title="Supprimer cet élément"
                            >
                              <XCircle className="w-3 h-3" />
                            </button>
                          </div>

                          {el.type === 'text' && (
                            <div 
                              style={{ 
                                color: el.color, 
                                fontSize: el.fontSize, 
                                textAlign: el.align,
                                fontFamily: el.fontFamily || 'Cormorant Garamond',
                                letterSpacing: el.letterSpacing || 'normal',
                                fontWeight: el.bold ? 'bold' : 'normal',
                                fontStyle: el.italic ? 'italic' : 'normal'
                              }}
                              className="leading-relaxed break-words"
                            >
                              {el.text}
                            </div>
                          )}

                          {el.type === 'button' && (
                            <div className={`flex justify-${el.align === 'left' ? 'start' : el.align === 'right' ? 'end' : 'center'}`}>
                              <button 
                                style={{ 
                                  backgroundColor: el.buttonStyle === 'outline' || el.buttonStyle === 'minimalist' ? 'transparent' : el.color, 
                                  color: el.buttonStyle === 'outline' || el.buttonStyle === 'minimalist' ? el.color : '#ffffff',
                                  borderColor: el.buttonStyle === 'outline' || el.buttonStyle === 'double-border' || el.buttonStyle === 'minimalist' ? el.color : 'transparent',
                                  fontSize: el.fontSize,
                                  fontFamily: el.fontFamily || 'Cormorant Garamond',
                                  letterSpacing: el.letterSpacing || 'normal',
                                  fontWeight: el.bold ? 'bold' : 'normal',
                                  fontStyle: el.italic ? 'italic' : 'normal'
                                }}
                                className={`pointer-events-none transition-all flex items-center gap-1.5 ${
                                  el.buttonStyle === 'outline' ? 'px-6 py-2.5 rounded-xl border-2' :
                                  el.buttonStyle === 'pill' ? 'px-6 py-2.5 rounded-full shadow-md' :
                                  el.buttonStyle === 'gold-glow' ? 'px-6 py-2.5 rounded-xl shadow-[0_0_15px_rgba(197,160,89,0.4)]' :
                                  el.buttonStyle === 'double-border' ? 'px-6 py-2 rounded-xl border-4 border-double' :
                                  el.buttonStyle === 'minimalist' ? 'px-2 py-1 border-b-2 rounded-none' :
                                  'px-6 py-2.5 rounded-xl shadow-md'
                                }`}
                              >
                                {el.text}
                                {el.buttonLink && (
                                  <span className="text-[10px] opacity-80" title={`Lien : ${el.buttonLink}`}>🔗</span>
                                )}
                              </button>
                            </div>
                          )}

                          {el.type === 'image' && (
                            <div className={`flex justify-${el.align === 'left' ? 'start' : el.align === 'right' ? 'end' : 'center'}`}>
                              {el.imageUrl ? (
                                <img 
                                  src={el.imageUrl} 
                                  alt="Invitation" 
                                  style={{ width: el.imageWidth || '100%', height: el.imageHeight || 'auto', objectFit: el.imageObjectFit || 'cover' }}
                                  className={`border border-slate-200 shadow-sm ${
                                    el.imageStyle === 'circle' ? 'rounded-full border-2 border-amber-200 aspect-square' :
                                    el.imageStyle === 'arch' ? 'rounded-t-[120px] border-2 border-amber-100' :
                                    el.imageStyle === 'oval' ? 'rounded-[50%] border-2 border-amber-100 aspect-[3/4]' :
                                    el.imageStyle === 'gold-frame' ? 'rounded-2xl border-4 border-amber-400/80 p-1 bg-white shadow-lg' :
                                    el.imageStyle === 'vintage' ? 'rounded-none border-8 border-amber-950/10 shadow-xl sepia contrast-[1.1]' :
                                    el.imageStyle === 'shadow-luxury' ? 'rounded-3xl border border-slate-100 shadow-[0_15px_30px_rgba(197,160,89,0.12)]' :
                                    'rounded-2xl'
                                  }`}
                                />
                              ) : (
                                <label 
                                  style={{ width: el.imageWidth || '100%', height: el.imageHeight || '150px' }}
                                  className={`bg-slate-50 border border-slate-200 flex flex-col items-center justify-center text-slate-400 gap-2 p-4 cursor-pointer hover:bg-slate-100/50 transition ${
                                    el.imageStyle === 'circle' ? 'rounded-full border-2 border-amber-200 aspect-square' :
                                    el.imageStyle === 'arch' ? 'rounded-t-[120px] border-2 border-amber-100' :
                                    el.imageStyle === 'oval' ? 'rounded-[50%] border-2 border-amber-100 aspect-[3/4]' :
                                    el.imageStyle === 'gold-frame' ? 'rounded-2xl border-4 border-amber-400/80 p-1 bg-white shadow-lg' :
                                    el.imageStyle === 'vintage' ? 'rounded-none border-8 border-amber-950/10 shadow-xl sepia contrast-[1.1]' :
                                    el.imageStyle === 'shadow-luxury' ? 'rounded-3xl border border-slate-100 shadow-[0_15px_30px_rgba(197,160,89,0.12)]' :
                                    'rounded-2xl'
                                  }`}
                                >
                                  <input 
                                    type="file" 
                                    accept="image/*"
                                    disabled={imageUploading}
                                    onChange={async (e) => {
                                      e.stopPropagation();
                                      const file = e.target.files?.[0];
                                      e.target.value = '';
                                      if (!file) return;
                                      try {
                                        const url = await uploadToCloudinary(file);
                                        setCanvasElements(canvasElements.map(item => {
                                          if (item.id === el.id) {
                                            return { ...item, imageUrl: url };
                                          }
                                          return item;
                                        }));
                                        handleElementSelect(el.id);
                                        setElImageUrl(url);
                                      } catch (err: any) {
                                        setError(err.message || 'Échec upload image.');
                                      }
                                    }}
                                    className="hidden"
                                  />
                                  {imageUploading ? (
                                    <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                                  ) : (
                                    <Image className="w-8 h-8 text-slate-300" />
                                  )}
                                  <span className="text-xs font-semibold">{el.text}</span>
                                  <span className="text-[10px] text-indigo-500 font-bold">Cliquez pour importer</span>
                                </label>
                              )}
                            </div>
                          )}

                          {el.type === 'divider' && (
                            <div className={`flex items-center justify-center gap-3 py-2 text-${el.align}`}>
                              {el.dividerStyle === 'solid' && (
                                <div className="w-full border-t" style={{ borderColor: el.color }} />
                              )}
                              {el.dividerStyle === 'dashed' && (
                                <div className="w-full border-t border-dashed" style={{ borderColor: el.color }} />
                              )}
                              {el.dividerStyle === 'ornament-flower' && (
                                <>
                                  <div className="flex-1 border-t" style={{ borderColor: el.color }} />
                                  <span style={{ color: el.color }} className="text-sm select-none">❀</span>
                                  <div className="flex-1 border-t" style={{ borderColor: el.color }} />
                                </>
                              )}
                              {el.dividerStyle === 'ornament-diamond' && (
                                <>
                                  <div className="flex-1 border-t" style={{ borderColor: el.color }} />
                                  <span style={{ color: el.color }} className="text-xs tracking-widest select-none">✦ ❖ ✦</span>
                                  <div className="flex-1 border-t" style={{ borderColor: el.color }} />
                                </>
                              )}
                              {el.dividerStyle === 'ornament-star' && (
                                <>
                                  <div className="flex-1 border-t" style={{ borderColor: el.color }} />
                                  <span style={{ color: el.color }} className="text-sm select-none">✦</span>
                                  <div className="flex-1 border-t" style={{ borderColor: el.color }} />
                                </>
                              )}
                              {el.dividerStyle === 'ornament-leaves' && (
                                <>
                                  <div className="flex-1 border-t" style={{ borderColor: el.color }} />
                                  <span style={{ color: el.color }} className="text-sm select-none">🌿 ❀ 🌿</span>
                                  <div className="flex-1 border-t" style={{ borderColor: el.color }} />
                                </>
                              )}
                              {el.dividerStyle === 'ornament-lace' && (
                                <>
                                  <div className="flex-1 border-t" style={{ borderColor: el.color }} />
                                  <span style={{ color: el.color }} className="text-xs tracking-widest select-none">⚜ ⚜ ⚜</span>
                                  <div className="flex-1 border-t" style={{ borderColor: el.color }} />
                                </>
                              )}
                            </div>
                          )}

                          {el.type === 'curve' && (
                            <div className={`flex justify-${el.align === 'left' ? 'start' : el.align === 'right' ? 'end' : 'center'} py-1`}>
                              <svg className="w-full max-w-[300px]" height="30" viewBox="0 0 300 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path 
                                  d={
                                    el.curveStyle === 'arc' ? "M10,25 Q 150,2, 290,25" :
                                    el.curveStyle === 'flourish-1' ? "M30,15 C70,5 110,25 150,15 C190,5 230,25 270,15 M30,15 C20,15 15,10 20,5 C25,0 35,10 30,15 M270,15 C280,15 285,10 280,5 C275,0 265,10 270,15" :
                                    el.curveStyle === 'flourish-2' ? "M10,15 L110,15 C120,15 125,5 135,5 C145,5 145,25 150,25 C155,25 155,5 165,5 C175,5 180,15 190,15 L290,15" :
                                    el.curveStyle === 'spiral' ? "M150,15 C120,15 100,25 80,25 C60,25 50,15 60,10 C70,5 80,20 70,22 C65,23 60,15 65,13 M150,15 C180,15 200,25 220,25 C240,25 250,15 240,10 C230,5 220,20 230,22 C235,23 240,15 235,13" :
                                    el.curveStyle === 'infinity' ? "M110,15 C110,25 130,25 150,15 C170,5 190,5 190,15 C190,25 170,25 150,15 C130,5 110,5 110,15 Z" :
                                    "M0 15 Q 75 0, 150 15 T 300 15"
                                  } 
                                  stroke={el.color || '#cbd5e1'} 
                                  strokeWidth={el.strokeWidth || '3px'} 
                                  fill="none" 
                                />
                              </svg>
                            </div>
                          )}

                          {el.type === 'triangle' && (
                            <div className={`flex justify-${el.align === 'left' ? 'start' : el.align === 'right' ? 'end' : 'center'} py-1`}>
                              <svg 
                                width={el.shapeSize || '60px'} 
                                height={el.shapeSize || '60px'} 
                                viewBox="0 0 100 100" 
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <polygon points="50,15 90,85 10,85" fill={el.color || '#cbd5e1'} />
                              </svg>
                            </div>
                          )}

                          {el.type === 'rsvp-block' && (
                            <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-5 space-y-4 pointer-events-none shadow-sm">
                              <div className="font-bold text-slate-800 text-center text-sm">{el.text}</div>
                              
                              {/* Render customizable fields preview */}
                              {el.rsvpFields && el.rsvpFields.length > 0 && (
                                <div className="space-y-3 border-t border-b border-slate-200/60 py-3 text-left">
                                  {el.rsvpFields.map((field) => (
                                    <div key={field.id} className="space-y-1">
                                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                        {field.label} {field.required && <span className="text-rose-500">*</span>}
                                      </label>
                                      {field.type === 'text' && (
                                        <div className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-400">
                                          Zone de texte
                                        </div>
                                      )}
                                      {field.type === 'select' && (
                                        <div className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-400 flex justify-between items-center">
                                          <span>{field.options ? field.options.split(',')[0].trim() : 'Option 1'}</span>
                                          <span className="text-[10px] text-slate-300">▼</span>
                                        </div>
                                      )}
                                      {field.type === 'checkbox' && (
                                        <div className="flex items-center gap-2">
                                          <div className="w-4 h-4 border border-slate-200 bg-white rounded" />
                                          <span className="text-xs text-slate-500 font-medium">{field.label}</span>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}

                              <div className="flex gap-2 justify-center">
                                <div className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600">Je serai présent</div>
                                <div className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600">Je serai absent</div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            </div>

            {canvasElements.some((el) => el.type === 'rsvp-block' && el.rsvpPlacement === 'outside') && (
              <div className="mt-4 space-y-3">
                <p className="text-center text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                  Formulaire RSVP — zone externe (sous l&apos;invitation)
                </p>
                {canvasElements
                  .filter((el) => el.type === 'rsvp-block' && el.rsvpPlacement === 'outside')
                  .map((el) => (
                    <div
                      key={el.id}
                      onClick={(e) => { e.stopPropagation(); handleElementSelect(el.id); }}
                      className={`rounded-2xl border-2 border-dashed p-5 cursor-pointer transition ${
                        selectedElementId === el.id
                          ? 'border-indigo-500 bg-indigo-50/30 shadow-md'
                          : 'border-indigo-200 bg-white hover:border-indigo-400'
                      }`}
                      style={{ maxWidth: `${canvasWidth}px`, width: '100%' }}
                    >
                      <div className="text-xs font-bold text-indigo-700 text-center mb-3">{el.text || 'Confirmer votre présence'}</div>
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className="py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-[10px] font-bold text-emerald-700 text-center">Oui</div>
                        <div className="py-2 rounded-xl border border-slate-200 text-[10px] font-bold text-slate-500 text-center">Non</div>
                      </div>
                      {el.rsvpFields && el.rsvpFields.length > 0 && (
                        <p className="text-[9px] text-slate-400 text-center">
                          {el.rsvpFields.length} champ{el.rsvpFields.length > 1 ? 's' : ''} personnalisé{el.rsvpFields.length > 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Right Properties Panel */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-6 shadow-sm">
            {selectedElementId ? (
              // Element Properties Panel
              <div className="space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Propriétés de l'élément</h3>
                  <button 
                    onClick={() => setSelectedElementId(null)}
                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-2 py-1 rounded-lg transition flex items-center gap-1"
                  >
                    <Settings className="w-3 h-3" /> Global
                  </button>
                </div>

                {/* Text input */}
                {['text', 'button', 'image', 'rsvp-block'].includes(canvasElements.find(e => e.id === selectedElementId)?.type || '') && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        {canvasElements.find(e => e.id === selectedElementId)?.type === 'image' ? "Texte alternatif d'image" : 
                         canvasElements.find(e => e.id === selectedElementId)?.type === 'rsvp-block' ? "Titre du bloc RSVP" : 
                         "Contenu du texte"}
                      </label>
                      {canvasElements.find(e => e.id === selectedElementId)?.type === 'text' && (
                        <span className="text-[9px] text-indigo-600 font-bold uppercase tracking-wider">
                          Variables: {"{{firstName}}"}, {"{{location}}"}
                        </span>
                      )}
                    </div>
                    <textarea 
                      value={elText}
                      onChange={(e) => handlePropertyChange('text', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500 transition h-20 resize-none"
                      placeholder={canvasElements.find(e => e.id === selectedElementId)?.type === 'text' ? "Ex: Vous êtes invité au {{title}} à {{location}}..." : ""}
                    />
                  </div>
                )}

                {/* Width selection (for layout grid) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Largeur de l'élément</label>
                  <select 
                    value={elWidth}
                    onChange={(e) => handlePropertyChange('width', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500 transition"
                  >
                    <option value="full">Pleine largeur (100%)</option>
                    <option value="half">Demi-largeur (50%)</option>
                    <option value="third">Un tiers (33%)</option>
                  </select>
                </div>

                {/* Font Family Selection */}
                {['text', 'button'].includes(canvasElements.find(e => e.id === selectedElementId)?.type || '') && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Police de caractères</label>
                    <select 
                      value={elFontFamily}
                      onChange={(e) => handlePropertyChange('fontFamily', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500 transition"
                    >
                      {fontFamilies.map(font => (
                        <option key={font.id} value={font.id}>{font.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Letter Spacing */}
                {['text', 'button'].includes(canvasElements.find(e => e.id === selectedElementId)?.type || '') && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Espacement des lettres</label>
                    <select 
                      value={elLetterSpacing}
                      onChange={(e) => handlePropertyChange('letterSpacing', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500 transition"
                    >
                      {letterSpacings.map(spacing => (
                        <option key={spacing.id} value={spacing.id}>{spacing.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Bold / Italic Toggles */}
                {['text', 'button'].includes(canvasElements.find(e => e.id === selectedElementId)?.type || '') && (
                  <div className="flex gap-4 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 font-semibold select-none">
                      <input 
                        type="checkbox" 
                        checked={elBold}
                        onChange={(e) => handlePropertyChange('bold', e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      Gras
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 font-semibold select-none">
                      <input 
                        type="checkbox" 
                        checked={elItalic}
                        onChange={(e) => handlePropertyChange('italic', e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      Italique
                    </label>
                  </div>
                )}

                {/* Divider style selection */}
                {canvasElements.find(e => e.id === selectedElementId)?.type === 'divider' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Style du séparateur</label>
                    <select 
                      value={elDividerStyle}
                      onChange={(e) => handlePropertyChange('dividerStyle', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500 transition"
                    >
                      <option value="solid">Ligne continue</option>
                      <option value="dashed">Ligne pointillée</option>
                      <option value="ornament-flower">Ornement Fleur (❀)</option>
                      <option value="ornament-diamond">Ornement Losange (✦ ❖ ✦)</option>
                      <option value="ornament-star">Ornement Étoile (✦)</option>
                      <option value="ornament-leaves">Ornement Feuillage (🌿 ❀ 🌿)</option>
                      <option value="ornament-lace">Ornement Dentelle (⚜ ⚜ ⚜)</option>
                    </select>
                  </div>
                )}

                {/* Button style selection */}
                {canvasElements.find(e => e.id === selectedElementId)?.type === 'button' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Style de bouton</label>
                    <select 
                      value={elButtonStyle}
                      onChange={(e) => handlePropertyChange('buttonStyle', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500 transition"
                    >
                      <option value="filled">Plein (Luxe)</option>
                      <option value="outline">Contour élégant</option>
                      <option value="pill">Bords ronds (Pilule)</option>
                      <option value="gold-glow">Effet or lumineux</option>
                      <option value="double-border">Double bordure fine</option>
                      <option value="minimalist">Minimaliste souligné</option>
                    </select>
                  </div>
                )}

                {/* Button link input */}
                {canvasElements.find(e => e.id === selectedElementId)?.type === 'button' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Lien de redirection (URL)</label>
                    <input 
                      type="text"
                      value={elButtonLink}
                      onChange={(e) => handlePropertyChange('buttonLink', e.target.value)}
                      placeholder="ex: https://g.co/maps/... ou {{rsvpLink}}"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500 transition"
                    />
                    <p className="text-[10px] text-slate-400">
                      Lien vers lequel rediriger l'invité au clic (ex: liste de mariage, itinéraire GPS, etc.). Laissez vide si le bouton n'a pas de lien.
                    </p>
                  </div>
                )}

                {/* Curve style selection */}
                {canvasElements.find(e => e.id === selectedElementId)?.type === 'curve' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Style de la courbe</label>
                    <select 
                      value={elCurveStyle}
                      onChange={(e) => handlePropertyChange('curveStyle', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500 transition"
                    >
                      <option value="wave">Vague douce</option>
                      <option value="arc">Arche fine</option>
                      <option value="flourish-1">Volute florale élégante</option>
                      <option value="flourish-2">Ornement baroque</option>
                      <option value="spiral">Spirale délicate</option>
                      <option value="infinity">Nœud de l'infini</option>
                    </select>
                  </div>
                )}

                {/* Image style selection */}
                {canvasElements.find(e => e.id === selectedElementId)?.type === 'image' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Style d'image</label>
                    <select 
                      value={elImageStyle}
                      onChange={(e) => handlePropertyChange('imageStyle', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500 transition"
                    >
                      <option value="rounded">Bords arrondis standard</option>
                      <option value="circle">Cercle parfait</option>
                      <option value="arch">Arche royale</option>
                      <option value="oval">Ovale élégant</option>
                      <option value="gold-frame">Cadre doré fin</option>
                      <option value="vintage">Effet sépia vintage</option>
                      <option value="shadow-luxury">Ombre douce de luxe</option>
                    </select>
                  </div>
                )}

                {/* Image-specific properties */}
                {canvasElements.find(e => e.id === selectedElementId)?.type === 'image' && (
                  <div className="space-y-4 border-t border-slate-100 pt-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Importer une image (Cloudinary)</label>
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ou URL de l'image externe</label>
                      <input 
                        type="text" 
                        value={elImageUrl}
                        onChange={(e) => handlePropertyChange('imageUrl', e.target.value)}
                        placeholder="https://images.unsplash.com/..."
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500 transition"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Largeur</label>
                        <input 
                          type="text" 
                          value={elImageWidth}
                          onChange={(e) => handlePropertyChange('imageWidth', e.target.value)}
                          placeholder="100% ou 200px"
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500 transition"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hauteur</label>
                        <input 
                          type="text" 
                          value={elImageHeight}
                          onChange={(e) => handlePropertyChange('imageHeight', e.target.value)}
                          placeholder="200px ou auto"
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500 transition"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mode d'affichage</label>
                      <select 
                        value={elImageObjectFit}
                        onChange={(e) => handlePropertyChange('imageObjectFit', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500 transition"
                      >
                        <option value="cover">Remplir l'espace (Cover)</option>
                        <option value="contain">Afficher en entier (Contain)</option>
                        <option value="fill">Étirer (Fill)</option>
                        <option value="none">Taille réelle (None)</option>
                      </select>
                    </div>

                    {elImageUrl && (
                      <button
                        type="button"
                        onClick={() => handleOpenCropper('element')}
                        className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs transition border border-indigo-100 shadow-sm"
                      >
                        <Crop className="w-3.5 h-3.5" />
                        Rogner / Recadrer l'image
                      </button>
                    )}
                  </div>
                )}

                {/* Curve-specific properties */}
                {canvasElements.find(e => e.id === selectedElementId)?.type === 'curve' && (
                  <div className="space-y-1.5 border-t border-slate-100 pt-4">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Épaisseur du trait</label>
                    <select 
                      value={elStrokeWidth}
                      onChange={(e) => handlePropertyChange('strokeWidth', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500 transition"
                    >
                      <option value="1px">Fin (1px)</option>
                      <option value="2px">Normal (2px)</option>
                      <option value="3px">Moyen (3px)</option>
                      <option value="5px">Épais (5px)</option>
                      <option value="8px">Très épais (8px)</option>
                    </select>
                  </div>
                )}

                {/* Triangle-specific properties */}
                {canvasElements.find(e => e.id === selectedElementId)?.type === 'triangle' && (
                  <div className="space-y-1.5 border-t border-slate-100 pt-4">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Taille du triangle</label>
                    <select 
                      value={elShapeSize}
                      onChange={(e) => handlePropertyChange('shapeSize', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500 transition"
                    >
                      <option value="30px">Petit (30px)</option>
                      <option value="45px">Moyen (45px)</option>
                      <option value="60px">Grand (60px)</option>
                      <option value="80px">Très grand (80px)</option>
                      <option value="120px">Géant (120px)</option>
                    </select>
                  </div>
                )}

                {/* RSVP placement */}
                {canvasElements.find(e => e.id === selectedElementId)?.type === 'rsvp-block' && (
                  <div className="space-y-2 border-t border-slate-100 pt-4">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Emplacement du formulaire</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'inline' as const, label: 'Dans l\'invitation', hint: 'Intégré au design' },
                        { id: 'outside' as const, label: 'Sous l\'invitation', hint: 'Plus visible' },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handlePropertyChange('rsvpPlacement', opt.id)}
                          className={`py-2.5 px-2 border rounded-xl text-left transition ${
                            elRsvpPlacement === opt.id
                              ? 'border-indigo-600 bg-indigo-50 text-indigo-800'
                              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <span className="block text-[11px] font-bold">{opt.label}</span>
                          <span className="block text-[9px] opacity-70 mt-0.5">{opt.hint}</span>
                        </button>
                      ))}
                    </div>
                    {elRsvpPlacement === 'outside' && (
                      <p className="text-[10px] text-indigo-600 leading-relaxed">
                        Le formulaire s&apos;affichera dans un panneau dédié sous la carte d&apos;invitation, pour une meilleure lisibilité sur mobile.
                      </p>
                    )}
                  </div>
                )}

                {/* Customizable RSVP Fields Properties */}
                {canvasElements.find(e => e.id === selectedElementId)?.type === 'rsvp-block' && (
                  <div className="space-y-4 border-t border-slate-100 pt-4">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Champs du formulaire</label>
                      <button 
                        type="button"
                        onClick={handleAddRsvpField}
                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded-lg transition"
                      >
                        <Plus className="w-3 h-3" /> Ajouter un champ
                      </button>
                    </div>

                    <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                      {elRsvpFields.map((field, index) => (
                        <div key={field.id} className="p-3 bg-slate-50 border border-slate-150 rounded-xl space-y-2.5 relative">
                          <button 
                            type="button"
                            onClick={() => handleDeleteRsvpField(field.id)}
                            className="absolute top-2 right-2 text-slate-400 hover:text-rose-600 transition"
                            title="Supprimer ce champ"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>

                          <div className="text-[10px] font-bold text-slate-400">Champ #{index + 1}</div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Libellé / Question</label>
                            <input 
                              type="text" 
                              value={field.label}
                              onChange={(e) => handleUpdateRsvpField(field.id, 'label', e.target.value)}
                              className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-500 transition"
                              required
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-500 uppercase">Type</label>
                              <select 
                                value={field.type}
                                onChange={(e) => handleUpdateRsvpField(field.id, 'type', e.target.value)}
                                className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-500 transition"
                              >
                                {Object.entries(RSVP_FIELD_TYPE_LABELS).map(([value, label]) => (
                                  <option key={value} value={value}>{label}</option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-500 uppercase">Catégorie analyse</label>
                              <select
                                value={field.category || 'custom'}
                                onChange={(e) => handleUpdateRsvpField(field.id, 'category', e.target.value)}
                                className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-500 transition"
                              >
                                {RSVP_FIELD_CATEGORIES.map((cat) => (
                                  <option key={cat.id} value={cat.id}>{cat.label}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Clé analytique (CSV / stats)</label>
                            <input
                              type="text"
                              value={field.analyticsKey || ''}
                              onChange={(e) => handleUpdateRsvpField(field.id, 'analyticsKey', slugifyAnalyticsKey(e.target.value))}
                              placeholder="ex. choix_menu"
                              className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-indigo-500 transition"
                            />
                            <p className="text-[9px] text-slate-400">Identifiant stable pour exports et graphiques.</p>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-500 uppercase">Placeholder</label>
                              <input
                                type="text"
                                value={field.placeholder || ''}
                                onChange={(e) => handleUpdateRsvpField(field.id, 'placeholder', e.target.value)}
                                className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-500 transition"
                              />
                            </div>
                            <div className="flex items-end pb-1.5">
                              <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-600 font-semibold select-none">
                                <input 
                                  type="checkbox" 
                                  checked={field.required}
                                  onChange={(e) => handleUpdateRsvpField(field.id, 'required', e.target.checked)}
                                  className="rounded text-indigo-600 focus:ring-indigo-500"
                                />
                                Requis
                              </label>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Texte d&apos;aide (optionnel)</label>
                            <input
                              type="text"
                              value={field.helpText || ''}
                              onChange={(e) => handleUpdateRsvpField(field.id, 'helpText', e.target.value)}
                              placeholder="Ex. : Indiquez vos restrictions alimentaires"
                              className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-500 transition"
                            />
                          </div>

                          {(field.type === 'select' || field.type === 'radio') && (
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-500 uppercase">Options (séparées par virgules)</label>
                              <input 
                                type="text" 
                                value={field.options || ''}
                                onChange={(e) => handleUpdateRsvpField(field.id, 'options', e.target.value)}
                                placeholder="Option 1, Option 2, Option 3"
                                className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-500 transition"
                                required
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Color input */}
                <div className="space-y-2 border-t border-slate-100 pt-4">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    {canvasElements.find(e => e.id === selectedElementId)?.type === 'button' ? "Couleur du bouton" : 
                     canvasElements.find(e => e.id === selectedElementId)?.type === 'curve' ? "Couleur du trait" : 
                     canvasElements.find(e => e.id === selectedElementId)?.type === 'triangle' ? "Couleur de remplissage" : 
                     "Couleur du texte"}
                  </label>
                  <div className="flex gap-2">
                    <input 
                      type="color" 
                      value={elColor.startsWith('#') ? elColor : '#4f46e5'}
                      onChange={(e) => handlePropertyChange('color', e.target.value)}
                      className="w-8 h-8 rounded-lg border border-slate-200 cursor-pointer overflow-hidden p-0"
                    />
                    <input 
                      type="text" 
                      value={elColor}
                      onChange={(e) => handlePropertyChange('color', e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500 transition font-mono"
                    />
                  </div>

                  {/* Luxury Predefined Palette */}
                  <div className="space-y-1 pt-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Palette de Luxe :</span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { hex: '#c5a059', name: 'Or Royal' },
                        { hex: '#7d8c5c', name: 'Vert Sauge' },
                        { hex: '#6b1d2f', name: 'Bourgogne' },
                        { hex: '#1d2d44', name: 'Bleu Nuit' },
                        { hex: '#e8c5c8', name: 'Rose Poudré' },
                        { hex: '#b05a47', name: 'Terracotta' },
                        { hex: '#8c6239', name: 'Bronze' },
                        { hex: '#1e293b', name: 'Ardoise' },
                        { hex: '#faf6f0', name: 'Ivoire' },
                      ].map((c) => (
                        <button
                          key={c.hex}
                          type="button"
                          onClick={() => handlePropertyChange('color', c.hex)}
                          className="w-6 h-6 rounded-full border border-slate-200 shadow-sm transition hover:scale-110 relative group"
                          style={{ backgroundColor: c.hex }}
                          title={c.name}
                        >
                          <span className="absolute bottom-full left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] px-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-30">
                            {c.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Font size (only for text/button) */}
                {['text', 'button'].includes(canvasElements.find(e => e.id === selectedElementId)?.type || '') && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Taille de police</label>
                    <select 
                      value={elFontSize}
                      onChange={(e) => handlePropertyChange('fontSize', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500 transition"
                    >
                      <option value="12px">Petite (12px)</option>
                      <option value="14px">Normale (14px)</option>
                      <option value="16px">Moyenne (16px)</option>
                      <option value="20px">Grande (20px)</option>
                      <option value="24px">Titre 3 (24px)</option>
                      <option value="28px">Titre 2 (28px)</option>
                      <option value="32px">Titre 1 (32px)</option>
                      <option value="36px">Titre XL (36px)</option>
                    </select>
                  </div>
                )}

                {/* Alignment */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Alignement</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['left', 'center', 'right'].map((align) => (
                      <button
                        key={align}
                        type="button"
                        onClick={() => handlePropertyChange('align', align)}
                        className={`py-1.5 border rounded-lg text-xs font-bold capitalize transition ${elAlign === align ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                      >
                        {align === 'left' ? 'gauche' : align === 'right' ? 'droite' : 'centré'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              // Global Template Properties Panel (shown when no element is selected)
              <div className="space-y-5">
                <div className="border-b border-slate-100 pb-2">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Palette className="w-4 h-4 text-indigo-600" /> Paramètres Globaux
                  </h3>
                </div>

                {user?.role === 'SUPER_ADMIN' && !selectedTenantId && (
                  <div className="space-y-3 p-3 rounded-2xl border border-emerald-100 bg-emerald-50/40">
                    <h4 className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5" />
                      Vitrine landing page
                    </h4>
                    <label className="flex items-center justify-between gap-3 cursor-pointer">
                      <span className="text-xs font-semibold text-slate-700">Afficher sur la landing page publique</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={showOnLanding}
                        onClick={() => setShowOnLanding((v) => !v)}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors ${showOnLanding ? 'bg-emerald-600' : 'bg-slate-200'}`}
                      >
                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${showOnLanding ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </label>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Catégorie vitrine</label>
                      <select
                        value={landingCategory}
                        onChange={(e) => setLandingCategory(e.target.value as 'private' | 'corporate' | 'casual')}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="private">Privé & Célébrations</option>
                        <option value="corporate">Professionnel & Gala</option>
                        <option value="casual">Moderne & Cocktail</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Description courte</label>
                      <textarea
                        value={landingDescription}
                        onChange={(e) => setLandingDescription(e.target.value)}
                        rows={3}
                        maxLength={220}
                        placeholder="Ex. : Tons pastel et typographie serif pour un grand jour raffiné."
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
                      />
                      <p className="text-[9px] text-slate-400 text-right">{landingDescription.length}/220</p>
                    </div>
                  </div>
                )}

                {/* Canvas dimensions */}
                <div className="space-y-3 p-3 rounded-2xl border border-indigo-100 bg-indigo-50/30">
                  <h4 className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Layout className="w-3.5 h-3.5" />
                    Taille du modèle
                  </h4>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Format prédéfini</label>
                    <select
                      value={canvasSizePreset}
                      onChange={(e) => handleCanvasPresetChange(e.target.value as CanvasSizePreset)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500"
                    >
                      {Object.entries(CANVAS_SIZE_PRESETS).map(([key, preset]) => (
                        <option key={key} value={key}>{preset.label}</option>
                      ))}
                      <option value="custom">Personnalisé</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Largeur (px)</label>
                      <input
                        type="number"
                        min={280}
                        max={1200}
                        value={canvasWidth}
                        onChange={(e) => {
                          setCanvasSizePreset('custom');
                          setCanvasWidth(Number(e.target.value) || CANVAS_SIZE_PRESETS.standard.width);
                        }}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Hauteur min. (px)</label>
                      <input
                        type="number"
                        min={400}
                        max={1600}
                        value={canvasHeight}
                        onChange={(e) => {
                          setCanvasSizePreset('custom');
                          setCanvasHeight(Number(e.target.value) || CANVAS_SIZE_PRESETS.standard.height);
                        }}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                  <p className="text-[9px] text-slate-400 leading-relaxed">
                    Cette taille s&apos;applique à l&apos;aperçu, à l&apos;invitation RSVP et aux cartes modèles.
                  </p>
                </div>

                {/* Background Type */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Type d'arrière-plan</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'color', label: 'Couleur' },
                      { id: 'pattern', label: 'Texture' },
                      { id: 'image', label: 'Image' }
                    ].map((type) => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setBgType(type.id as any)}
                        className={`py-1.5 border rounded-lg text-[10px] font-bold transition ${bgType === type.id ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Background Color Picker (For color and pattern types) */}
                {bgType !== 'image' && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Couleur de fond</label>
                    <div className="flex gap-2">
                      <input 
                        type="color" 
                        value={bgColor.startsWith('#') ? bgColor : '#faf8f5'}
                        onChange={(e) => setBgColor(e.target.value)}
                        className="w-8 h-8 rounded-lg border border-slate-200 cursor-pointer overflow-hidden p-0"
                      />
                      <input 
                        type="text" 
                        value={bgColor}
                        onChange={(e) => setBgColor(e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500 transition font-mono"
                      />
                    </div>

                    {/* Luxury Predefined Background Palette */}
                    <div className="space-y-1 pt-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fonds Recommandés :</span>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { hex: '#faf8f5', name: 'Blanc Pur' },
                          { hex: '#faf6f0', name: 'Ivoire Doux' },
                          { hex: '#f4f1ea', name: 'Lin Naturel' },
                          { hex: '#f3e0da', name: 'Rose Poudré' },
                          { hex: '#e2e8f0', name: 'Gris Perle' },
                          { hex: '#7d8c5c', name: 'Vert Sauge' },
                          { hex: '#58111a', name: 'Bourgogne' },
                          { hex: '#1d2d44', name: 'Bleu Nuit' },
                          { hex: '#1e1b18', name: 'Noir Ébène' },
                        ].map((c) => (
                          <button
                            key={c.hex}
                            type="button"
                            onClick={() => setBgColor(c.hex)}
                            className="w-6 h-6 rounded-full border border-slate-200 shadow-sm transition hover:scale-110 relative group"
                            style={{ backgroundColor: c.hex }}
                            title={c.name}
                          >
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] px-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-30">
                              {c.name}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Pattern Selector */}
                {bgType === 'pattern' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Style de Texture</label>
                    <select 
                      value={bgPattern}
                      onChange={(e) => setBgPattern(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500 transition"
                    >
                      <option value="none">Aucune texture</option>
                      <option value="paper">Papier grainé de luxe (Hassan Raza)</option>
                      <option value="watercolor">Aquarelle artistique (Ananya & Rishabh)</option>
                      <option value="boho">Boho Botanique (Feuillage Ornemental)</option>
                      <option value="linen">Lin de luxe (Tissu texturé)</option>
                      <option value="marble">Marbre blanc (Veines dorées)</option>
                      <option value="gold-dust">Poussière d'or (Scintillant)</option>
                      <option value="parchment">Parchemin ancien (Kraft)</option>
                      <option value="velvet">Velours royal (Sombre)</option>
                    </select>
                  </div>
                )}

                {/* Global Image Upload */}
                {bgType === 'image' && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Importer image de fond (Cloudinary)</label>
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleGlobalImageUpload}
                        className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ou URL d'image de fond</label>
                      <input 
                        type="text" 
                        value={bgImageUrl}
                        onChange={(e) => setBgImageUrl(e.target.value)}
                        placeholder="https://images.unsplash.com/..."
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500 transition"
                      />
                    </div>
                    {bgImageUrl && (
                      <button
                        type="button"
                        onClick={() => handleOpenCropper('background')}
                        className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs transition border border-indigo-100 shadow-sm"
                      >
                        <Crop className="w-3.5 h-3.5" />
                        Rogner l'image de fond
                      </button>
                    )}
                  </div>
                )}

                {/* Frame Type Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Style d'Encadrement / Cadre</label>
                  <select 
                    value={frameType}
                    onChange={(e) => setFrameType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500 transition"
                  >
                    <option value="none">Aucun cadre (Bords normaux)</option>
                    <option value="arch">Arche Royale de Luxe (Ananya / Watercolor)</option>
                    <option value="double-border">Double Bordure Fine (Hassan Raza / Boho)</option>
                    <option value="gold-border">Bordure Or Lumineuse (Luxury Modern)</option>
                    <option value="floral-wreath">Couronne Florale Dorée (Centre)</option>
                    <option value="floral-arch">Arche de Roses Rouges (Haut)</option>
                    <option value="boho-dried">Feuillage Séché Boho (Coins)</option>
                    <option value="gold-leaves-circle">Cercle de Feuilles d'Or et Perles</option>
                    <option value="minimal-leaves">Feuilles Minimalistes (Angles)</option>
                  </select>
                </div>

                {/* Floral Customization Panel */}
                {frameType === 'floral-arch' && (
                  <div className="space-y-4 border-t border-slate-100 pt-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Type de Fleurs</label>
                      <select 
                        value={floralType}
                        onChange={(e) => setFloralType(e.target.value as any)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500 transition"
                      >
                        <option value="roses">Roses de Luxe (Mariage Royal)</option>
                        <option value="cherry-blossom">Fleurs de Cerisier (Romantique)</option>
                        <option value="gold-leaves">Feuillage d'Or & Perles (Prestige)</option>
                        <option value="sunflowers">Tournesols Lumineux (Chaleureux)</option>
                        <option value="eucalyptus">Eucalyptus & Baies (Boho Chic)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Couleur des Fleurs</label>
                      <div className="flex gap-2">
                        <input 
                          type="color" 
                          value={floralColor.startsWith('#') ? floralColor : '#b91c1c'}
                          onChange={(e) => setFloralColor(e.target.value)}
                          className="w-8 h-8 rounded-lg border border-slate-200 cursor-pointer overflow-hidden p-0"
                        />
                        <input 
                          type="text" 
                          value={floralColor}
                          onChange={(e) => setFloralColor(e.target.value)}
                          className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500 transition font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex justify-between">
                        <span>Densité de l'Arche</span>
                        <span className="text-indigo-600 font-extrabold">{floralDensity} fleurs</span>
                      </label>
                      <input 
                        type="range" 
                        min="15" 
                        max="80" 
                        value={floralDensity}
                        onChange={(e) => setFloralDensity(parseInt(e.target.value))}
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                    </div>
                  </div>
                )}

                <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-4 space-y-2">
                  <h4 className="text-xs font-bold text-amber-800 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Conseil de Design
                  </h4>
                  <p className="text-[11px] text-amber-700 leading-relaxed">
                    Pour reproduire les invitations de mariage fournies : utilisez la texture <strong>Papier grainé</strong> ou <strong>Aquarelle</strong>, combinez-la avec l'<strong>Arche Royale</strong> ou la <strong>Double Bordure</strong>, et utilisez la police <strong>Cormorant Garamond</strong> ou <strong>Great Vibes</strong> pour les noms.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Image Cropper Modal */}
        {cropperOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col animate-fade-in">
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="bg-indigo-50 text-indigo-700 p-2 rounded-xl">
                    <Crop className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Recadrer / Rogner l'image</h3>
                    <p className="text-xs text-slate-400 font-medium">Ajustez le zoom et déplacez l'image pour la recadrer</p>
                  </div>
                </div>
                <button 
                  onClick={() => setCropperOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-xl transition text-slate-400 hover:text-slate-600"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6 flex-1 flex flex-col items-center">
                {error && (
                  <div className="w-full p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2 text-xs">
                    <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Aspect Ratio Selector */}
                <div className="w-full space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block text-center">Format de recadrage</label>
                  <div className="flex flex-wrap justify-center gap-2">
                    {[
                      { id: '1:1', label: '1:1 (Carré)' },
                      { id: '16:9', label: '16:9 (Paysage)' },
                      { id: '4:3', label: '4:3 (Standard)' },
                      { id: '2:3', label: '2:3 (Portrait)' },
                      { id: 'free', label: 'Libre' }
                    ].map((ratio) => (
                      <button
                        key={ratio.id}
                        type="button"
                        onClick={() => {
                          setCropAspectRatio(ratio.id as any);
                          setCropPanX(0);
                          setCropPanY(0);
                          setCropZoom(1);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${cropAspectRatio === ratio.id ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                      >
                        {ratio.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cropping Viewport Container */}
                <div 
                  className="w-[400px] h-[300px] bg-slate-950 rounded-2xl relative overflow-hidden flex items-center justify-center select-none shadow-inner border border-slate-800"
                  onMouseDown={handleCropMouseDown}
                  onMouseMove={handleCropMouseMove}
                  onMouseUp={handleCropMouseUp}
                  onMouseLeave={handleCropMouseUp}
                  onTouchStart={handleCropTouchStart}
                  onTouchMove={handleCropTouchMove}
                  onTouchEnd={handleCropMouseUp}
                >
                  {/* Image being cropped */}
                  {cropImageSrc && (
                    <img 
                      src={cropImageSrc} 
                      alt="To Crop" 
                      onLoad={(e) => {
                        setCropImageNaturalWidth(e.currentTarget.naturalWidth);
                        setCropImageNaturalHeight(e.currentTarget.naturalHeight);
                      }}
                      style={{
                        width: (cropImageNaturalWidth && cropImageNaturalHeight) ? (
                          (cropImageNaturalWidth / cropImageNaturalHeight > 400 / 300) ? 400 : 300 * (cropImageNaturalWidth / cropImageNaturalHeight)
                        ) : 'auto',
                        height: (cropImageNaturalWidth && cropImageNaturalHeight) ? (
                          (cropImageNaturalWidth / cropImageNaturalHeight > 400 / 300) ? 400 / (cropImageNaturalWidth / cropImageNaturalHeight) : 300
                        ) : 'auto',
                        transform: `translate(${cropPanX}px, ${cropPanY}px) scale(${cropZoom})`,
                        transformOrigin: 'center',
                        transition: isDraggingCrop ? 'none' : 'transform 0.1s ease-out',
                        pointerEvents: 'none',
                        maxWidth: 'none',
                        maxHeight: 'none'
                      }}
                      className="absolute"
                    />
                  )}

                  {/* Cropping Frame Overlay */}
                  <div 
                    style={{
                      width: cropAspectRatio === '1:1' ? 200 :
                             cropAspectRatio === '16:9' ? 280 :
                             cropAspectRatio === '4:3' ? 240 :
                             cropAspectRatio === '2:3' ? 160 : 240,
                      height: cropAspectRatio === '1:1' ? 200 :
                              cropAspectRatio === '16:9' ? 157.5 :
                              cropAspectRatio === '4:3' ? 180 :
                              cropAspectRatio === '2:3' ? 240 : 180,
                    }}
                    className="border-2 border-dashed border-amber-400 absolute pointer-events-none z-10 shadow-[0_0_0_9999px_rgba(15,23,42,0.65)] rounded-lg"
                  >
                    {/* Corner markers */}
                    <div className="absolute -top-1.5 -left-1.5 w-3 h-3 border-t-4 border-l-4 border-amber-400" />
                    <div className="absolute -top-1.5 -right-1.5 w-3 h-3 border-t-4 border-r-4 border-amber-400" />
                    <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 border-b-4 border-l-4 border-amber-400" />
                    <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 border-b-4 border-r-4 border-amber-400" />
                  </div>
                </div>

                {/* Zoom Slider */}
                <div className="w-full space-y-2">
                  <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <span>Zoom</span>
                    <span className="font-mono text-indigo-600">{Math.round(cropZoom * 100)}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="4" 
                    step="0.01"
                    value={cropZoom}
                    onChange={(e) => setCropZoom(parseFloat(e.target.value))}
                    className="w-full accent-indigo-600 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Reset button */}
                <button
                  type="button"
                  onClick={() => {
                    setCropPanX(0);
                    setCropPanY(0);
                    setCropZoom(1);
                  }}
                  className="text-xs font-bold text-slate-400 hover:text-indigo-600 transition"
                >
                  Réinitialiser la position et le zoom
                </button>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setCropperOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-bold rounded-xl text-xs uppercase tracking-wider hover:bg-slate-100 transition"
                >
                  Annuler
                </button>
                <button 
                  type="button"
                  onClick={handleApplyCrop}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition shadow-md shadow-indigo-100"
                >
                  Valider le rognage
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      </>
    );
  }

  return (
    <>
      {renderMockupImportModal()}
    <div className="space-y-8">
      <PageHeader
        title={user?.role === 'SUPER_ADMIN' ? "Modèles d'invitation (Super Admin)" : "Vos modèles d'invitation"}
        description={
          user?.role === 'SUPER_ADMIN'
            ? "Gérez les modèles d'invitation globaux et privés via le concepteur visuel."
            : "Concevez des invitations interactives uniques à l'aide de notre éditeur visuel."
        }
        action={
          canUseCustomTemplates ? (
            <div className="flex flex-wrap gap-2">
              {user?.role === 'SUPER_ADMIN' && (
                <Link
                  href="/dashboard?tab=templates"
                  className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs transition hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Retour au tableau de bord
                </Link>
              )}
              {canUseMockupImport && (
                <>
              <input
                ref={mockupInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => handleMockupFileChange(e, true)}
              />
              <Button
                variant="secondary"
                onClick={() => mockupInputRef.current?.click()}
                disabled={mockupImporting}
                leftIcon={mockupImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              >
                {mockupImporting ? (ocrProgress !== null ? `OCR ${ocrProgress}%` : 'Import…') : 'Importer ma maquette'}
              </Button>
                </>
              )}
              <Button onClick={handleCreateTemplateClick} leftIcon={<PlusCircle className="w-4 h-4" />}>
                Nouveau modèle
              </Button>
            </div>
          ) : undefined
        }
      />

      {!canUseCustomTemplates && user?.role === 'USER' && (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-sm space-y-2">
          <p className="font-bold">Modèles personnalisés non inclus</p>
          <p>
            L&apos;éditeur visuel nécessite le forfait <strong>Business Premium 1</strong> ou supérieur.
            Forfait actuel : {tenant?.plan || 'FREE'}.
          </p>
          <Link href="/dashboard/billing" className="inline-block text-indigo-600 font-bold text-xs hover:underline">
            Voir les forfaits →
          </Link>
        </div>
      )}

      {error && <Alert variant="error">{error}</Alert>}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-3 text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Templates Grid */}
      <TemplateCardGrid
        templates={templates}
        isSuperAdmin={user?.role === 'SUPER_ADMIN'}
        emptyMessage={
          canUseCustomTemplates
            ? "Aucun modèle créé. Utilisez le concepteur visuel pour créer votre premier modèle d'invitation."
            : "Aucun modèle disponible pour votre organisation."
        }
        emptyAction={
          canUseCustomTemplates ? (
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {canUseMockupImport && (
                <button
                  type="button"
                  onClick={() => mockupInputRef.current?.click()}
                  disabled={mockupImporting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 font-semibold rounded-xl text-sm transition hover:bg-indigo-50 dark:hover:bg-indigo-950/40 disabled:opacity-50"
                >
                  {mockupImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  Importer ma maquette
                </button>
              )}
              <button
                type="button"
                onClick={handleCreateTemplateClick}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition shadow-md shadow-indigo-100 dark:shadow-none"
              >
                <PlusCircle className="w-4 h-4" />
                Créer mon premier modèle
              </button>
            </div>
          ) : undefined
        }
        onEdit={canUseCustomTemplates ? (t) => handleEditTemplateClick(t as TemplateItem) : undefined}
        onDuplicate={canUseCustomTemplates ? (t) => handleDuplicateTemplate(t as TemplateItem) : undefined}
        onDelete={canUseCustomTemplates ? (id) => handleDeleteTemplate(id) : undefined}
      />
    </div>
    </>
  );
}
