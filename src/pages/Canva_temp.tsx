import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
    MousePointer2,
    Hand,
    Square,
    Circle,
    Diamond,
    ArrowRight,
    Minus,
    Type,
    Pencil,
    Zap,
    Eraser,
    Undo2,
    Redo2,
    Trash2,
    ZoomIn,
    ZoomOut,
    Download,
    Copy,
    Lock,
    Unlock,
    Layers,
    ChevronUp,
    ChevronDown,
    AlignLeft,
    AlignCenter,
    AlignRight,
} from 'lucide-react';
import './Canva.css';

// Types
type Tool = 'select' | 'hand' | 'rectangle' | 'ellipse' | 'diamond' | 'arrow' | 'line' | 'text' | 'pencil' | 'laser' | 'eraser' | 'image';
// Updated ResizeHandle type with 'e' and 'w' as per suggestion
type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se' | 'e' | 'w' | null;
type LineHandle = 'start' | 'end' | 'control' | null;
type InteractionMode = 'none' | 'drawing' | 'moving' | 'resizing' | 'rotating' | 'selecting' | 'editingLine';

interface Point {
    x: number;
    y: number;
}

interface CanvasElement {
    id: string;
    type: 'rectangle' | 'ellipse' | 'diamond' | 'arrow' | 'line' | 'text' | 'pencil' | 'image';
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    fill: string;
    stroke: string;
    strokeWidth: number;
    strokeStyle: 'solid' | 'dashed' | 'dotted';
    roughness: number;
    borderRadius: number;
    opacity: number;
    text?: string;
    fontSize?: number;
    fontFamily?: string;
    textAlign?: 'left' | 'center' | 'right';
    points?: Point[];
    controlPoint?: Point; // For lines/arrows mid-point
    lineStyle: 'straight' | 'elbow' | 'curve'; // Type of line connection
    arrowStart: 'none' | 'arrow' | 'dot'; // Start endpoint style
    arrowEnd: 'none' | 'arrow' | 'dot'; // End endpoint style
    startConnection?: string;
    endConnection?: string;
    locked: boolean;
    selected: boolean;
}

interface ToolButton {
    id: Tool;
    icon: React.ElementType;
    label: string;
    shortcut: string;
}

const mainTools: ToolButton[] = [
    { id: 'select', icon: MousePointer2, label: 'Selecionar', shortcut: 'V' },
    { id: 'hand', icon: Hand, label: 'Mover canvas', shortcut: 'H' },
    { id: 'rectangle', icon: Square, label: 'Retângulo', shortcut: 'R' },
    { id: 'ellipse', icon: Circle, label: 'Elipse', shortcut: 'O' },
    { id: 'diamond', icon: Diamond, label: 'Diamante', shortcut: 'D' },
    { id: 'arrow', icon: ArrowRight, label: 'Seta', shortcut: 'A' },
    { id: 'line', icon: Minus, label: 'Linha', shortcut: 'L' },
    { id: 'text', icon: Type, label: 'Texto', shortcut: 'T' },
];

const drawingTools: ToolButton[] = [
    { id: 'pencil', icon: Pencil, label: 'Lápis', shortcut: 'P' },
    { id: 'laser', icon: Zap, label: 'Laser', shortcut: 'K' },
    { id: 'eraser', icon: Eraser, label: 'Borracha', shortcut: 'E' },
];

const colors = [
    '#000000', '#343a40', '#495057', '#ffffff',
    '#ef4444', '#f97316', '#eab308', '#22c55e',
    '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899'
];

const strokeWidths = [1, 2, 4, 8];

// Selection color - green
const SELECTION_COLOR = '#22c55e';

