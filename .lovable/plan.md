

# Fix Department Head Login Race Condition

## Problem
When testcs@infosecventures.com (a department_head with the "Customer Success" department assigned) logs in, the Portfolio page shows "No Departments Assigned" because:

1. The `useAuth` hook sets `loading = false` **before** `checkUserRoles` finishes
2. The `onAuthStateChange` callback uses `setTimeout(() => checkUserRoles(...), 0)` which defers role fetching
3. Portfolio renders with `accessibleDepartments = []`, filters out all departments, and shows the empty state

The user's data is correct in the database -- the timing is wrong.

## Fix: `src/hooks/useAuth.tsx`

Restructure the auth initialization to **await role fetching before setting loading to false**:

1. Remove the `setTimeout` wrapper around `checkUserRoles` in `onAuthStateChange`
2. In the initial `getSession` call, **await** `checkUserRoles` before setting `loading = false`
3. Add an `isMounted` guard to prevent state updates after unmount
4. Keep `onAuthStateChange` as fire-and-forget (it handles subsequent auth events like token refresh, not the initial load)

### Before (broken flow)
```text
getSession() -> setUser -> setLoading(false) -> checkUserRoles (async, not awaited)
                                                  ^-- too late, Portfolio already rendered empty
```

### After (fixed flow)
```text
getSession() -> setUser -> await checkUserRoles() -> setLoading(false)
                                                       ^-- Portfolio renders with correct departments
```

### Code change

```typescript
useEffect(() => {
  let isMounted = true;

  // Listener for ongoing auth changes (token refresh, sign-out, etc.)
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    if (!isMounted) return;
    setSession(session);
    setUser(session?.user ?? null);

    if (session?.user) {
      // Fire and forget for ongoing changes - don't control loading
      checkUserRoles(session.user.id);
    } else {
      setIsAdmin(false);
      setIsDepartmentHead(false);
      setIsCSM(false);
      setCsmId(null);
      setAccessibleDepartments([]);
    }
  });

  // Initial load - await roles before setting loading false
  const initializeAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!isMounted) return;

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await checkUserRoles(session.user.id);
      }
    } finally {
      if (isMounted) setLoading(false);
    }
  };

  initializeAuth();

  return () => {
    isMounted = false;
    subscription.unsubscribe();
  };
}, []);
```

## No other files need changes
The Portfolio page, AppLayout, and DepartmentDataEntry already correctly use `isAdmin`, `isDepartmentHead`, and `accessibleDepartments` from `useAuth`. Once the race condition is fixed, the department head will see:
- The Portfolio filtered to their assigned "Customer Success" department
- The "Enter Data" button in the header (already implemented for `isDepartmentHead`)

