

# Add Department Assignment for All Non-Admin Roles in Team Access

## Problem
Currently, the "Assigned Departments" checkbox list in the Team Access edit dialog only appears when the role is set to "Department Head". CSM users (like Abhay Singh) cannot be assigned departments through the UI, which means they see an empty portfolio.

## Solution
Show the department assignment section for **all non-admin roles** (Department Head, CSM, and Viewer), so admins can control which departments each user can see across the platform.

## Changes

### File: `src/components/admin/TeamAccessTab.tsx`

1. **Expand the department checkbox visibility condition**
   - Change `formData.role === 'department_head'` to `formData.role !== 'admin'` so the department assignment section appears for Department Heads, CSMs, and Viewers.

2. **Update the save logic**
   - Currently, department access records are only inserted when the role is `department_head`. Update this condition to save department assignments for any non-admin role.

3. **Update the label text**
   - Change from "Assigned Departments" to a more generic label, with a helper description explaining that these departments control what the user can see in the portfolio and data entry pages.

### No other files need changes
The Portfolio filtering and CSM data entry scoping already read from `department_access`, so once departments are assigned via Team Access, everything else works automatically.

