import { Monitor, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppearance } from '@/hooks/use-appearance';

export function AppearanceToggle() {
    const { appearance, updateAppearance } = useAppearance();

    const next =
        appearance === 'light'
            ? 'dark'
            : appearance === 'dark'
              ? 'system'
              : 'light';

    const label =
        appearance === 'light'
            ? 'Mode terang aktif, klik untuk mode gelap'
            : appearance === 'dark'
              ? 'Mode gelap aktif, klik untuk mengikuti sistem'
              : 'Mengikuti sistem, klik untuk mode terang';

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={() => updateAppearance(next)}
            title={label}
            aria-label={label}
        >
            {appearance === 'light' ? (
                <Sun className="size-4" />
            ) : appearance === 'dark' ? (
                <Moon className="size-4" />
            ) : (
                <Monitor className="size-4" />
            )}
        </Button>
    );
}
