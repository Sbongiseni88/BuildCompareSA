"use client";

import { useEffect, useCallback } from 'react';

interface KeyboardShortcut {
    key: string;
    ctrlKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
    action: () => void;
    description: string;
}

/**
 * Hook for registering global keyboard shortcuts.
 * Example: Ctrl+K to open search, Ctrl+/ to open AI, Esc to close modals.
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
    const handleKeyDown = useCallback(
        (event: KeyboardEvent) => {
            // Don't trigger shortcuts when typing in inputs, textareas, or contentEditable
            const target = event.target as HTMLElement;
            if (
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.tagName === 'SELECT' ||
                target.isContentEditable
            ) {
                // Only allow Escape key when in inputs
                if (event.key !== 'Escape') return;
            }

            for (const shortcut of shortcuts) {
                const ctrlMatch = shortcut.ctrlKey
                    ? event.ctrlKey || event.metaKey
                    : !event.ctrlKey && !event.metaKey;
                const shiftMatch = shortcut.shiftKey ? event.shiftKey : !event.shiftKey;
                const altMatch = shortcut.altKey ? event.altKey : !event.altKey;

                if (
                    event.key.toLowerCase() === shortcut.key.toLowerCase() &&
                    ctrlMatch &&
                    shiftMatch &&
                    altMatch
                ) {
                    event.preventDefault();
                    shortcut.action();
                    break;
                }
            }
        },
        [shortcuts]
    );

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
}
