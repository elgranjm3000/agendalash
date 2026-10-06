'use client';

import { useState, useEffect } from 'react';
import { LashProduct } from '@/lib/types';
import { apiCreate, apiDelete, apiList, apiUpdate } from '@/lib/api';

export function useLashProducts() {
  const [products, setProducts] = useState<LashProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiList<LashProduct>('lash-products')
      .then(p => setProducts(p.sort((a, b) => a.sku.localeCompare(b.sku))))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const addProduct = async (data: Omit<LashProduct, 'id' | 'createdAt' | 'updatedAt'>) => {
    const product = await apiCreate<LashProduct>('lash-products', data);
    setProducts(prev => [...prev, product].sort((a, b) => a.sku.localeCompare(b.sku)));
    return product;
  };

  const updateProduct = async (id: string, updates: Partial<LashProduct>) => {
    const updated = await apiUpdate<LashProduct>('lash-products', id, updates);
    setProducts(prev => prev.map(p => p.id === id ? updated : p).sort((a, b) => a.sku.localeCompare(b.sku)));
    return updated;
  };

  const deleteProduct = async (id: string) => {
    await apiDelete('lash-products', id);
    setProducts(prev => prev.filter(p => p.id !== id));
    return true;
  };

  return { products, loading, addProduct, updateProduct, deleteProduct };
}
