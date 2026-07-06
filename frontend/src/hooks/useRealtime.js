import { useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

let supabase = null;
if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
}

/**
 * Hook to subscribe to Supabase Realtime changes on a table.
 * @param {string} table - Table name to listen on
 * @param {function} callback - Called on any change
 * @param {object} filter - Optional filter like { column: 'status', value: 'WAITING' }
 */
export function useRealtime(table, callback, filter = null) {
    const cbRef = useRef(callback);
    cbRef.current = callback;

    useEffect(() => {
        if (!supabase) return;

        const channel = supabase
            .channel(`realtime-${table}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: table,
                    ...(filter ? { filter: `${filter.column}=eq.${filter.value}` } : {})
                },
                (payload) => {
                    cbRef.current(payload);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [table, filter?.column, filter?.value]);
}

export { supabase };
