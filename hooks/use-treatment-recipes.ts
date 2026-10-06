'use client';

import { useState, useEffect } from 'react';
import { TreatmentRecipe } from '@/lib/types';
import { apiCreate, apiDelete, apiList, apiUpdate } from '@/lib/api';

export function useTreatmentRecipes() {
  const [recipes, setRecipes] = useState<TreatmentRecipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiList<TreatmentRecipe>('treatment-recipes')
      .then(r => setRecipes(r.sort((a, b) => a.name.localeCompare(b.name))))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const addRecipe = async (data: Omit<TreatmentRecipe, 'id' | 'createdAt' | 'updatedAt'>) => {
    const recipe = await apiCreate<TreatmentRecipe>('treatment-recipes', data);
    setRecipes(prev => [...prev, recipe].sort((a, b) => a.name.localeCompare(b.name)));
    return recipe;
  };

  const updateRecipe = async (id: string, updates: Partial<TreatmentRecipe>) => {
    const updated = await apiUpdate<TreatmentRecipe>('treatment-recipes', id, updates);
    setRecipes(prev => prev.map(r => r.id === id ? updated : r).sort((a, b) => a.name.localeCompare(b.name)));
    return updated;
  };

  const deleteRecipe = async (id: string) => {
    await apiDelete('treatment-recipes', id);
    setRecipes(prev => prev.filter(r => r.id !== id));
    return true;
  };

  return { recipes, loading, addRecipe, updateRecipe, deleteRecipe };
}
