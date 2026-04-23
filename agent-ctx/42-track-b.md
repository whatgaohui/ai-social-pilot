# Task 42-B: Integrate iteration 41 AI writing and pipeline components into content workspace

## Work Summary

Integrated 4 iteration 41 components into the content workspace (`content-workspace.tsx`) as collapsible sections below the existing tool tabs.

### Changes Made

**Modified file**: `src/components/right-panel/content-workspace.tsx` (851 → 1059 lines, +208 lines)

#### 1. Dynamic Imports (ssr: false)
Added `next/dynamic` imports for all 4 new components to prevent SSR OOM issues:
- `ContentPipelineKanban` from `content-pipeline-kanban.tsx`
- `AISmartBatchPanel` from `ai-smart-batch-panel.tsx`
- `ContentHealthCard` from `content-health-card.tsx`
- `AIWritingCoach` from `ai-writing-coach.tsx`

Each dynamic import includes a `SkeletonBox` loading placeholder with pulse animation.

#### 2. CollapsibleSectionHeader Component
Created a reusable `CollapsibleSectionHeader` sub-component with:
- Gradient icon (7x7 rounded-lg with `bg-gradient-to-br`)
- Section title text
- Badge indicator (contextual text like post count, dimension count)
- ChevronRight arrow with framer-motion rotation animation (0→90° on open)
- Hover states and group transitions

#### 3. State Management
Added `expandedSections` state (Record<string, boolean>) with all 4 sections defaulting to `false` (collapsed).
Added `toggleSection` callback using `useCallback` for stable references.

#### 4. Collapsible Sections Integration
Added 4 collapsible sections in a new "高级工具" (Advanced Tools) group at the bottom of the workspace:

| Section | Title | Icon | Gradient | Badge |
|---------|-------|------|----------|-------|
| kanban | 内容管线看板 | Layers | violet→purple | `{postCount} 条` |
| batch | AI批量操作 | Bot | amber→orange | `5 项` |
| health | 内容健康度 | Activity | emerald→teal | `5 维度` |
| coach | AI写作教练 | Wand2 | rose→pink | `6 维度` |

Each section uses `expandCollapse` animation variants (consistent with existing WorkspaceSection pattern) with `AnimatePresence` for smooth enter/exit transitions.

#### 5. New Icon Imports
Added 3 new icons from lucide-react: `ChevronRight`, `Activity`, `Wand2`.

### QA Results
- **ESLint**: 0 errors, 0 warnings (EXIT_CODE=0)
- **Next.js Build**: ✅ Compiled successfully (11.8s), 69 static pages generated. Final standalone copy step failed due to sandbox filesystem limitation (ENOENT temp file), NOT a code issue.
- **Code Quality**: All dynamic imports use `ssr: false` pattern consistent with iteration 41-fix fixes for SSR OOM. Collapsible animations use existing `expandCollapse` variants.
