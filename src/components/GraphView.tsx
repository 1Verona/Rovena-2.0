import { useEffect, useRef, useMemo } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import type { Note, Folder } from '../services/notesStorage';
import './GraphView.css';

interface GraphNode {
    id: string;
    name: string;
    type: 'folder' | 'note';
    val: number;
    color: string;
}

interface GraphLink {
    source: string;
    target: string;
}

interface GraphData {
    nodes: GraphNode[];
    links: GraphLink[];
}

interface GraphViewProps {
    notes: Note[];
    folders: Folder[];
    onNodeClick: (nodeId: string, type: 'folder' | 'note') => void;
}

export function GraphView({ notes, folders, onNodeClick }: GraphViewProps) {
    const graphRef = useRef<any>();
    const containerRef = useRef<HTMLDivElement>(null);

    const graphData = useMemo((): GraphData => {
        const nodes: GraphNode[] = [];
        const links: GraphLink[] = [];

        folders.forEach((folder) => {
            nodes.push({
                id: folder.id,
                name: folder.name,
                type: 'folder',
                val: 15,
                color: '#8b5cf6',
            });

            if (folder.parentId) {
                links.push({
                    source: folder.parentId,
                    target: folder.id,
                });
            }
        });

        notes.forEach((note) => {
            nodes.push({
                id: note.id,
                name: note.title,
                type: 'note',
                val: 8,
                color: '#22c55e',
            });

            if (note.folderId) {
                links.push({
                    source: note.folderId,
                    target: note.id,
                });
            }
        });

        if (nodes.length === 0) {
            nodes.push({
                id: 'empty',
                name: 'Sem notas ou pastas',
                type: 'note',
                val: 10,
                color: '#64748b',
            });
        }

        return { nodes, links };
    }, [notes, folders]);

    useEffect(() => {
        if (graphRef.current) {
            graphRef.current.d3Force('charge').strength(-500);
            graphRef.current.d3Force('link').distance(150);
            graphRef.current.d3Force('center').strength(0.1);
        }
    }, []);

    const handleNodeClick = (node: any) => {
        if (node.id !== 'empty') {
            onNodeClick(node.id, node.type);
        }
    };

    return (
        <div className="graph-view-container" ref={containerRef}>
            <ForceGraph2D
                ref={graphRef}
                graphData={graphData}
                nodeLabel="name"
                nodeVal="val"
                nodeColor="color"
                nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
                    const x = node.x;
                    const y = node.y;
                    
                    if (typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y)) {
                        return;
                    }

                    const label = node.name || '';
                    const fontSize = 15 / globalScale;
                    const nodeVal = typeof node.val === 'number' && node.val > 0 ? node.val : 8;
                    const nodeRadius = Math.sqrt(nodeVal) * 4;
                    
                    if (!Number.isFinite(nodeRadius) || nodeRadius <= 0) return;

                    ctx.save();

                    ctx.shadowColor = node.type === 'folder' ? 'rgba(250, 204, 21, 0.9)' : 'rgba(34, 197, 94, 0.9)';
                    ctx.shadowBlur = 30 / globalScale;

                    const gradient = ctx.createRadialGradient(x, y, 0, x, y, nodeRadius);
                    if (node.type === 'folder') {
                        gradient.addColorStop(0, '#fbbf24');
                        gradient.addColorStop(1, '#d97706');
                    } else {
                        gradient.addColorStop(0, '#34d399');
                        gradient.addColorStop(1, '#059669');
                    }

                    ctx.beginPath();
                    ctx.arc(x, y, nodeRadius, 0, 2 * Math.PI);
                    ctx.fillStyle = gradient;
                    ctx.fill();

                    ctx.strokeStyle = node.type === 'folder' ? '#fef3c7' : '#d1fae5';
                    ctx.lineWidth = 3 / globalScale;
                    ctx.stroke();

                    ctx.shadowColor = 'transparent';
                    ctx.shadowBlur = 0;

                    ctx.font = `700 ${fontSize}px 'Inter', -apple-system, sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';

                    const textY = y + nodeRadius + fontSize + 6 / globalScale;
                    
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.95)';
                    ctx.fillText(label, x + 1.5 / globalScale, textY + 1.5 / globalScale);

                    ctx.fillStyle = '#ffffff';
                    ctx.fillText(label, x, textY);

                    ctx.restore();
                }}
                nodeCanvasObjectMode={() => 'replace'}
                linkColor={() => 'rgba(34, 197, 94, 0.25)'}
                linkWidth={2}
                linkDirectionalParticles={2}
                linkDirectionalParticleWidth={2.5}
                linkDirectionalParticleSpeed={0.006}
                linkDirectionalParticleColor={() => '#22c55e'}
                onNodeClick={handleNodeClick}
                backgroundColor="transparent"
                warmupTicks={100}
                cooldownTicks={0}
                d3AlphaDecay={0.01}
                d3VelocityDecay={0.2}
                enableZoomInteraction={true}
                enablePanInteraction={true}
                enableNodeDrag={true}
                nodePointerAreaPaint={(node: any, color: string, ctx: CanvasRenderingContext2D) => {
                    const nodeRadius = Math.sqrt((node.val || 1)) * 3;
                    ctx.fillStyle = color;
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, nodeRadius + 5, 0, 2 * Math.PI);
                    ctx.fill();
                }}
                onNodeHover={(node: any) => {
                    document.body.style.cursor = node ? 'pointer' : 'grab';
                }}
                onNodeDragEnd={(node: any) => {
                    if (node) {
                        node.fx = node.x;
                        node.fy = node.y;
                    }
                }}
            />
        </div>
    );
}
