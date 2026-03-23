import { useState, useRef, useEffect } from 'react';
import { useEntryTypes, EntryType, COLOR_PALETTE } from '@/hooks/useEntryTypes';
import { Pencil, Trash2, Plus, Check, X, Tags, Palette } from 'lucide-react';

interface EntryTypeManagerProps {
  selectedTypes: string[];
  onSelectionChange: (types: string[]) => void;
}

export const EntryTypeManager = ({ selectedTypes, onSelectionChange }: EntryTypeManagerProps) => {
  const { entryTypes, loading, addEntryType, updateEntryType, updateEntryTypeColor, deleteEntryType } = useEntryTypes();

  // Add mode
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(COLOR_PALETTE[0]);
  const addInputRef = useRef<HTMLInputElement>(null);

  // Edit mode
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  // Color picker mode
  const [colorPickerId, setColorPickerId] = useState<string | null>(null);

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Animation tracking
  const [animatingIn, setAnimatingIn] = useState<string | null>(null);
  const [animatingOut, setAnimatingOut] = useState<string | null>(null);

  // Auto-focus inputs
  useEffect(() => {
    if (isAdding && addInputRef.current) {
      addInputRef.current.focus();
    }
  }, [isAdding]);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  // Pick next available color for new entries
  useEffect(() => {
    if (isAdding) {
      const usedColors = entryTypes.map((et) => et.color);
      const available = COLOR_PALETTE.find((c) => !usedColors.includes(c));
      setNewColor(available || COLOR_PALETTE[entryTypes.length % COLOR_PALETTE.length]);
    }
  }, [isAdding, entryTypes]);

  // --- Handlers ---
  const handleAdd = async () => {
    const result = await addEntryType(newName, newColor);
    if (result) {
      setAnimatingIn(result.id);
      setTimeout(() => setAnimatingIn(null), 350);
      setNewName('');
      setIsAdding(false);
    }
  };

  const handleEdit = (et: EntryType) => {
    setEditingId(et.id);
    setEditName(et.name);
    setDeletingId(null);
    setColorPickerId(null);
  };

  const handleEditConfirm = async () => {
    if (!editingId) return;
    const oldEntry = entryTypes.find((et) => et.id === editingId);
    if (oldEntry && oldEntry.name === editName.trim()) {
      setEditingId(null);
      return;
    }
    const success = await updateEntryType(editingId, editName);
    if (success) {
      if (oldEntry && selectedTypes.includes(oldEntry.name)) {
        onSelectionChange(
          selectedTypes.map((t) => (t === oldEntry.name ? editName.trim() : t))
        );
      }
      setEditingId(null);
    }
  };

  const handleColorChange = async (id: string, color: string) => {
    await updateEntryTypeColor(id, color);
    setColorPickerId(null);
  };

  const handleDelete = async (id: string) => {
    setAnimatingOut(id);
    const entryToDelete = entryTypes.find((et) => et.id === id);
    setTimeout(async () => {
      const success = await deleteEntryType(id);
      if (success && entryToDelete) {
        onSelectionChange(selectedTypes.filter((t) => t !== entryToDelete.name));
      }
      setAnimatingOut(null);
      setDeletingId(null);
    }, 250);
  };

  const toggleSelect = (name: string) => {
    if (editingId || deletingId || colorPickerId) return;
    if (selectedTypes.includes(name)) {
      onSelectionChange(selectedTypes.filter((t) => t !== name));
    } else {
      onSelectionChange([...selectedTypes, name]);
    }
  };

  // --- Helpers ---
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
      : '6, 182, 212';
  };

  // --- Color Swatch Picker (shared) ---
  const ColorSwatchPicker = ({ currentColor, onPick }: { currentColor: string; onPick: (c: string) => void }) => (
    <div className="flex flex-wrap gap-1.5 p-2 bg-neutral-900 border border-neutral-700 rounded-lg animate-in fade-in-0 zoom-in-95 duration-150">
      {COLOR_PALETTE.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onPick(c)}
          className="w-6 h-6 rounded-full border-2 transition-all duration-150 hover:scale-110"
          style={{
            backgroundColor: c,
            borderColor: currentColor === c ? '#fff' : 'transparent',
            boxShadow: currentColor === c ? `0 0 8px ${c}` : 'none',
          }}
          title={c}
        />
      ))}
    </div>
  );

  // --- Render ---
  if (loading) {
    return (
      <div className="space-y-3 pt-4">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-lg">Tipo de Entrada</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-10 w-20 rounded-md bg-neutral-800 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 pt-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="font-semibold text-lg">Tipo de Entrada</span>
          <p className="text-xs text-muted-foreground">
            Podés seleccionar más de una opción
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setIsAdding(true);
            setEditingId(null);
            setDeletingId(null);
            setColorPickerId(null);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full
                     border border-neutral-700 bg-neutral-900
                     text-sm text-muted-foreground font-medium
                     hover:bg-neutral-800 hover:text-white hover:border-neutral-500
                     transition-all duration-200
                     hover:shadow-[0_0_12px_rgba(6,182,212,0.3)]"
          title="Agregar tipo de entrada"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nuevo</span>
        </button>
      </div>

      {/* Inline add input with color picker */}
      {isAdding && (
        <div className="space-y-2 animate-in fade-in-0 slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2">
            {/* Color preview dot */}
            <button
              type="button"
              className="w-8 h-8 rounded-full border-2 border-neutral-600 shrink-0 transition-all hover:scale-110"
              style={{ backgroundColor: newColor, boxShadow: `0 0 8px ${newColor}40` }}
              onClick={() => setColorPickerId(colorPickerId === '__new__' ? null : '__new__')}
              title="Elegir color"
            />
            <input
              ref={addInputRef}
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); handleAdd(); }
                if (e.key === 'Escape') { setIsAdding(false); setNewName(''); }
              }}
              placeholder="Nombre del tipo..."
              maxLength={30}
              className="flex-1 px-3 py-2 rounded-md border bg-neutral-900
                         text-sm text-white placeholder:text-neutral-500
                         focus:outline-none focus:ring-1 transition-all duration-200"
              style={{
                borderColor: `${newColor}80`,
                // @ts-ignore
                '--tw-ring-color': `${newColor}50`,
              }}
            />
            <button
              type="button"
              onClick={handleAdd}
              className="p-2 rounded-md text-white transition-colors"
              style={{ backgroundColor: newColor }}
              title="Confirmar"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => { setIsAdding(false); setNewName(''); setColorPickerId(null); }}
              className="p-2 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors"
              title="Cancelar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {/* Color palette for new entry */}
          {colorPickerId === '__new__' && (
            <ColorSwatchPicker currentColor={newColor} onPick={(c) => { setNewColor(c); setColorPickerId(null); }} />
          )}
        </div>
      )}

      {/* Entry Types List */}
      {entryTypes.length === 0 && !isAdding ? (
        <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
          <Tags className="h-10 w-10 text-neutral-600" />
          <p className="text-sm text-muted-foreground">
            No tenés tipos de entrada.
            <br />
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 font-medium transition-colors"
            >
              ¡Creá el primero!
            </button>
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {entryTypes.map((et) => {
            const isSelected = selectedTypes.includes(et.name);
            const isEditing = editingId === et.id;
            const isDeleting = deletingId === et.id;
            const showColorPicker = colorPickerId === et.id;
            const rgb = hexToRgb(et.color);

            // Animation classes
            let animClass = '';
            if (animatingIn === et.id) animClass = 'animate-in fade-in-0 zoom-in-95 duration-300';
            if (animatingOut === et.id) animClass = 'animate-out fade-out-0 zoom-out-95 duration-250 pointer-events-none';

            if (isEditing) {
              return (
                <div
                  key={et.id}
                  className="flex items-center gap-1 animate-in fade-in-0 duration-150"
                >
                  <input
                    ref={editInputRef}
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); handleEditConfirm(); }
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    maxLength={30}
                    className="px-3 py-2 rounded-md border text-sm text-white bg-neutral-900
                               focus:outline-none focus:ring-1 transition-all duration-200"
                    style={{
                      borderColor: et.color,
                      boxShadow: `0 0 8px rgba(${rgb}, 0.3)`,
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleEditConfirm}
                    className="p-1.5 rounded-md hover:bg-neutral-800 text-green-400 hover:text-green-300 transition-colors"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="p-1.5 rounded-md hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            }

            if (isDeleting) {
              return (
                <div
                  key={et.id}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-md border border-red-600/50 bg-red-950/30 text-sm ${animClass}`}
                >
                  <span className="text-red-300 text-xs">¿Eliminar?</span>
                  <button
                    type="button"
                    onClick={() => handleDelete(et.id)}
                    className="p-1 rounded bg-red-600/80 hover:bg-red-500 text-white transition-colors"
                  >
                    <Check className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingId(null)}
                    className="p-1 rounded bg-neutral-700 hover:bg-neutral-600 text-white transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              );
            }

            return (
              <div key={et.id} className={`relative ${animClass}`}>
                <div className="group relative">
                  <button
                    type="button"
                    onClick={() => toggleSelect(et.name)}
                    className="px-4 py-2 rounded-md border text-sm font-semibold transition-all duration-200"
                    style={
                      isSelected
                        ? {
                            backgroundColor: et.color,
                            borderColor: et.color,
                            color: '#fff',
                            boxShadow: `0 0 14px rgba(${rgb}, 0.45), 0 0 4px rgba(${rgb}, 0.2)`,
                          }
                        : {
                            backgroundColor: 'rgb(23 23 23)',
                            borderColor: `rgba(${rgb}, 0.4)`,
                            color: et.color,
                          }
                    }
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = `rgba(${rgb}, 0.12)`;
                        e.currentTarget.style.transform = 'scale(1.03)';
                        e.currentTarget.style.boxShadow = `0 0 10px rgba(${rgb}, 0.2)`;
                      } else {
                        e.currentTarget.style.transform = 'scale(1.03)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = 'rgb(23 23 23)';
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = 'none';
                      } else {
                        e.currentTarget.style.transform = 'scale(1)';
                      }
                    }}
                  >
                    {et.name}
                  </button>

                  {/* Edit/Delete/Color icons on hover */}
                  <div className="absolute -top-2 -right-2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-10">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setColorPickerId(colorPickerId === et.id ? null : et.id); setEditingId(null); setDeletingId(null); }}
                      className="p-1 rounded-full bg-neutral-800 border border-neutral-600 hover:bg-neutral-700 hover:border-neutral-500 text-neutral-300 hover:text-white transition-all shadow-md"
                      title="Color"
                    >
                      <Palette className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleEdit(et); }}
                      className="p-1 rounded-full bg-neutral-800 border border-neutral-600 hover:bg-neutral-700 hover:border-neutral-500 text-neutral-300 hover:text-white transition-all shadow-md"
                      title="Editar"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setDeletingId(et.id); setEditingId(null); setColorPickerId(null); }}
                      className="p-1 rounded-full bg-neutral-800 border border-neutral-600 hover:bg-red-900/60 hover:border-red-600/50 text-neutral-300 hover:text-red-400 transition-all shadow-md"
                      title="Eliminar"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                {/* Color picker popover */}
                {showColorPicker && (
                  <div className="absolute top-full left-0 mt-2 z-20">
                    <ColorSwatchPicker
                      currentColor={et.color}
                      onPick={(c) => handleColorChange(et.id, c)}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EntryTypeManager;
