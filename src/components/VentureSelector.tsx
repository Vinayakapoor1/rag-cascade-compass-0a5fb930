import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Check, Rocket } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Venture {
  id: string;
  name: string;
  display_name: string;
  is_active: boolean;
}

interface VentureSelectorProps {
  selectedVentureId: string | null;
  onSelect: (ventureId: string) => void;
}

export function VentureSelector({ selectedVentureId, onSelect }: VentureSelectorProps) {
  const { data: ventures, isLoading } = useQuery({
    queryKey: ['ventures'],
    queryFn: async (): Promise<Venture[]> => {
      const { data, error } = await supabase
        .from('ventures')
        .select('id, name, display_name, is_active')
        .order('is_active', { ascending: false })
        .order('name');
      if (error) throw error;
      return data || [];
    },
    staleTime: 300000,
  });

  const selected = ventures?.find(v => v.id === selectedVentureId);
  const displayLabel = selected?.display_name || 'Select Venture';

  if (isLoading) {
    return (
      <Button variant="outline" size="sm" disabled>
        <Rocket className="h-4 w-4 mr-1.5" />
        Loading...
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Rocket className="h-4 w-4" />
          {displayLabel}
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {ventures?.map(venture => (
          <DropdownMenuItem
            key={venture.id}
            disabled={!venture.is_active}
            onClick={() => venture.is_active && onSelect(venture.id)}
            className={cn(
              'flex items-center justify-between',
              !venture.is_active && 'opacity-50 cursor-not-allowed'
            )}
          >
            <span className="flex items-center gap-2">
              {selectedVentureId === venture.id && (
                <Check className="h-3.5 w-3.5 text-primary" />
              )}
              <span className={selectedVentureId !== venture.id ? 'ml-5.5' : ''}>
                {venture.display_name}
              </span>
            </span>
            {!venture.is_active && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                Coming Soon
              </Badge>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
