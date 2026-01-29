
# Add Team Leader Guide Card to Data Entry Page + KPI Formula Info Buttons

## Overview

This plan addresses two requests:
1. **Move/add the Team Leader Data Entry Guide card** to the department data entry page (`/department/:departmentId/data-entry`)
2. **Add formula info buttons** (ℹ️) next to each KPI that display the calculation formula when clicked

---

## Current State Analysis

### Team Leader Guide Card
- Currently exists in `src/pages/Index.tsx` (lines 181-203)
- Shows for department heads who are not admins
- User wants it on the **data entry page** instead/also

### KPI Formulas
- The `indicators` table has a `formula` column containing calculation formulas
- Example formulas from database:
  - "Builds with no automated step skipped / Total builds generated × 100"
  - "(Net New ARR − Churned ARR) / Starting ARR × 100"
- Currently **not fetched** in `DepartmentDataEntry.tsx` (line 176 only selects `id, name, current_value, target_value, unit, frequency, evidence_url`)
- Need to add `formula` to the interface and query

---

## Implementation Plan

### Step 1: Add `formula` to Indicator Interface and Query

**File**: `src/pages/DepartmentDataEntry.tsx`

Update the Indicator interface (line 21-35):
```typescript
interface Indicator {
    id: string;
    name: string;
    current_value: number | null;
    target_value: number | null;
    unit: string | null;
    frequency: string | null;
    evidence_url: string | null;
    formula: string | null;  // ADD THIS
    kr_id: string;
    kr_name: string;
    fo_id: string;
    fo_name: string;
    previous_value?: number | null;
    previous_period?: string | null;
}
```

Update the database query (line 174-178):
```typescript
const { data: inds } = await supabase
    .from('indicators')
    .select('id, name, current_value, target_value, unit, frequency, evidence_url, formula')  // ADD formula
    .eq('key_result_id', kr.id)
    .order('name');
```

### Step 2: Add Info Icon Import

**File**: `src/pages/DepartmentDataEntry.tsx`

Add `Info` to the lucide-react imports (line 13-17):
```typescript
import {
    Save, Loader2, ChevronDown, ChevronRight, Paperclip,
    TrendingUp, Target, Calendar, Filter, CheckCircle2, AlertCircle,
    History, Upload, Link as LinkIcon, Info, ClipboardCheck  // ADD Info, ClipboardCheck
} from 'lucide-react';
```

### Step 3: Add Tooltip Import

**File**: `src/pages/DepartmentDataEntry.tsx`

Add tooltip component import:
```typescript
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
```

### Step 4: Add Team Leader Guide Card to Data Entry Page

**File**: `src/pages/DepartmentDataEntry.tsx`

Add guide card after the header section (around line 611), before the Stats Card:

```typescript
{/* Team Leader Data Entry Guide */}
<Card className="border-primary/30 bg-primary/5">
    <CardContent className="p-4">
        <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-primary/10">
                <ClipboardCheck className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
                <h3 className="font-semibold text-base mb-2">Team Leader Data Entry Guide</h3>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Select the reporting period using the date picker</li>
                    <li>Enter current values for each KPI (click the ℹ️ icon to see the formula)</li>
                    <li>Attach evidence (file upload or link) OR provide a reason if unavailable</li>
                    <li>Click individual Save buttons or "Save All Changes" when done</li>
                </ol>
            </div>
        </div>
    </CardContent>
</Card>
```

### Step 5: Add Info Button to Each KPI Row

**File**: `src/pages/DepartmentDataEntry.tsx`

Update the grid column headers (line 742) to add a column for the info icon:
```typescript
<div className="grid grid-cols-[0.3fr,2fr,0.7fr,0.7fr,1fr,0.7fr,0.5fr,0.5fr,0.5fr,1.2fr,1.5fr,0.5fr,0.5fr,0.5fr] gap-2 ...">
    <div className="text-center">ℹ️</div>  {/* NEW COLUMN */}
    <div>Indicator</div>
    ...
</div>
```

Update each indicator row (line 775) to add the info button with tooltip:
```typescript
<div
    key={ind.id}
    className={cn(
        "grid grid-cols-[0.3fr,2fr,0.7fr,0.7fr,1fr,0.7fr,0.5fr,0.5fr,0.5fr,1.2fr,1.5fr,0.5fr,0.5fr,0.5fr] gap-2 items-center ...",
        ...
    )}
>
    {/* Formula Info Button */}
    <div className="flex justify-center">
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    type="button"
                    className="p-1 rounded-full hover:bg-muted transition-colors"
                    onClick={(e) => e.stopPropagation()}
                >
                    <Info className="h-4 w-4 text-muted-foreground hover:text-primary" />
                </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-xs">
                <div className="space-y-1">
                    <p className="font-medium text-xs">Calculation Formula</p>
                    <p className="text-xs">{ind.formula || 'No formula defined'}</p>
                </div>
            </TooltipContent>
        </Tooltip>
    </div>
    
    {/* Rest of the indicator row... */}
    <div>
        <p className="text-sm font-medium">{ind.name}</p>
        ...
    </div>
    ...
</div>
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/DepartmentDataEntry.tsx` | Add formula to interface & query, add guide card, add info button column with tooltips |

---

## Visual Preview

### Guide Card (at top of page)
```text
┌─────────────────────────────────────────────────────────────────────┐
│ 📋 Team Leader Data Entry Guide                                     │
│                                                                     │
│ 1. Select the reporting period using the date picker                │
│ 2. Enter current values for each KPI (click ℹ️ to see formula)      │
│ 3. Attach evidence (file/link) OR provide a reason if unavailable  │
│ 4. Click Save when done                                            │
└─────────────────────────────────────────────────────────────────────┘
```

### KPI Row with Info Button
```text
┌────┬────────────────────────┬────────┬────────┬─────────┬────────┐
│ ℹ️ │ Indicator              │ Target │ Prev   │ Current │ ...    │
├────┼────────────────────────┼────────┼────────┼─────────┼────────┤
│ ⓘ  │ Build Automation Rate  │ 95%    │ 87     │ [____]  │ ...    │
│    │                        │        │        │         │        │
│    └── Hover reveals: "Calculation Formula:                      │
│        Builds with no automated step skipped /                   │
│        Total builds generated × 100"                             │
└────┴────────────────────────┴────────┴────────┴─────────┴────────┘
```

---

## Expected Outcomes

After implementation:
1. Team leaders will see a clear instruction guide at the top of the data entry page
2. Each KPI will have an info (ℹ️) button that shows the calculation formula on hover
3. The formula helps team leaders understand exactly what data they need to input
