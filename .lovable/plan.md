

# Comprehensive QA: Data Entry Bugs, Test Cases & Improvements

---

## SECTION A: DATA ENTRY BUGS FOUND

### BUG-DE1: No Unsaved Changes Warning on Navigation (HIGH)
**Files**: `CSMDataEntryMatrix.tsx`, `DepartmentDataEntry.tsx`, `SalesKPIScoringGrid.tsx`
None of the data entry pages implement a `beforeunload` listener or React Router navigation blocker. If a user fills in 30+ cells and accidentally navigates away (clicks a link, presses back), all work is silently lost.

### BUG-DE2: SalesKPIScoringGrid `hasChanges` Always True (MEDIUM)
**File**: `SalesKPIScoringGrid.tsx:147`
`hasChanges` is `Object.keys(selections).length > 0`, but `selections` is pre-populated from existing history data (line 126-133). This means the Save button is always enabled even when no changes have been made, and clicking Save re-writes identical data.

### BUG-DE3: Department Data Entry N+1 Query Problem (MEDIUM)
**File**: `DepartmentDataEntry.tsx:187-222`
`fetchData` runs a separate Supabase query per FO, per KR, and per indicator (for history). For a department with 5 FOs, 15 KRs, and 45 indicators, this fires 65+ sequential queries. Causes slow load and potential timeouts.

### BUG-DE4: CSM Matrix Deletes Run Sequentially Without Batching (MEDIUM)
**File**: `CSMDataEntryMatrix.tsx:874-882`
When clearing scores, each delete runs as a separate awaited query in a `for` loop. With many cleared cells this creates excessive round-trips and slow saves.

