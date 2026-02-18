# Dashboard Implementation Guide

## Overview

The artist dashboard has been rebuilt with a modern, card-based UI that displays key metrics, content, earnings, and engagement insights. This is production-ready code connected to real Supabase data.

## Architecture

### Core Components

#### 1. **Card System** (`Card.tsx`)
Base reusable card component with header, title, and content sections.

```tsx
<Card>
  <CardHeader>
    <CardTitle>Section Title</CardTitle>
  </CardHeader>
  <CardContent>
    {/* Content here */}
  </CardContent>
</Card>
```

#### 2. **IconSet** (`IconSet.tsx`)
Complete set of SVG icons for the dashboard:
- `IconMusic` - Music/song icon
- `IconPlay` - Play/streams icon
- `IconHeart` - Likes/engagement icon
- `IconMessage` - Comments/messages icon
- `IconCoin` - Earnings/coins icon
- `IconUsers` - Audience/fans icon
- `IconStar` - Top content/featured icon
- `IconTrendingUp` - Trends icon
- `IconTrash` - Delete action icon
- `IconArrowRight` - Navigation icon

#### 3. **MetricDisplay** (`MetricDisplay.tsx`)
Displays key metrics with optional icons and accent colors for important values.

```tsx
<MetricDisplay
  label="Plays (7d)"
  value={123456}
  subtext="Last 7 days"
  icon={<IconPlay className="w-5 h-5" />}
  accent={true}
/>
```

#### 4. **ContentOverviewCard** (`ContentOverviewCard.tsx`)
Shows recent uploaded songs/videos with engagement stats (plays, likes) and delete action.

#### 5. **EarningsCard** (`EarningsCard.tsx`)
Displays total coins balance, pending coins, and conversion rate. Accent colored.

#### 6. **EngagementCard** (`EngagementCard.tsx`)
Shows top-performing content and audience demographics by region.

#### 7. **DashboardGrid** (`DashboardGrid.tsx`)
Responsive grid layout supporting:
- `auto-fit`: 1 col mobile, 2 cols tablet, 3 cols desktop, 4 cols ultra-wide
- `2col`: 1 col mobile, 2 cols desktop
- `3col`: 1 col mobile, 2 cols tablet, 3 cols desktop
- `4col`: Always 4 columns on desktop

#### 8. **SectionHeader** (`SectionHeader.tsx`)
Consistent section title, description, and optional action button.

### Data Service

**dashboardService.ts** - Server-side data fetching:

- `getContentStats(artistUid)` - Fetch songs/videos with engagement metrics
- `getEarningsStats(artistUid)` - Fetch coin balance and transactions
- `getTopContent(artistUid, days)` - Get highest performing content
- `getAudienceDemographics(artistUid, limit)` - Audience by country
- `getEngagementMetrics(artistUid)` - Plays, likes, comments (7d/30d)

## Dashboard Sections

### 1. Welcome Header
- Profile picture and artist name
- Quick onboarding message

### 2. Key Metrics (4-column grid on desktop)
- Plays (7-day)
- Plays (30-day)
- Likes (30-day)
- Comments (30-day)

### 3. Content & Earnings (2:1 ratio)
- **Left**: Recent Content list with play/like counts and delete action
- **Right**: Earnings card showing coin balance with MWK conversion

### 4. Performance & Audience (2-column grid)
- **Left**: Top content from last 7 days + audience demographics
- **Right**: Content overview (total songs/videos) + analytics link

### 5. Go Live CTA
- Call-to-action banner promoting live streaming
- Integrated with `GoLiveSection` component

### 6. Quick Actions (4-column grid)
- Upload Song
- Upload Video
- Live Sessions
- Earnings/Payouts

### 7. Account Section (2-column grid)
- Edit Profile
- Support & Help

## Data Flow

```
Artist Overview Page
  ↓
Fetch all data in parallel:
  ├─ getContentStats() → ContentOverviewCard
  ├─ getEarningsStats() → EarningsCard
  ├─ getTopContent() → EngagementCard
  ├─ getAudienceDemographics() → EngagementCard
  └─ getEngagementMetrics() → MetricDisplay cards
  ↓
Render dashboard with fallback empty states
```

## Styling

