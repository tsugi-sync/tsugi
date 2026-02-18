/**
 * Tests for the progress-tracking logic for unlinked items.
 *
 * These test the pure logic extracted from background.ts:
 * - Updating lastProgress and pendingProgress for unlinked items
 * - Calculating the correct sync progress on first link
 */
import { describe, it, expect } from 'vitest';
import type { TrackedItem } from '@/lib/types';

// ─── Pure logic extracted from background.ts ──────────────────────────────────
// These mirror the logic in handleMediaDetected and handleLinkEntry so we can
// unit-test them without needing the Chrome extension APIs.

function updateUnlinkedProgress(item: TrackedItem, newProgress: number): TrackedItem {
    if (Object.keys(item.trackerIds).length > 0) return item; // already linked
    if (newProgress <= item.lastProgress) return item; // no advancement

    const updated = { ...item };
    updated.lastProgress = newProgress;
    updated.updatedAt = Date.now();
    if (!updated.pendingProgress) updated.pendingProgress = [];
    if (!updated.pendingProgress.includes(newProgress)) {
        updated.pendingProgress = [...updated.pendingProgress, newProgress];
    }
    return updated;
}

function calcSyncProgressOnLink(item: TrackedItem): number {
    const pendingMax = (item.pendingProgress?.length ?? 0) > 0
        ? Math.max(...item.pendingProgress!)
        : 0;
    return Math.max(item.lastProgress, pendingMax);
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeItem(overrides: Partial<TrackedItem> = {}): TrackedItem {
    return {
        platformKey: 'generic_manga:one-piece',
        platform: 'generic_manga',
        platformTitle: 'One Piece',
        type: 'manga',
        trackerIds: {},
        lastProgress: 1,
        status: 'reading',
        migrationStatus: 'active',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        ...overrides,
    };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('updateUnlinkedProgress', () => {
    it('updates lastProgress when user reads a higher chapter', () => {
        const item = makeItem({ lastProgress: 3 });
        const updated = updateUnlinkedProgress(item, 5);
        expect(updated.lastProgress).toBe(5);
    });

    it('adds new chapter to pendingProgress', () => {
        const item = makeItem({ lastProgress: 3 });
        const updated = updateUnlinkedProgress(item, 5);
        expect(updated.pendingProgress).toContain(5);
    });

    it('does not duplicate chapters in pendingProgress', () => {
        const item = makeItem({ lastProgress: 3, pendingProgress: [4, 5] });
        const updated = updateUnlinkedProgress(item, 5);
        expect(updated.pendingProgress!.filter(p => p === 5).length).toBe(1);
    });

    it('does not update if new progress is lower or equal', () => {
        const item = makeItem({ lastProgress: 7 });
        const updated = updateUnlinkedProgress(item, 3);
        expect(updated.lastProgress).toBe(7);
        expect(updated.pendingProgress).toBeUndefined();
    });

    it('does not update if item is already linked to a tracker', () => {
        const item = makeItem({ lastProgress: 3, trackerIds: { mal: 12345 } });
        const updated = updateUnlinkedProgress(item, 7);
        // Should be unchanged — linked items are handled by a different path
        expect(updated.lastProgress).toBe(3);
    });

    it('accumulates multiple chapters across reads', () => {
        let item = makeItem({ lastProgress: 1 });
        item = updateUnlinkedProgress(item, 2);
        item = updateUnlinkedProgress(item, 3);
        item = updateUnlinkedProgress(item, 4);
        expect(item.lastProgress).toBe(4);
        expect(item.pendingProgress).toEqual([2, 3, 4]);
    });
});

describe('calcSyncProgressOnLink', () => {
    it('returns lastProgress when no pending progress', () => {
        const item = makeItem({ lastProgress: 5 });
        expect(calcSyncProgressOnLink(item)).toBe(5);
    });

    it('returns max of pending progress when higher than lastProgress', () => {
        const item = makeItem({ lastProgress: 3, pendingProgress: [4, 5, 6] });
        expect(calcSyncProgressOnLink(item)).toBe(6);
    });

    it('returns lastProgress when it is higher than all pending', () => {
        const item = makeItem({ lastProgress: 10, pendingProgress: [4, 5, 6] });
        expect(calcSyncProgressOnLink(item)).toBe(10);
    });

    it('handles empty pendingProgress array', () => {
        const item = makeItem({ lastProgress: 7, pendingProgress: [] });
        expect(calcSyncProgressOnLink(item)).toBe(7);
    });

    it('handles the scenario: read ch1, ch2, ch3 then link → syncs at ch3', () => {
        let item = makeItem({ lastProgress: 1 });
        item = updateUnlinkedProgress(item, 2);
        item = updateUnlinkedProgress(item, 3);
        const syncAt = calcSyncProgressOnLink(item);
        expect(syncAt).toBe(3);
    });
});
