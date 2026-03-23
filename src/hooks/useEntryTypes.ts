import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// 12-color palette for auto-assignment
export const COLOR_PALETTE = [
  '#06b6d4', // cyan
  '#8b5cf6', // violet
  '#f59e0b', // amber
  '#10b981', // emerald
  '#ef4444', // red
  '#ec4899', // pink
  '#3b82f6', // blue
  '#f97316', // orange
  '#14b8a6', // teal
  '#a855f7', // purple
  '#84cc16', // lime
  '#e11d48', // rose
];

export interface EntryType {
  id: string;
  user_id: string;
  name: string;
  color: string;
  usage_count: number;
  created_at: string | null;
}

const MAX_NAME_LENGTH = 30;

export function useEntryTypes() {
  const [entryTypes, setEntryTypes] = useState<EntryType[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEntryTypes = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('entry_types')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (error) throw error;
      setEntryTypes(data || []);
    } catch (err: any) {
      console.error('Error fetching entry types:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntryTypes();
  }, [fetchEntryTypes]);

  const addEntryType = useCallback(async (name: string, selectedColor?: string): Promise<EntryType | null> => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error('El nombre no puede estar vacío.');
      return null;
    }
    if (trimmed.length > MAX_NAME_LENGTH) {
      toast.error(`Máximo ${MAX_NAME_LENGTH} caracteres.`);
      return null;
    }

    // Case-insensitive duplicate check
    const duplicate = entryTypes.find(
      (et) => et.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) {
      toast.error(`"${trimmed}" ya existe.`);
      return null;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No autenticado');

      const color = selectedColor || COLOR_PALETTE[entryTypes.length % COLOR_PALETTE.length];

      const { data, error } = await supabase
        .from('entry_types')
        .insert({ user_id: user.id, name: trimmed, color })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          toast.error(`"${trimmed}" ya existe.`);
          return null;
        }
        throw error;
      }

      setEntryTypes((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      toast.success(`"${trimmed}" creado.`);
      return data;
    } catch (err: any) {
      console.error('Error adding entry type:', err);
      toast.error('Error al crear el tipo de entrada.');
      return null;
    }
  }, [entryTypes]);

  const updateEntryType = useCallback(async (id: string, newName: string): Promise<boolean> => {
    const trimmed = newName.trim();
    if (!trimmed) {
      toast.error('El nombre no puede estar vacío.');
      return false;
    }
    if (trimmed.length > MAX_NAME_LENGTH) {
      toast.error(`Máximo ${MAX_NAME_LENGTH} caracteres.`);
      return false;
    }

    // Case-insensitive duplicate check (exclude current)
    const duplicate = entryTypes.find(
      (et) => et.id !== id && et.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) {
      toast.error(`"${trimmed}" ya existe.`);
      return false;
    }

    try {
      const { error } = await supabase
        .from('entry_types')
        .update({ name: trimmed })
        .eq('id', id);

      if (error) {
        if (error.code === '23505') {
          toast.error(`"${trimmed}" ya existe.`);
          return false;
        }
        throw error;
      }

      setEntryTypes((prev) =>
        prev
          .map((et) => (et.id === id ? { ...et, name: trimmed } : et))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      toast.success(`Renombrado a "${trimmed}".`);
      return true;
    } catch (err: any) {
      console.error('Error updating entry type:', err);
      toast.error('Error al actualizar.');
      return false;
    }
  }, [entryTypes]);

  const deleteEntryType = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('entry_types')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setEntryTypes((prev) => prev.filter((et) => et.id !== id));
      toast.success('Tipo de entrada eliminado.');
      return true;
    } catch (err: any) {
      console.error('Error deleting entry type:', err);
      toast.error('Error al eliminar.');
      return false;
    }
  }, []);

  const updateEntryTypeColor = useCallback(async (id: string, newColor: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('entry_types')
        .update({ color: newColor })
        .eq('id', id);

      if (error) throw error;

      setEntryTypes((prev) =>
        prev.map((et) => (et.id === id ? { ...et, color: newColor } : et))
      );
      return true;
    } catch (err: any) {
      console.error('Error updating entry type color:', err);
      toast.error('Error al cambiar el color.');
      return false;
    }
  }, []);

  const incrementUsage = useCallback(async (names: string[]) => {
    if (!names.length) return;
    try {
      for (const name of names) {
        const found = entryTypes.find((et) => et.name === name);
        if (found) {
          await supabase
            .from('entry_types')
            .update({ usage_count: found.usage_count + 1 })
            .eq('id', found.id);
        }
      }
    } catch (err) {
      console.error('Error incrementing usage:', err);
    }
  }, [entryTypes]);

  return {
    entryTypes,
    loading,
    addEntryType,
    updateEntryType,
    updateEntryTypeColor,
    deleteEntryType,
    incrementUsage,
    refetch: fetchEntryTypes,
  };
}
