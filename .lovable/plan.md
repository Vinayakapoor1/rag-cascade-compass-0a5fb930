

# Revert Badge Colors and Add Mock Trendline

## 1. Revert Feature Badge Styling

The badge colors were changed unnecessarily. Revert back to the original styling:

**Change in `src/pages/CustomersPage.tsx`:**
- Line 338: Change `bg-primary/15 text-primary border border-primary/20` back to `bg-foreground/10 text-foreground/80`
- Line 353: Same revert inside the HoverCard content

The HoverCard hover-to-reveal behavior stays as-is (no changes needed there).

## 2. Add Mock Trendline Data

Add a fallback in `CustomerSparkline` so that when real data is empty, it renders a sample trend to visualize the sparkline. This will be a temporary mock -- a hardcoded array of 6 data points injected when `data.length < 2`, replacing the "No trend" text with an actual chart preview.

**Change in `src/pages/CustomersPage.tsx` (CustomerSparkline component):**

Replace the "No trend" placeholder with mock data rendering:

```tsx
function CustomerSparkline({ data, ragStatus }: { data: TrendDataPoint[]; ragStatus: RAGStatus }) {
  const MOCK_DATA: TrendDataPoint[] = [
    { period: '1', score: 45 },
    { period: '2', score: 52 },
    { period: '3', score: 48 },
    { period: '4', score: 65 },
    { period: '5', score: 58 },
    { period: '6', score: 72 },
  ];

  const chartData = data.length >= 2 ? data : MOCK_DATA;
  const isMock = data.length < 2;

  return (
    <div className="w-36 h-10 relative">
      {isMock && (
        <span className="absolute -top-3 left-0 text-[8px] text-muted-foreground">
          Sample
        </span>
      )}
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Line
            type="monotone"
            dataKey="score"
            stroke={isMock ? 'hsl(var(--muted-foreground))' : RAG_LINE_COLORS[ragStatus]}
            strokeWidth={1.5}
            dot={false}
            strokeDasharray={isMock ? '3 3' : undefined}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

The mock line will be dashed and gray with a tiny "Sample" label so it's clearly not real data.

## Files Modified

| File | Change |
|------|--------|
| `src/pages/CustomersPage.tsx` | Revert badge colors to original; replace "No trend" with mock sparkline |

