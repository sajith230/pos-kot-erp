

# Add Room Management & Banquet Hall Management

## Overview
Add two new modules to the existing ERP/POS system: **Room Management** (for hotel-style room bookings) and **Banquet Hall Management** (for event/function hall bookings). Both modules share similar patterns — a resource (room or hall) that can be booked for date ranges with customer and payment tracking.

## Database Changes

### New Tables

**1. `rooms`** — Hotel rooms catalog
- `id`, `business_id`, `branch_id`, `name`, `room_number`, `room_type` (enum: `standard`, `deluxe`, `suite`, `premium`), `floor`, `capacity`, `price_per_night`, `amenities` (jsonb), `description`, `image_url`, `status` (enum: `available`, `occupied`, `reserved`, `maintenance`, `cleaning`), `is_active`, `created_at`, `updated_at`

**2. `room_bookings`** — Room reservations
- `id`, `business_id`, `branch_id`, `room_id`, `customer_id`, `booking_number`, `check_in`, `check_out`, `actual_check_in`, `actual_check_out`, `guest_count`, `total_amount`, `advance_paid`, `status` (enum: `confirmed`, `checked_in`, `checked_out`, `cancelled`, `no_show`), `notes`, `created_by`, `created_at`, `updated_at`

**3. `banquet_halls`** — Function/banquet halls catalog
- `id`, `business_id`, `branch_id`, `name`, `capacity`, `price_per_hour`, `price_per_day`, `amenities` (jsonb), `description`, `image_url`, `status` (enum: `available`, `booked`, `maintenance`), `is_active`, `created_at`, `updated_at`

**4. `banquet_bookings`** — Hall reservations
- `id`, `business_id`, `branch_id`, `hall_id`, `customer_id`, `booking_number`, `event_name`, `event_type`, `event_date`, `start_time`, `end_time`, `guest_count`, `total_amount`, `advance_paid`, `catering_included` (boolean), `special_requirements` (text), `status` (enum: `confirmed`, `in_progress`, `completed`, `cancelled`), `notes`, `created_by`, `created_at`, `updated_at`

### RLS Policies
- All four tables scoped to `business_id = get_user_business_id(auth.uid())`
- SELECT for all authenticated staff, ALL for admin/manager roles
- Realtime enabled on `room_bookings` and `banquet_bookings` for live status updates

### Permission Modules
Insert permission rows for new modules: `rooms`, `rooms.bookings`, `banquet`, `banquet.bookings`

## New Pages

### 1. `src/pages/rooms/RoomManagement.tsx`
- **Room grid/list view** showing all rooms with status badges (color-coded: green=available, red=occupied, yellow=reserved, gray=maintenance)
- **Add/Edit Room dialog** — form for room details, type, pricing, amenities (checkbox list)
- **Quick status change** — dropdown to change room status (cleaning, maintenance, available)
- **Filter by**: status, room type, floor
- **Stats bar**: total rooms, occupied, available, reserved, today's check-ins/check-outs

### 2. `src/pages/rooms/RoomBookings.tsx`
- **Booking list** with date range filter, status filter, search by customer/booking number
- **New Booking dialog**: select room (only available ones), customer (from existing customers table or create new), check-in/out dates, guest count, notes
- **Booking detail view**: shows booking info, payment status, check-in/check-out actions
- **Check-in / Check-out buttons** that update both booking status and room status atomically
- **Calendar view toggle** (optional, stretch) — shows room availability on a date grid

### 3. `src/pages/banquet/BanquetHalls.tsx`
- **Hall cards** showing each hall with capacity, pricing, current status, next booking
- **Add/Edit Hall dialog** — name, capacity, pricing (hourly/daily), amenities, description
- **Status management** similar to rooms

### 4. `src/pages/banquet/BanquetBookings.tsx`
- **Booking list** with filters (date, status, event type)
- **New Booking dialog**: select hall, event details (name, type, date, time range), customer, guest count, catering toggle, special requirements, pricing
- **Booking detail** with status progression (confirmed → in_progress → completed)

## Sidebar & Routing

### New sidebar group: "Hospitality"
```
Rooms         → /rooms          (icon: BedDouble)
Room Bookings → /rooms/bookings (icon: CalendarCheck)
Banquet Halls → /banquet        (icon: Castle)
Hall Bookings → /banquet/bookings (icon: PartyPopper)
```

### New routes in App.tsx
```
/rooms           → RoomManagement (module: rooms)
/rooms/bookings  → RoomBookings   (module: rooms.bookings)
/banquet          → BanquetHalls   (module: banquet)
/banquet/bookings → BanquetBookings (module: banquet.bookings)
```

## Types
Add to `src/types/database.ts`:
- `RoomType`, `RoomStatus`, `Room`, `RoomBooking`, `RoomBookingStatus`
- `BanquetHallStatus`, `BanquetHall`, `BanquetBooking`, `BanquetBookingStatus`

## Responsive Design
- Room grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`
- Booking tables: `overflow-x-auto` with hidden columns on mobile
- Dialogs: full-screen on mobile via `max-w-lg w-full`

## Key Files
1. **Migration SQL** — 4 new tables, enums, RLS policies, permission seed rows
2. `src/types/database.ts` — New type definitions
3. `src/pages/rooms/RoomManagement.tsx` — Room catalog page
4. `src/pages/rooms/RoomBookings.tsx` — Room booking management
5. `src/pages/banquet/BanquetHalls.tsx` — Banquet hall catalog
6. `src/pages/banquet/BanquetBookings.tsx` — Banquet booking management
7. `src/components/layout/AppSidebar.tsx` — Add "Hospitality" nav group
8. `src/App.tsx` — Add 4 new routes with PermissionGuard

