

# Update Visual Template in DepartmentUploader Component

## Summary

Update the visual template preview in `DepartmentUploader.tsx` to show the 9-column format with Security & Technology sample data. This change will appear under **Team & Uploads → OKR Upload** on the Manage Data page (`/data`).

## Current State (What You See Now)

Location: `/data` → Team & Uploads tab → OKR Upload sub-tab

```text
8-Column Template:
| Dept | Owner | Org Objective | Func. Obj | Key Result | Indicator | Formula | Target |
|------|-------|---------------|-----------|------------|-----------|---------|--------|
| CS   | Tanvi | Max CS        | Adoption  | +25% usage | Adoption Rate | (a/b)*100 | 80 |
```

## New State (After Update)

```text
9-Column Template:
| Dept | Owner | Org Objective | Func. Obj | Formula | Key Result | Formula (BODMAS) | KPI | Formula |
|------|-------|---------------|-----------|---------|------------|------------------|-----|---------|
| S&T  | Rishiraj | Op. Excellence | Partner Enablement | (KR1 % + KR2 %) / 2 | Partner Pre-Sales... | MIN((Actual/Target)×100,100) | Pre-Sales Readiness % | (Ready/Total)×100 |
```

---

## File to Modify

| File | Location |
|------|----------|
| `src/components/admin/DepartmentUploader.tsx` | Lines 430-458 |

---

## Technical Details

### Changes (Lines 430-458)

**Before:**
- Label: "8-Column Template"
- Headers: Dept, Owner, Org Objective, Func. Obj, Key Result, Indicator, Formula, Target
- Sample: CS, Tanvi, Max CS, Adoption, +25% usage, Adoption Rate, (a/b)*100, 80

**After:**
- Label: "9-Column Template"
- Headers: Dept, Owner, Org Objective, Func. Obj, Formula, Key Result, Formula (BODMAS), KPI, Formula
- Sample: S&T, Rishiraj, Op. Excellence, Partner Enablement, (KR1 % + KR2 %) / 2, Partner Pre-Sales..., MIN((Actual/Target)×100,100), Pre-Sales Readiness %, (Ready/Total)×100

### Updated Code

```tsx
<div className="text-xs space-y-3 text-muted-foreground">
  <p className="font-medium text-foreground">9-Column Template:</p>
  <div className="bg-background rounded p-2 font-mono overflow-x-auto">
    <table className="w-full text-left">
      <thead>
        <tr className="border-b border-border">
          <th className="p-1">Dept</th>
          <th className="p-1">Owner</th>
          <th className="p-1">Org Objective</th>
          <th className="p-1">Func. Obj</th>
          <th className="p-1">Formula</th>
          <th className="p-1">Key Result</th>
          <th className="p-1">Formula (BODMAS)</th>
          <th className="p-1">KPI</th>
          <th className="p-1">Formula</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td className="p-1">S&T</td>
          <td className="p-1">Rishiraj</td>
          <td className="p-1">Op. Excellence</td>
          <td className="p-1">Partner Enablement</td>
          <td className="p-1">(KR1 % + KR2 %) / 2</td>
          <td className="p-1">Partner Pre-Sales...</td>
          <td className="p-1">MIN((Actual/Target)×100,100)</td>
          <td className="p-1">Pre-Sales Readiness %</td>
          <td className="p-1">(Ready/Total)×100</td>
        </tr>
      </tbody>
    </table>
  </div>
  <p className="mt-2">
    <strong>Universal RAG:</strong> 1-50 Red | 51-75 Amber | 76-100 Green
  </p>
</div>
```

---

## Result

After implementation:
- The visual preview under Team & Uploads → OKR Upload will show the 9-column format
- Sample data will use Security & Technology (S&T) department with Rishiraj as owner
- Column headers will match your uploaded template exactly
- Formula columns will show your actual formula patterns

