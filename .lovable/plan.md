

# Show "What Was Updated" in Activity Logs

## Problem Summary

The activity log correctly saves the old and new values for Business Outcome changes, but the display components only show value changes for **indicators**, not for **org_objective** (Business Outcome) updates.

| Component | Current Behavior | Needed Behavior |
|-----------|------------------|-----------------|
| ActivityTimelineMini | Only shows value change for `indicator` type | Show value change for ALL entity types including `org_objective` |
| ActivityTimelineWidget | Same limitation | Same fix needed |

---

## Database Confirmation

The data IS being stored correctly:
```json
{
  "entity_type": "org_objective",
  "entity_name": "Business Outcome",
  "old_value": {"value": "3X Revenue"},
  "new_value": {"value": "3X Revenue"}
}
```

The issue is purely in the display logic.

---

## Solution

### Step 1: Update ActivityTimelineMini.tsx

Currently (lines 156-167):
```typescript
{/* Value Change - ONLY for indicators */}
{log.entity_type === 'indicator' && log.action === 'update' && (
    <div className="flex items-center gap-1 text-xs">
        <span className="font-mono text-muted-foreground">
            {log.old_value?.current_value ?? 'Empty'}
        </span>
        <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
        <span className="font-mono text-primary font-medium">
            {log.new_value?.current_value}
        </span>
    </div>
)}
```

Change to show value changes for **all entity types**:
```typescript
{/* Value Change - for any update with old/new values */}
{log.action === 'update' && (log.old_value || log.new_value) && (
    <div className="flex items-center gap-1 text-xs">
        <span className="font-mono text-muted-foreground">
            {getDisplayValue(log.old_value)}
        </span>
        <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
        <span className="font-mono text-primary font-medium">
            {getDisplayValue(log.new_value)}
        </span>
    </div>
)}
```

Add helper function:
```typescript
const getDisplayValue = (value: any): string => {
    if (!value) return 'Empty';
    // Handle indicator values
    if (value.current_value !== undefined) return String(value.current_value);
    // Handle org_objective/business outcome values
    if (value.value !== undefined) return value.value || 'Empty';
    // Handle other structures
    return JSON.stringify(value);
};
```

### Step 2: Update ActivityTimelineWidget.tsx

Apply the same logic to show value changes for all entity types, not just indicators.

Add to the display section (after line 221):
```typescript
{/* Value Change for all entity types */}
{log.action === 'update' && (log.old_value || log.new_value) && (
    <div className="flex items-center gap-1 text-xs">
        <span className="font-mono text-muted-foreground">
            {getDisplayValue(log.old_value)}
        </span>
        <span className="text-muted-foreground">→</span>
        <span className="font-mono text-primary font-medium">
            {getDisplayValue(log.new_value)}
        </span>
    </div>
)}
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/ActivityTimelineMini.tsx` | Add `getDisplayValue` helper, update value change display to work for all entity types |
| `src/components/ActivityTimelineWidget.tsx` | Add `getDisplayValue` helper, add value change display section |

---

## Expected Result

After implementation, the activity log will show:
```
Business Outcome
Updated by Vinayak Kapoor
"Old Value" → "New Value"
📅 less than a minute ago
```

Instead of just:
```
Business Outcome
Updated by Vinayak Kapoor
📅 less than a minute ago
```

