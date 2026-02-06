
# Add Org Objective Classification Editor in Admin Dashboard

## Overview

Add a dedicated section in the Data Management page to manage Org Objectives, including the ability to edit the **CORE/Enabler** classification, name, color, and description.

---

## Current State

- The `org_objectives` table has: `id`, `name`, `classification` (CORE/Enabler), `color`, `description`, `business_outcome`
- The OKR Hierarchy Tab only manages Departments and their children - no UI for editing Org Objectives
- Classification can only be set via Excel import currently

---

## Solution

Create a new **Org Objectives Management Card** that displays above or within the OKR Structure tab, allowing admins to:
1. View all Org Objectives in a table/list
2. Edit each objective's classification (CORE/Enabler), color, and name
3. Save changes with immediate feedback

---

## Files to Create/Modify

### 1. Create `src/components/admin/OrgObjectivesManager.tsx` (NEW)

A new component that provides a table view of all Org Objectives with inline editing:

```tsx
// Key features:
- Fetches all org_objectives from database
- Displays in a table with columns: Name, Classification, Color, Actions
- Classification dropdown: CORE / Enabler
- Color dropdown matching existing color options
- Save button per row
- Toast notifications for success/failure
```

**Component Structure:**
```text
┌─────────────────────────────────────────────────────────────────┐
│  🎯 Org Objectives                                    [Refresh] │
│  Manage classification and settings for organizational goals   │
├─────────────────────────────────────────────────────────────────┤
│  Name                          │ Classification │ Color │ Save  │
├────────────────────────────────┼────────────────┼───────┼───────┤
│  Brand & Reputation            │ [CORE ▾]       │ [🟢▾] │ [💾]  │
│  Customer Experience & Success │ [CORE ▾]       │ [🟣▾] │ [💾]  │
│  Sustainable Growth            │ [Enabler ▾]    │ [🔵▾] │ [💾]  │
│  Operational Excellence...     │ [CORE ▾]       │ [🟠▾] │ [💾]  │
│  Talent Development & Culture  │ [Enabler ▾]    │ [🟡▾] │ [💾]  │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Modify `src/pages/DataManagement.tsx`

Add the new OrgObjectivesManager component to the OKR Structure tab:

```tsx
// In the "okr" TabsContent, add before OKRHierarchyTab:
<TabsContent value="okr" className="space-y-4">
  <OrgObjectivesManager />  {/* NEW - Add this */}
  <OKRHierarchyTab key={refreshKey} />
</TabsContent>
```

---

## Technical Implementation

### OrgObjectivesManager Component

```tsx
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Target, Save, RefreshCw, Loader2 } from 'lucide-react';

interface OrgObjective {
  id: string;
  name: string;
  classification: string;
  color: string;
  description: string | null;
}

const CLASSIFICATION_OPTIONS = ['CORE', 'Enabler'];

const COLOR_OPTIONS = [
  { value: 'green', label: 'Green', class: 'bg-green-500' },
  { value: 'purple', label: 'Purple', class: 'bg-purple-500' },
  { value: 'blue', label: 'Blue', class: 'bg-blue-500' },
  { value: 'yellow', label: 'Yellow', class: 'bg-yellow-500' },
  { value: 'orange', label: 'Orange', class: 'bg-orange-500' },
  { value: 'teal', label: 'Teal', class: 'bg-teal-500' },
];

export function OrgObjectivesManager() {
  const [objectives, setObjectives] = useState<OrgObjective[]>([]);
  const [loading, setLoading] = useState(true);
  const [editedValues, setEditedValues] = useState<Record<string, Partial<OrgObjective>>>({});
  const [saving, setSaving] = useState<string | null>(null);

  // Fetch org objectives
  // Handle classification/color changes
  // Save individual objective
  // Render table with inline editing
}
```

### Key Features

| Feature | Description |
|---------|-------------|
| Classification Dropdown | Select between "CORE" and "Enabler" |
| Color Dropdown | Select from 6 identity colors with color preview |
| Row-level Save | Each objective has its own save button |
| Loading States | Shows spinner while loading/saving |
| Dirty State Tracking | Only enables save when values have changed |
| Toast Feedback | Success/error messages on save |

---

## User Flow

1. Navigate to **Data Management → OKR Structure** tab
2. See new **Org Objectives** card at the top
3. Click the classification dropdown for any objective
4. Select **CORE** or **Enabler**
5. Click **Save** button for that row
6. See confirmation toast
7. Portfolio page reflects the updated classification

---

## Benefits

1. **Direct editing**: No need to re-import Excel to change classification
2. **Immediate feedback**: See changes reflected in the Portfolio view
3. **Consistent location**: Part of the existing Data Management workflow
4. **Admin-only**: Only visible to admin users (inherited from page access control)
