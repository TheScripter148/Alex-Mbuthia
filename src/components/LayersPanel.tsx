import React, { useState } from 'react';
import { Layers, Eye, EyeOff, Lock, Unlock, ArrowUp, ArrowDown, Trash2, Edit2, Check } from 'lucide-react';
import { CanvasLayer } from '../types';

interface LayersPanelProps {
  layers: CanvasLayer[];
  selectedLayerId: string | null;
  onSelectLayer: (layerId: string | null) => void;
  onUpdateLayer: (layerId: string, updates: Partial<CanvasLayer>) => void;
  onDeleteLayer: (layerId: string) => void;
  onReorderLayers: (fromIndex: number, toIndex: number) => void;
}

export const LayersPanel: React.FC<LayersPanelProps> = ({
  layers,
  selectedLayerId,
  onSelectLayer,
  onUpdateLayer,
  onDeleteLayer,
  onReorderLayers,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState<string>('');

  const handleStartRename = (layer: CanvasLayer, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(layer.id);
    setEditName(layer.name);
  };

  const handleSaveRename = (layerId: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (editName.trim()) {
      onUpdateLayer(layerId, { name: editName.trim() });
    }
    setEditingId(null);
  };

  // Layers are rendered in visual stack order: top-most layer is first in list
  const reversedLayers = [...layers].map((layer, index) => ({ layer, originalIndex: index })).reverse();

  return (
    <div className="flex flex-col h-full bg-neutral-900 border-l border-neutral-800 text-xs w-64 select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-neutral-950/60">
        <div className="flex items-center gap-2 text-neutral-200 font-semibold">
          <Layers className="w-4 h-4 text-amber-400" />
          <span>Cover Layers ({layers.length})</span>
        </div>
      </div>

      {/* Layers List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {reversedLayers.map(({ layer, originalIndex }, displayIdx) => {
          const isSelected = selectedLayerId === layer.id;
          const isEditing = editingId === layer.id;

          return (
            <div
              key={layer.id}
              onClick={() => onSelectLayer(layer.id)}
              className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                isSelected
                  ? 'bg-amber-500/10 border border-amber-500/60 text-white shadow-sm'
                  : 'bg-neutral-950/40 border border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40'
              }`}
            >
              {/* Layer Title & Rename */}
              <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                {isEditing ? (
                  <form onSubmit={(e) => handleSaveRename(layer.id, e)} className="flex items-center gap-1">
                    <input
                      type="text"
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onBlur={() => handleSaveRename(layer.id)}
                      className="px-1.5 py-0.5 bg-neutral-950 border border-amber-500 rounded text-xs text-white"
                    />
                    <button type="submit" className="text-amber-400 p-0.5">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </form>
                ) : (
                  <span className={`truncate font-medium ${isSelected ? 'text-white' : 'text-neutral-300'}`}>
                    {layer.name}
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100">
                {/* Rename */}
                {!isEditing && (
                  <button
                    onClick={(e) => handleStartRename(layer, e)}
                    title="Rename Layer"
                    className="p-1 hover:text-white rounded"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                )}

                {/* Move Up/Down in Stack */}
                <button
                  disabled={originalIndex === layers.length - 1}
                  onClick={(e) => {
                    e.stopPropagation();
                    onReorderLayers(originalIndex, originalIndex + 1);
                  }}
                  title="Bring Forward"
                  className="p-1 hover:text-white rounded disabled:opacity-20"
                >
                  <ArrowUp className="w-3 h-3" />
                </button>
                <button
                  disabled={originalIndex === 0}
                  onClick={(e) => {
                    e.stopPropagation();
                    onReorderLayers(originalIndex, originalIndex - 1);
                  }}
                  title="Send Backward"
                  className="p-1 hover:text-white rounded disabled:opacity-20"
                >
                  <ArrowDown className="w-3 h-3" />
                </button>

                {/* Lock Toggle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateLayer(layer.id, { locked: !layer.locked });
                  }}
                  title={layer.locked ? 'Unlock' : 'Lock'}
                  className="p-1 hover:text-white rounded"
                >
                  {layer.locked ? <Lock className="w-3 h-3 text-amber-400" /> : <Unlock className="w-3 h-3" />}
                </button>

                {/* Visibility Toggle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateLayer(layer.id, { visible: !layer.visible });
                  }}
                  title={layer.visible ? 'Hide' : 'Show'}
                  className="p-1 hover:text-white rounded"
                >
                  {layer.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3 text-neutral-500" />}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
