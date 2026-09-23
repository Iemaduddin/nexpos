import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Pagination({
    from,
    to,
    total,
    currentPage,
    lastPage,
    onPage,
}: {
    from: number | null;
    to: number | null;
    total: number;
    currentPage: number;
    lastPage: number;
    onPage: (page: number) => void;
}) {
    return (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <p className="text-sm text-muted-foreground tabular-nums">
                {total === 0
                    ? 'Tidak ada data'
                    : `Menampilkan ${from}–${to} dari ${total} data`}
            </p>
            {lastPage > 1 && (
                <div className="flex items-center gap-1">
                    <Button
                        variant="outline"
                        size="icon"
                        disabled={currentPage <= 1}
                        onClick={() => onPage(currentPage - 1)}
                        aria-label="Halaman sebelumnya"
                    >
                        <ChevronLeft className="size-4" />
                    </Button>
                    <span className="min-w-20 px-2 text-center text-sm tabular-nums">
                        {currentPage} / {lastPage}
                    </span>
                    <Button
                        variant="outline"
                        size="icon"
                        disabled={currentPage >= lastPage}
                        onClick={() => onPage(currentPage + 1)}
                        aria-label="Halaman berikutnya"
                    >
                        <ChevronRight className="size-4" />
                    </Button>
                </div>
            )}
        </div>
    );
}