### Colors
- **Dark theme**: Zinc-950 backgrounds with zinc-800 borders
- **Accent**: Amber-400 for coins/earnings (brand color)
- **Rose**: Rose-950/30 for live streaming CTA
- **Emerald**: Emerald-400 for success indicators

### Responsive Design
- Mobile: 1 column, full width cards
- Tablet (md): 2 columns
- Desktop (lg): 3-4 columns
- Ultra-wide (xl): 4 columns

### Card Sizing
- Desktop: ~250px minimum width
- Mobile: ~100% width with gutters
- Padding: 4 units (16px) internal spacing
- Gap: 4 units (16px) between cards

## Environment Configuration

The dashboard uses `COIN_TO_MWK_RATE` from `.env.local`:

```bash
# In .env.local
COIN_TO_MWK_RATE=10  # 1 coin = 10 MWK
```

This is used to convert coin values to local currency for display.

## Supabase Tables Required

Ensure your Supabase has these tables:

1. **content**
   - `id`, `artist_id`, `title`, `type` (song|video)
   - `plays`, `likes`, `comments`, `created_at`

2. **transactions**
   - `coins`, `type` (gift|battle_reward|subscription)
   - `target_id`, `target_type` (artist)
   - `created_at`

3. **analytics_events**
   - `event_name` (play|like|comment)
   - `actor_id`, `actor_type` (artist)
   - `country`, `created_at`

## Error Handling

All data fetching functions have try-catch blocks and return `null` on errors. The UI renders fallback empty states:

```tsx
{contentData?.items && items.length > 0 ? (
  // Render items
) : (
  <div>No content uploaded yet</div>
)}
```

## Future Enhancements

1. **Real-time updates** - Add WebSocket subscription to analytics
2. **Recent Activity Feed** - Show likes, comments, tips in real-time
3. **Notifications** - New messages, approvals, achievements
4. **Achievements/Badges** - Milestone tracking
5. **Export Analytics** - Download reports as CSV/PDF
6. **A/B Testing** - Compare performance across content

## Performance Notes

- All dashboard data fetches are **parallelized** (Promise.all)
- Components use **server-side rendering** (async/await)
- Supabase queries use `.limit()` to prevent large dataset transfers
- No client-side state management needed for initial load

## Testing

To test the dashboard:

1. Ensure Supabase service role key is in env
2. Have at least one artist record in your Firebase auth
3. Populate analytics_events with play/like/comment records
4. Run `npm run dev` and navigate to `/artist/dashboard/overview`

## Component Tree

```
ArtistOverviewPage
├─ SectionHeader (Welcome)
├─ DashboardGrid
│  ├─ MetricDisplay (Plays 7d)
│  ├─ MetricDisplay (Plays 30d)
│  ├─ MetricDisplay (Likes 30d)
│  └─ MetricDisplay (Comments 30d)
├─ ContentOverviewCard
├─ EarningsCard
├─ EngagementCard
├─ GoLive CTA
├─ DashboardGrid (Quick Actions)
│  ├─ Link to Music Upload
│  ├─ Link to Video Upload
│  ├─ Link to Live Sessions
│  └─ Link to Earnings
└─ DashboardGrid (Account)
   ├─ Link to Profile
   └─ Link to Support
```

## Code Organization

```
app/artist/dashboard/
├─ overview/
│  └─ page.tsx              # Main dashboard page
├─ _components/
│  ├─ Card.tsx              # Base card component
│  ├─ MetricDisplay.tsx     # Metric cards with icons
│  ├─ ContentOverviewCard.tsx
│  ├─ EarningsCard.tsx
│  ├─ EngagementCard.tsx
│  ├─ DashboardGrid.tsx
│  ├─ SectionHeader.tsx
│  ├─ IconSet.tsx           # All SVG icons
│  └─ [other components]
└─ _lib/
   └─ dashboardService.ts   # Supabase data fetching
```

## Notes for Developers

- **No state management**: Dashboard is fully SSR
- **No external chart libraries**: Uses custom sparkline SVG
- **Tailwind CSS only**: No CSS modules
- **TypeScript strict**: Full type safety
- **Server-only imports**: All Supabase calls are server-side
- **Error boundaries**: Implicit via null fallbacks