export function Canva() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Canvas state
    const [elements, setElements] = useState<CanvasElement[]>([]);
    const [selectedTool, setSelectedTool] = useState<Tool>('select');
    const [selectedElements, setSelectedElements] = useState<string[]>([]);
    const [cursorStyle, setCursorStyle] = useState<string>('default');
    const [hoveredLock, setHoveredLock] = useState<string | null>(null);

    // Default styles for new elements
    const [defaultStyles, setDefaultStyles] = useState<{
        stroke: string;
        fill: string;
        strokeWidth: number;
        opacity: number;
        strokeStyle: CanvasElement['strokeStyle'];
        roughness: number;
        borderRadius: number;
    }>({
        stroke: '#ffffff',
        fill: 'transparent',
        strokeWidth: 2,
        opacity: 1,
        strokeStyle: 'solid',
        roughness: 1,
        borderRadius: 0
    });

    // View state
    const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
    const [scale, setScale] = useState(1);

    // Interaction state
    const [interactionMode, setInteractionMode] = useState<InteractionMode>('none');
    const [isPanning, setIsPanning] = useState(false);
    const [startPoint, setStartPoint] = useState<Point>({ x: 0, y: 0 });
    const [currentElement, setCurrentElement] = useState<CanvasElement | null>(null);

    // Resize/Rotate state
    const [activeHandle, setActiveHandle] = useState<ResizeHandle>(null);
    const [isRotating, setIsRotating] = useState(false);
    const [initialElementState, setInitialElementState] = useState<CanvasElement | null>(null);

    // Line/Arrow editing state
    const [activeLineHandle, setActiveLineHandle] = useState<LineHandle>(null);

    // Selection box state
    const [selectionBox, setSelectionBox] = useState<{ start: Point; end: Point } | null>(null);

    // History
    const [history, setHistory] = useState<CanvasElement[][]>([[]]);
    const [historyIndex, setHistoryIndex] = useState(0);

    // Clipboard
    const [clipboard, setClipboard] = useState<CanvasElement[]>([]);

    // Text editing
    const [editingTextId, setEditingTextId] = useState<string | null>(null);

    // Laser pointer state
    interface LaserPoint {
        x: number;
        y: number;
        timestamp: number;
    }
    interface LaserStroke {
        points: LaserPoint[];
        id: string;
        finishedAt?: number; // Timestamp when user released mouse
    }
    const [laserStrokes, setLaserStrokes] = useState<LaserStroke[]>([]);
    const [currentLaserStroke, setCurrentLaserStroke] = useState<LaserStroke | null>(null);

    // Eraser state
    const [eraserPath, setEraserPath] = useState<{ x: number, y: number, timestamp: number }[] | null>(null);
    const [erasedIds, setErasedIds] = useState<Set<string>>(new Set());
    const lastEraserPosRef = useRef<Point | null>(null);

    // Get the first selected element for the floating panel
    const selectedElement = elements.find(el => selectedElements.includes(el.id));

    // Generate unique ID
    const generateId = () => `el_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Get canvas coordinates from mouse event
    const getCanvasCoords = useCallback((e: React.MouseEvent | MouseEvent): Point => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };

        const rect = canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left - offset.x) / scale,
            y: (e.clientY - rect.top - offset.y) / scale
        };
    }, [offset, scale]);

    // Helper: Check if point is inside element
    const isPointInElement = useCallback((point: Point, el: CanvasElement, tolerance: number = 0): boolean => {
        const cos = Math.cos(-el.rotation);
        const sin = Math.sin(-el.rotation);
        const cx = el.x + el.width / 2;
        const cy = el.y + el.height / 2;
        const dx = point.x - cx;
        const dy = point.y - cy;
        const localX = dx * cos - dy * sin + el.width / 2;
        const localY = dx * sin + dy * cos + el.height / 2;

        return localX >= -tolerance && localX <= el.width + tolerance && localY >= -tolerance && localY <= el.height + tolerance;
    }, []);

    // Helper: Calculate text height with wrapping
    const calculateTextHeight = useCallback((ctx: CanvasRenderingContext2D, text: string, maxWidth: number, fontSize: number, fontFamily: string): number => {
        ctx.font = `${fontSize}px ${fontFamily}`;
        const lineHeight = fontSize * 1.2;


        // If no text, return min height
        if (!text) return lineHeight;

        // Handle manual newlines first
        const paragraphs = text.split('\n');
        let totalHeight = 0;

        paragraphs.forEach((paragraph) => {
            const words = paragraph.split(' ');
            let line = '';
            let linesInParagraph = 1;

            if (paragraph === '') {
                // Empty line
                linesInParagraph = 1;
            } else {
                for (let n = 0; n < words.length; n++) {
                    const testLine = line + words[n] + ' ';
                    const metrics = ctx.measureText(testLine);
                    const testWidth = metrics.width;

                    if (testWidth > maxWidth && n > 0) {
                        line = words[n] + ' ';
                        linesInParagraph++;
                    } else {
                        line = testLine;
                    }
                }
            }
            totalHeight += linesInParagraph * lineHeight;
        });

        return Math.max(totalHeight, lineHeight);
    }, []);

    // Helper: Wrap text into lines for drawing
    const getWrappedTextLines = useCallback((ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {

        const lines: string[] = [];
        const paragraphs = text.split('\n');

        paragraphs.forEach(paragraph => {
            if (paragraph === '') {
                lines.push('');
                return;
            }

            const words = paragraph.split(' ');
            let line = '';

            for (let n = 0; n < words.length; n++) {
                const testLine = line + words[n] + ' ';
                const metrics = ctx.measureText(testLine);
                const testWidth = metrics.width;
                if (testWidth > maxWidth && n > 0) {
                    lines.push(line);
                    line = words[n] + ' ';
                } else {
                    line = testLine;
                }
            }
            lines.push(line);
        });

        return lines;
    }, []);

    // Laser pointer functions
    const addLaserPoint = useCallback((point: Point) => {
        const laserPoint = { x: point.x, y: point.y, timestamp: Date.now() };
        if (currentLaserStroke) {
            setCurrentLaserStroke({
                ...currentLaserStroke,
                points: [...currentLaserStroke.points, laserPoint]
            });
        } else {
            setCurrentLaserStroke({
                id: `laser_${Date.now()}`,
                points: [laserPoint]
            });
        }
    }, [currentLaserStroke]);

    const finishLaserStroke = useCallback(() => {
        if (currentLaserStroke && currentLaserStroke.points.length > 0) {
            const finishedStroke = { ...currentLaserStroke, finishedAt: Date.now() };
            setLaserStrokes(prev => [...prev, finishedStroke]);
            setCurrentLaserStroke(null);

            // Remove stroke after all points have faded (1 second point lifetime)
            setTimeout(() => {
                setLaserStrokes(prev => prev.filter(s => s.id !== finishedStroke.id));
            }, 1000);
        }
    }, [currentLaserStroke]);

    // Check if point is on a resize handle
    const getResizeHandle = useCallback((point: Point, element: CanvasElement): ResizeHandle => {
        const handleSize = 10 / scale;
        const cos = Math.cos(element.rotation);
        const sin = Math.sin(element.rotation);
        const cx = element.x + element.width / 2;
        const cy = element.y + element.height / 2;

        // Transform point to element's local coordinates
        const dx = point.x - cx;
        const dy = point.y - cy;
        const localX = dx * cos + dy * sin + element.width / 2;
        const localY = -dx * sin + dy * cos + element.height / 2;

        const handles: { handle: ResizeHandle; x: number; y: number }[] = [
            { handle: 'nw', x: 0, y: 0 },
            { handle: 'ne', x: element.width, y: 0 },
            { handle: 'sw', x: 0, y: element.height },
            { handle: 'se', x: element.width, y: element.height },
        ];

        // Add side handles for text elements
        if (element.type === 'text') {
            handles.push(
                { handle: 'e', x: element.width, y: element.height / 2 },
                { handle: 'w', x: 0, y: element.height / 2 }
            );
        }

        for (const h of handles) {
            if (Math.abs(localX - h.x) < handleSize && Math.abs(localY - h.y) < handleSize) {
                return h.handle;
            }
        }
        return null;
    }, [scale]);
</imported-code>