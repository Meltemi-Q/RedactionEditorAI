import React, { useEffect, useRef, useState } from 'react';
import { BoundingBox } from '../types';
import { Download, XCircle, Undo2, MousePointer2 } from 'lucide-react';

interface RedactionEditorProps {
  base64Image: string;
  boxes: BoundingBox[];
  onReset: () => void;
}

export const RedactionEditor: React.FC<RedactionEditorProps> = ({ base64Image, boxes, onReset }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [activeBoxes, setActiveBoxes] = useState<BoundingBox[]>(boxes);
  
  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{x: number, y: number} | null>(null);
  const [currentMousePos, setCurrentMousePos] = useState<{x: number, y: number} | null>(null);

  // Load image when base64 string changes
  useEffect(() => {
    const img = new Image();
    img.src = `data:image/png;base64,${base64Image}`;
    img.onload = () => {
      setImage(img);
    };
  }, [base64Image]);

  // Sync props to state only on initial load or reset
  useEffect(() => {
    // Only update if we have new boxes from AI, but don't overwrite user manual edits if prompt didn't change
    // For simplicity, we assume if parent passes new boxes, it's a re-run
    if (boxes.length > 0) {
        setActiveBoxes(boxes);
    }
  }, [boxes]);

  // Draw functionality (Rendering the canvas)
  useEffect(() => {
    if (!image || !canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set visual canvas size to match image resolution
    canvas.width = image.width;
    canvas.height = image.height;
    
    // CSS styling is handled by class, but ensure aspect ratio is maintained
    
    // 1. Draw Image
    ctx.drawImage(image, 0, 0);

    // 2. Draw Committed Redaction Boxes
    ctx.fillStyle = '#000000'; // Solid black redaction
    
    activeBoxes.forEach(box => {
      const x = (box.xmin / 1000) * image.width;
      const y = (box.ymin / 1000) * image.height;
      const w = ((box.xmax - box.xmin) / 1000) * image.width;
      const h = ((box.ymax - box.ymin) / 1000) * image.height;
      ctx.fillRect(x, y, w, h);
    });

  }, [image, activeBoxes]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `redacted_${Date.now()}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  const removeBox = (indexToRemove: number) => {
    setActiveBoxes(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // --- Manual Drawing Logic ---

  const getRelativeCoords = (e: React.MouseEvent) => {
    if (!containerRef.current || !image) return null;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Convert to 0-1000 scale based on visual container size
    // Note: container size might differ from image.naturalWidth
    const scaleX = 1000 / rect.width;
    const scaleY = 1000 / rect.height;

    return {
        x: Math.max(0, Math.min(1000, x * scaleX)),
        y: Math.max(0, Math.min(1000, y * scaleY))
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only start drawing if we are clicking on the overlay container directly
    // (Bubbling from existing boxes is handled by stopPropagation if needed, 
    // but here we just rely on the fact that existing boxes have their own click handlers)
    const coords = getRelativeCoords(e);
    if (coords) {
        setIsDrawing(true);
        setStartPos(coords);
        setCurrentMousePos(coords);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    const coords = getRelativeCoords(e);
    if (coords) {
        setCurrentMousePos(coords);
    }
  };

  const handleMouseUp = () => {
    if (isDrawing && startPos && currentMousePos) {
        // Create the new box
        const newBox: BoundingBox = {
            xmin: Math.min(startPos.x, currentMousePos.x),
            ymin: Math.min(startPos.y, currentMousePos.y),
            xmax: Math.max(startPos.x, currentMousePos.x),
            ymax: Math.max(startPos.y, currentMousePos.y),
            label: '手动打码'
        };

        // Filter out tiny accidental clicks
        if ((newBox.xmax - newBox.xmin) > 10 && (newBox.ymax - newBox.ymin) > 10) {
            setActiveBoxes(prev => [...prev, newBox]);
        }
    }
    setIsDrawing(false);
    setStartPos(null);
    setCurrentMousePos(null);
  };

  return (
    <div className="w-full max-w-4xl mx-auto animate-fade-in pb-12">
      
      {/* Toolbar */}
      <div className="flex justify-between items-center mb-4 bg-slate-900 p-3 rounded-xl border border-slate-800 sticky top-20 z-20 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-slate-300 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700/50">
             <MousePointer2 className="w-4 h-4 text-blue-400" />
             <span className="text-xs">拖拽画面手动补漏</span>
          </div>
          <span className="text-sm font-medium text-slate-400">
             | 已遮盖 <span className="text-white">{activeBoxes.length}</span> 处
          </span>
        </div>
        <div className="flex gap-2">
           <button 
            onClick={onReset}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <Undo2 className="w-4 h-4" />
            重新上传
          </button>
          <button 
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors shadow-lg shadow-blue-900/20"
          >
            <Download className="w-4 h-4" />
            保存图片
          </button>
        </div>
      </div>

      {/* Canvas Container */}
      <div 
        ref={containerRef} 
        className="relative w-full rounded-lg overflow-hidden border border-slate-800 bg-slate-900/50 flex justify-center shadow-2xl touch-none select-none cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <canvas ref={canvasRef} className="block shadow-md w-full" />
        
        {/* Overlay for Box Interaction (Removal) */}
        {image && (
          <div 
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
          >
            {activeBoxes.map((box, idx) => {
               const top = (box.ymin / 1000) * 100;
               const left = (box.xmin / 1000) * 100;
               const width = ((box.xmax - box.xmin) / 1000) * 100;
               const height = ((box.ymax - box.ymin) / 1000) * 100;

               return (
                 <div
                    key={idx}
                    className="absolute group pointer-events-auto border-2 border-transparent hover:border-red-500/80 transition-all bg-black/20 hover:bg-transparent"
                    style={{
                      top: `${top}%`,
                      left: `${left}%`,
                      width: `${width}%`,
                      height: `${height}%`,
                    }}
                    onMouseDown={(e) => {
                        e.stopPropagation(); // Prevent drawing when clicking a box
                    }}
                    onClick={(e) => {
                        e.stopPropagation(); 
                        removeBox(idx);
                    }}
                 >
                    <div className="absolute -top-3 -right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 rounded-full text-red-500 z-10 scale-90 shadow-sm cursor-pointer">
                      <XCircle className="w-6 h-6 fill-slate-900" />
                    </div>
                 </div>
               )
            })}

            {/* Drawing Preview Box */}
            {isDrawing && startPos && currentMousePos && (
                <div 
                    className="absolute border-2 border-blue-500 bg-blue-500/20"
                    style={{
                        top: `${Math.min(startPos.y, currentMousePos.y) / 10}%`,
                        left: `${Math.min(startPos.x, currentMousePos.x) / 10}%`,
                        width: `${Math.abs(currentMousePos.x - startPos.x) / 10}%`,
                        height: `${Math.abs(currentMousePos.y - startPos.y) / 10}%`,
                    }}
                />
            )}
          </div>
        )}
      </div>
      
      <p className="text-center text-slate-500 text-sm mt-6">
        <span className="text-blue-400">提示</span>：按住鼠标左键拖拽可手动添加遮罩，点击已有遮罩可删除。
      </p>
    </div>
  );
};