import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Fetches all rows from a Supabase query by handling pagination automatically.
 * Supabase has a hard limit of 1000 rows per query, so this function fetches in batches.
 * 
 * @param queryBuilder - The Supabase query builder (e.g., supabase.from('table').select('*'))
 * @param batchSize - Number of rows to fetch per batch (default: 1000, max: 1000)
 * @returns Promise with all fetched data
 * 
 * @example
 * const { data, error } = await fetchAllRows(
 *   supabase.from('employee_ratings').select('*').eq('status', 'approved')
 * );
 */
export async function fetchAllRows<T = any>(
  queryBuilder: any,
  batchSize: number = 1000
): Promise<{ data: T[] | null; error: any }> {
  const actualBatchSize = Math.min(batchSize, 1000); // Enforce Supabase limit
  let allData: T[] = [];
  let hasMore = true;
  let offset = 0;

  try {
    while (hasMore) {
      const { data, error } = await queryBuilder
        .range(offset, offset + actualBatchSize - 1);

      if (error) {
        console.error('Error fetching batch:', error);
        return { data: null, error };
      }

      if (data && data.length > 0) {
        allData = [...allData, ...data];
        offset += actualBatchSize;
        hasMore = data.length === actualBatchSize;
        
        console.log(`📊 Fetched ${data.length} rows (total: ${allData.length})`);
      } else {
        hasMore = false;
      }
    }

    console.log(`✅ Fetch complete: ${allData.length} total rows`);
    return { data: allData, error: null };
  } catch (error) {
    console.error('Error in fetchAllRows:', error);
    return { data: null, error };
  }
}

/**
 * Fetches all rows with progress callback for large datasets.
 * 
 * @param queryBuilder - The Supabase query builder
 * @param onProgress - Callback function called after each batch with (currentCount, batch)
 * @param batchSize - Number of rows to fetch per batch (default: 1000, max: 1000)
 * @returns Promise with all fetched data
 */
export async function fetchAllRowsWithProgress<T = any>(
  queryBuilder: any,
  onProgress?: (currentCount: number, batch: T[]) => void,
  batchSize: number = 1000
): Promise<{ data: T[] | null; error: any }> {
  const actualBatchSize = Math.min(batchSize, 1000);
  let allData: T[] = [];
  let hasMore = true;
  let offset = 0;

  try {
    while (hasMore) {
      const { data, error } = await queryBuilder
        .range(offset, offset + actualBatchSize - 1);

      if (error) {
        console.error('Error fetching batch:', error);
        return { data: null, error };
      }

      if (data && data.length > 0) {
        allData = [...allData, ...data];
        offset += actualBatchSize;
        hasMore = data.length === actualBatchSize;
        
        if (onProgress) {
          onProgress(allData.length, data);
        }
      } else {
        hasMore = false;
      }
    }

    return { data: allData, error: null };
  } catch (error) {
    console.error('Error in fetchAllRowsWithProgress:', error);
    return { data: null, error };
  }
}