### BUG-DE5: Evidence File Upload Gets Public URL Then Discards It (LOW)
**File**: `DepartmentDataEntry.tsx:357-360`
After uploading a file to a private bucket, the code calls `getPublicUrl()` (which won't work for private buckets), then ignores the result and stores the path instead. The `getPublicUrl` call is dead code and misleading.

### BUG-DE6: CSM Matrix Score Initialization Race Condition (MEDIUM)
**File**: `CSMDataEntryMatrix.tsx:668-683`
`scoresInitializedRef` is set to `true` after the first initialization, and reset to `false` on department/period change. But if the query refetches (e.g. window focus, stale timeout) without a department/period change, the ref stays `true` and new server data is ignored — user sees stale scores.

### BUG-DE7: Skip Reason Dialog Accepts Exactly 10 Chars of Gibberish (LOW)
**File**: `CSMDataEntryMatrix.tsx:1629`
The validation only checks `generalSkipReason.trim().length < 10`. A user can type "aaaaaaaaaa" (10 a's) and pass validation. No semantic check or word-count minimum.

### BUG-DE8: Customer Attachments No File Size Limit (MEDIUM)
**Files**: `CustomerAttachments.tsx:52`, `IndicatorEvidenceInline.tsx:54`
Neither attachment upload flow enforces a file size limit. Users can upload 500MB+ files, causing the upload to fail with a timeout or storage quota error, with no helpful error message.

### BUG-DE9: Period Selector Allows Future Periods (LOW)
**Files**: `CSMDataEntry.tsx:39`, `DepartmentDataEntry.tsx:121`
The period input (`YYYY-MM`) has no max constraint. Users can select "2027-12" and submit data for periods that haven't occurred yet.

---

## SECTION B: DATA ENTRY TEST CASES

### CSM Feature Matrix (CSMDataEntryMatrix)

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| DE-1 | Load matrix for CSM with assigned customers | Customer sections appear with correct features x indicators grid |
| DE-2 | Select a RAG band for a cell | Dropdown updates, cell shows colored dot + label |
| DE-3 | Clear a previously set cell | Select "Clear" → cell reverts to "—" |
| DE-4 | Apply band to entire row | Click row apply → all cells in row get same band |
| DE-5 | Apply band to entire column | Click column apply → all cells in column get same band |
| DE-6 | Save individual customer | Click per-customer Save → toast confirms, button shows saved state |
| DE-7 | Save all via "Update & Check In" | All scores upserted, indicators aggregated, history records created |
| DE-8 | "No Update & Check In" | Existing scores re-upserted (updated_at touched), activity logged |
| DE-9 | Skip reason for empty customers | Dialog requires 10+ char reason, logged to activity_logs |
| DE-10 | Search customers by name | Filter narrows visible customer sections |
| DE-11 | Download Excel template | .xlsx file downloads with current scores pre-filled |
| DE-12 | Upload filled Excel | Scores populated from Excel, toast shows count |
| DE-13 | Upload invalid Excel | Error toast, no scores modified |
| DE-14 | CM sub-section visible for non-CM departments | Content Management indicators appear below main grid |
| DE-15 | ST Deployment sub-section visible for eligible roles | Deployment indicators appear for Admin/CS dept head |
| DE-16 | ST Deployment hidden for CSM-only users | Deployment sub-section not rendered |
| DE-17 | Previous period ghost values display | Cells with no current score show faded previous value |
| DE-18 | Trend arrows on accordion header | Previous % → Current % with up/down arrow |
| DE-19 | Customer attachment upload (file) | File uploaded to evidence-files bucket, attachment listed |
| DE-20 | Customer attachment add link | Link saved, clickable in attachment list |
| DE-21 | Delete own attachment | Trash icon removes attachment |
| DE-22 | Unsaved changes indicator | Pulsing save button when changes exist |
| DE-23 | Switch department → matrix reloads | New department's customers/indicators load correctly |
| DE-24 | Switch period → matrix reloads | Scores for new period loaded (or hydrated from previous) |
| DE-25 | Weekly period mode | Period selector shows week format, data saves with W## period |

### Department Per-Indicator Entry (DepartmentDataEntry)

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| DE-26 | Load indicators grouped by FO → KR | Accordion structure with correct hierarchy |
| DE-27 | Enter numeric value for indicator | Input accepts number, shows new RAG preview |
| DE-28 | Save without evidence or reason | Blocked with error toast listing affected indicators |
| DE-29 | Save with evidence file attached | File uploaded, indicator updated, history record created |
| DE-30 | Save with evidence link | Link stored, indicator updated |
| DE-31 | Save with skip reason (no evidence) | Reason stored in `no_evidence_reason`, save succeeds |
| DE-32 | Save single indicator | Per-indicator save button works independently |
| DE-33 | Filter by frequency | Only matching-frequency indicators shown |
| DE-34 | Filter by RAG status | Only matching-status indicators shown |
| DE-35 | View indicator history | History dialog shows timeline of past values |
| DE-36 | Evidence inline component | Multiple files/links per indicator per period |
| DE-37 | Dept member sees Feature Matrix only | Per-indicator tab hidden for dept members (non-Sales) |
| DE-38 | Sales dept member sees Sales KPI grid | SalesKPIScoringGrid tab visible and functional |
| DE-39 | Access denied for wrong department | Redirect + error toast if user lacks department_access |

### Sales KPI Scoring Grid (SalesKPIScoringGrid)

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| DE-40 | Load KPIs with RAG bands | Table shows KPI names with band dropdowns |
| DE-41 | Select a band for a KPI | Dropdown updates, current status badge reflects selection |
| DE-42 | Save all scores | History records created, indicators updated |
| DE-43 | KPI with no bands configured | Shows "No bands configured" message |
| DE-44 | Pre-selection from existing history | Previously saved bands pre-selected on load |

### Health Metrics Form (CustomerHealthMetricsForm)

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| DE-45 | Open form → current period selected | Period defaults to current YYYY-MM |
| DE-46 | Enter bug count, SLA, promises, NFR | All fields accept valid numbers |
| DE-47 | Promises delivered > promises made | Validation error toast |
| DE-48 | Change period to one with existing data | Fields pre-fill with saved values |
| DE-49 | Save metrics | Upsert succeeds, toast confirms, dialog closes |
| DE-50 | Bug count = 0 | Accepted (valid edge case) |

### DataEntryDialog (Single Indicator Update)

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| DE-51 | Open dialog for indicator | Shows name, formula, target, previous value |
| DE-52 | Enter non-numeric value | "Please enter a valid number" error |
| DE-53 | Enter valid value | Progress preview updates, save succeeds |
| DE-54 | Last updated info displays | Shows "Updated X ago" with user ID snippet |

### Content Management Data Entry

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| DE-55 | Load CM data entry page | Only managed_services customers shown |
| DE-56 | CM direct mode (no feature links) | Placeholder "Score" column, all indicators listed |
| DE-57 | Save CM scores | Indicators aggregated correctly |

---

## SECTION C: DATA ENTRY IMPROVEMENTS

### High Priority

1. **Add unsaved changes guard** (BUG-DE1): Implement `beforeunload` event listener and React Router `useBlocker` to warn users before losing work. Apply to all 3 entry pages.

2. **Batch delete operations** (BUG-DE4): Replace sequential `for` loop deletes with `Promise.all` or a single RPC call for bulk deletion.

3. **Add file size validation** (BUG-DE8): Enforce a 10MB limit on evidence uploads with a clear error message before attempting the upload.

4. **Fix SalesKPI hasChanges detection** (BUG-DE2): Track original selections separately and compare against current to determine if actual changes occurred.

### Medium Priority

5. **Optimize DepartmentDataEntry queries** (BUG-DE3): Replace N+1 queries with joined queries. Fetch all FOs → KRs → Indicators in 3 queries max using `.in()` filters, then assemble in JS.

6. **Restrict future period selection** (BUG-DE9): Add `max` attribute to month input or validate that selected period is not after current month.

7. **Add auto-save / draft persistence**: For the CSM matrix (2600+ lines of complex state), save a localStorage draft every 30 seconds. Prompt to restore on re-entry.

8. **Add keyboard navigation in matrix**: Allow Tab key to move between cells in the feature matrix, and Enter to confirm a dropdown selection. Currently requires mouse for every cell.

9. **Add progress indicator per customer**: Show "X of Y cells filled" on each customer accordion header so users know completion status at a glance.

10. **Add bulk period copy**: Allow users to copy all scores from a previous period to the current one as a starting point, then modify only changed values.

### Low Priority

11. **Add confirmation before clearing row/column**: Currently clearing is instant with no undo. Add a brief undo toast or confirmation.

12. **Show last-saved timestamp per customer**: After per-customer save, display "Saved 2 min ago" on the card header.

13. **Evidence file type restriction**: Limit uploads to common document types (.pdf, .xlsx, .docx, .png, .jpg) to prevent accidental uploads of inappropriate file types.

14. **Dead code cleanup** (BUG-DE5): Remove the `getPublicUrl` call in DepartmentDataEntry that serves no purpose.

15. **Add data validation ranges**: For numeric indicator values (DepartmentDataEntry), validate that entered values are within reasonable bounds based on the indicator's unit (e.g., percentage should be 0-100).

---

## SUMMARY

| Category | Bugs | Test Cases | Improvements |
|----------|------|------------|--------------|
| CSM Feature Matrix | 4 (DE1, DE4, DE6, DE7) | 25 | 6 |
| Department Per-Indicator | 2 (DE3, DE5) | 14 | 3 |
| Sales KPI Grid | 1 (DE2) | 5 | 1 |
| Health Metrics Form | 0 | 6 | 0 |
| DataEntryDialog | 0 | 4 | 0 |
| Content Management | 0 | 3 | 0 |
| Cross-cutting | 2 (DE8, DE9) | 0 | 5 |
| **Total** | **9 bugs** | **57 test cases** | **15 improvements** |

### Combined with Previous QA (Section A-D)
- **Total Bugs**: 7 (previous) + 9 (data entry) = **16 bugs**
- **Total Test Cases**: 76 (previous) + 57 (data entry) = **133 test cases**
- **Total Improvements**: 14 (previous) + 15 (data entry) = **29 improvements**

