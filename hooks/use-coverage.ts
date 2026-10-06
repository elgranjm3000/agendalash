'use client';

import { useState, useEffect } from 'react';
import { CoverageResponse, CoverageRow } from '@/lib/types';
import { apiList } from '@/lib/api';

/**
 * Proyección de cobertura de insumos. Para super_admin devuelve además
 * el rollup del proveedor (`supplier`) y acepta organizationId opcional.
 */
export function useCoverage(organizationId?: string) {
  const [items, setItems] = useState<CoverageRow[]>([]);
  const [supplier, setSupplier] = useState<CoverageResponse['supplier']>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const suffix = organizationId ? `?organizationId=${encodeURIComponent(organizationId)}` : '';
    apiList<unknown>(`coverage${suffix}`).then(res => res as CoverageResponse)
      .then(res => {
        setItems(res.items ?? []);
        setSupplier(res.supplier ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [organizationId]);

  const alertCount = items.filter(i => i.coverageDays !== null && i.coverageDays <= i.thresholdDays).length;

  return { items, supplier, alertCount, loading };
}
