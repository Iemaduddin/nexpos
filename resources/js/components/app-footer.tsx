export function AppFooter() {
    const year = new Date().getFullYear();

    return (
        <footer className="mt-auto flex shrink-0 items-center justify-between gap-2 border-t px-4 py-3 text-xs text-muted-foreground md:px-6 print:hidden">
            <p>&copy; {year} NEXPOS &middot; Toko Utama</p>
            <p className="tabular-nums">v0.1.0</p>
        </footer>
    );
}
