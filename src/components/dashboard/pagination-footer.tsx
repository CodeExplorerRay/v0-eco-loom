'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PaginationFooterProps {
  summary: string;
  page: number;
  totalPages: number;
  onPrevious: () => void;
  onNext: () => void;
  isLoading?: boolean;
  previousDisabled?: boolean;
  nextDisabled?: boolean;
}

export function PaginationFooter({
  summary,
  page,
  totalPages,
  onPrevious,
  onNext,
  isLoading = false,
  previousDisabled = false,
  nextDisabled = false,
}: PaginationFooterProps) {
  return (
    <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">{summary}</p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={previousDisabled || isLoading}
          onClick={onPrevious}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Previous
        </Button>
        <span className="text-sm text-muted-foreground">
          Page {page} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={nextDisabled || isLoading}
          onClick={onNext}
        >
          Next
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
