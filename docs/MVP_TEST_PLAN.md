# OilChanger v2 MVP Test Plan

## Purpose

This document is the manual acceptance test plan for the current MVP. It should be used before broad user testing to verify the full product flow across public pages, authentication, shop operations, finance, QR history, and Platform Admin.

## Test Environment

- App URL: `http://localhost:3003`
- Preferred host: `localhost`, not `127.0.0.1`
- Seed command: `pnpm db:seed`
- Checks before testing:
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm test`
  - `pnpm build`

## Test Accounts

### Platform Owner

- Email: `admin@oilchanger.local`
- Password: `Admin12345!`
- Expected landing after login: `/admin`

### Shop Owner

Use the seeded demo account for role smoke testing:

- Email: `owner@demo.oilchanger.local`
- Password: `Demo12345!`
- Expected landing after login: `/dashboard`

Also test a fresh shop owner through `/register?locale=ru`.

Required fields:

- service name
- owner name
- email
- password and password confirmation
- country: Azerbaijan

Expected result:

- user is logged in automatically
- tenant is created
- first shop is created
- subscription is created with Start limits
- dashboard opens

### Branch Admin

- Email: `branch.admin@demo.oilchanger.local`
- Password: `Demo12345!`
- Expected landing after login: `/dashboard`

### Mechanic

- Email: `mechanic@demo.oilchanger.local`
- Password: `Demo12345!`
- Expected landing after login: `/dashboard`

### Seeded Demo Data

- Tenant: `Demo Oil Service`
- Plan: `PRO`
- Branches: `Demo Main Branch`, `Demo Second Branch`
- Inventory: demo engine oil and oil filter with AZN minor-unit prices
- Service catalog: oil change labor
- Library: approved Toyota Camry XV70 recommendation for engine oil

## 1. Public Landing

### Steps

1. Open `/`.
2. Switch languages: AZ, RU, EN.
3. Open Login.
4. Open Registration.
5. Review plan cards.

### Expected

- no dashboard data is visible before login
- language switch changes public text
- Login and Registration links route correctly
- plan cards mention inventory and QR availability

## 2. Registration And Login

### Steps

1. Register a new shop owner.
2. Log out.
3. Log in with the created email/password.
4. Switch language after login.

### Expected

- password confirmation is required
- login redirects to dashboard
- authenticated language switch works
- owner sees business navigation

## 3. Settings And Branches

### Steps

1. Open Settings.
2. Change business name.
3. Upload a logo.
4. Edit branch name/address/coordinates.
5. Open Branches.
6. Add a branch if plan limits allow it.

### Expected

- logo appears in header/settings
- branch settings persist
- Start plan blocks extra branches
- Pro/Premium limits are reflected after Platform Admin plan change

## 4. Inventory

### Steps

1. Add engine oil product.
2. Add filter product.
3. Set purchase, sale, and service prices.
4. Add quantities.
5. Search/filter by product, category, viscosity, and stock.
6. Sort table headers.
7. Delete a selected product using the `DELETE` confirmation.

### Expected

- products appear in compact table
- stock values update
- low stock is visible
- delete mode can be cancelled with Esc
- delete requires explicit `DELETE`
- inventory purchase creates an expense

## 5. Customers And Vehicles

### Steps

1. Open Customers.
2. Search by partial plate, VIN, make, model, customer name, and phone.
3. Add a vehicle with customer data.
4. Add a vehicle without customer data.
5. Open vehicle/customer details.
6. Link customer to vehicle.

### Expected

- VIN is optional but recommended
- vehicle can exist without customer
- customer can have multiple vehicles
- shop owner can see customer phone
- non-owner staff should not see customer phone

## 6. Service Order Flow

### Steps

1. Add a vehicle to queue from dashboard.
2. Open the order.
3. Start service.
4. Add products from inventory.
5. Add labor/service lines.
6. Assign staff.
7. Enter mileage.
8. Add discount if needed.
9. Enter payment.
10. Complete service.

### Expected

- order status changes through the workflow
- totals are calculated in minor units
- stock is deducted with OUT movement
- completion is allowed even if stock becomes negative
- payment/debt is recorded
- service record is created
- QR is created if absent
- next service mileage/date are calculated when recommendation data exists

## 7. Debt And Finance

### Steps

1. Complete an order with partial payment and debt.
2. Open Finance.
3. Filter by date and branch.
4. Add manual expense.
5. Pay debt partially.

### Expected

- revenue, paid, debt, expenses, profit, and discounts update from real data
- inventory purchase appears as expense
- debt payment updates debt balance
- recent debt payments are visible
- finance is hidden from Mechanic

## 8. Staff

### Steps

1. Add staff user.
2. Assign role and branches.
3. Log in as staff user.
4. Complete or participate in service orders.
5. Return to Staff page as owner.

### Expected

- staff user can log in
- staff can belong to multiple branches
- Mechanic sees operational pages only
- Staff statistics show order count and order amount participation

## 9. Library And AI Budget

### Steps

1. Add vehicle catalog record.
2. Add multiple fluid recommendations.
3. Verify source/status badges.
4. Check AI budget block.
5. Trigger AI recommendation flow when provider is connected later.

### Expected

- catalog is country-scoped
- recommendations are saved
- multiple fluids are supported
- AI usage limit is visible and enforced by business logic
- shop-submitted records appear in Platform Admin review queue

## 10. QR Public Page

### Steps

1. Complete a service order.
2. Open generated QR URL `/v/[slug]`.
3. Inspect displayed vehicle history.

### Expected

- page opens without login
- no customer name, phone, email, prices, or discounts are visible
- VIN is masked
- vehicle make/model/year, mileage, service history, and next service are visible
- scan count increments

## 11. Notifications

### Steps

1. Generate customer reminder notification.
2. Review a catalog submission in Platform Admin.
3. Open Notifications as shop owner.
4. Mark notification as sent/read.

### Expected

- only `IN_APP` notifications are visible in UI
- `EMAIL` notifications stay queued in database for future delivery worker
- status updates are audited
- customer reminder links back to vehicle when available

## 12. Platform Admin

### Steps

1. Log in as `admin@oilchanger.local`.
2. Open `/admin`.
3. Review metrics.
4. Approve/reject catalog submissions.
5. Approve/reject shop overrides.
6. Merge duplicate catalog records.
7. Change tenant plan.
8. Check AI usage per tenant.
9. Review audit log.

### Expected

- Platform Owner is redirected to `/admin`
- non-platform users cannot access `/admin`
- review actions update statuses and create audit logs
- review actions create both IN_APP and EMAIL notification records
- duplicate merge marks duplicate as `MERGED`
- VehicleIdentity catalog references move to primary catalog
- tenant plan updates subscription limits
- AI usage shows used/limit/over-limit state

## 13. Role Access Smoke Test

### Shop Owner

Expected access:

- dashboard
- customers
- inventory
- sales
- finance
- staff
- branches
- settings
- notifications

### Branch Admin

Expected access:

- assigned branch operations
- customers/vehicles
- inventory
- orders
- branch settings

Should not access:

- staff management
- full finance
- SaaS subscription management

### Mechanic

Expected access:

- dashboard queue
- order flow
- customer/vehicle technical data
- inventory sale/service prices
- library submissions

Should not access:

- customer phone
- purchase prices
- finance
- staff
- business settings

### Platform Owner

Expected access:

- platform admin

Should not access:

- tenant dashboard as a shop user
- customer PII by default

## Current Deferred Items

These are intentionally deferred from MVP testing:

- email verification
- Google login
- real email provider delivery
- SMS provider
- fiscal printer integration
- payment acquiring
- export to Excel/PDF
- real AI provider UI flow
- OpenStreetMap branch picker UI
- vehicle owner account
- public API integrations

## MVP Acceptance Bar

MVP is ready for full internal testing when:

- all automated checks pass
- this manual test plan is completed once with a fresh tenant
- role access smoke test passes
- QR privacy is verified manually
- at least one full order deducts stock and appears in finance
- Platform Admin can review/merge/update plan without errors
