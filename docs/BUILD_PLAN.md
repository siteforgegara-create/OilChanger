# OilChanger v2 Build Plan

## Rule

Build one page/module at a time. Do not move to the next module until the current one is complete.

Each module requires:

- database schema
- API/contracts
- UI
- DB-backed i18n for `az`, `ru`, `en`
- role access
- tenant/country isolation
- tests
- manual verification

## Reference Project

The old project at `C:\home\OilChanger` is reference material only. Do not copy whole modules blindly.

Useful references:

- auth draft
- i18n draft
- tenant/country guard ideas
- tests as examples
- Prisma draft ideas

Avoid copying:

- old customer/vehicle forms
- hardcoded strings
- hardcoded component colors
- dashboard fake metrics
- UI typography/design

## Stage 0: Foundation

Goal: clean base architecture.

Includes:

- project scaffold
- TypeScript
- Next.js App Router
- Prisma
- auth
- roles
- tenant/shop/membership
- country
- DB-backed i18n
- language switcher AZ/RU/EN
- theme/layout
- Manrope and IBM Plex Mono fonts
- money helpers for minor units
- audit helper
- tenant/country access helpers

Done when:

- tenant can register
- user can login
- user can switch language
- first shop exists
- roles are enforced
- typecheck/lint/tests pass

## Stage 1: Landing

Goal: public SaaS landing page.

Includes:

- product explanation
- plan cards: Start, Pro, Premium
- Login
- Sign up
- language switcher

Done when:

- page is visually finished
- no app dashboard content appears before login
- language switch works
- buttons route correctly

## Stage 2: Register / Login

Goal: create tenant and authenticate.

Register fields:

- owner name
- email/password
- country
- plan
- service name
- logo optional
- address
- map point centered on Azerbaijan

Creates:

- User
- Tenant
- Shop
- Membership
- Subscription

Deferred:

- email verification
- forgot password

Done when:

- owner can create account
- owner can login
- locale persists
- first shop is available

## Stage 3: Settings

Goal: business and branch setup.

Includes:

- tenant profile
- shared logo
- branches
- address/map
- language/theme
- current plan
- plan limits
- AI usage display

Permissions:

- Shop Owner full
- Branch Admin can edit assigned branch name/address
- Mechanic no access

Done when:

- branches can be added/edited
- tariff limits are displayed
- role access works

## Stage 4: Inventory

Goal: products, prices, stock, stock movements.

Includes:

- product catalog
- inventory per branch
- stock receipt
- stock movement history
- low stock
- negative stock
- purchase/sale/service prices

Rules:

- stock changes through StockMovement
- stock can go negative with warning
- stock receipt creates expense
- Mechanic cannot see purchase prices

Done when:

- product can be added
- receipt updates stock
- receipt creates expense
- movements are auditable
- negative stock is visible

## Stage 5: Customers / Vehicles

Goal: vehicle-first customer database.

Includes:

- VehicleIdentity
- Customer
- CustomerVehicle
- search by plate/VIN/make/model/customer/phone
- add vehicle without customer
- add customer
- link vehicle and customer
- vehicle card
- customer card
- masked/common history behavior

Rules:

- Mechanic cannot see customer phone
- VIN optional but recommended
- customer can have multiple vehicles
- vehicle history stays with vehicle

Done when:

- vehicle can exist without customer
- customer can link to multiple vehicles
- own shop sees PII by role
- other shops see PII-free history

## Stage 6: Service Orders / Обслуживание

Goal: full service workflow.

Flow:

1. Search vehicle.
2. Add to queue.
3. Start service.
4. Select products/services.
5. Assign staff.
6. Enter mileage.
7. Enter payment/discount/debt.
8. Complete.

On completion:

- create ServiceRecord
- create StockMovement OUT
- create QR if absent
- calculate next service
- link staff stats
- record payment/debt

Rules:

- service can complete without customer
- debt requires customer
- VIN warning only
- stock warning but completion allowed

Done when:

- full service journey works end-to-end
- inventory is deducted
- finance records are created
- service history is visible
- QR is created

## Stage 7: Dashboard / Главная

Goal: today's operational overview from real data.

Includes:

- branch filter
- queued orders
- in progress
- scheduled
- completed today
- warnings: debt, negative stock, low stock, due soon

Done when:

- no fake metrics
- role-specific visibility works
- branch filtering works

## Stage 8: Finance

Goal: owner finance panel.

Shop Owner only.

Includes:

- charged
- paid
- debt
- expenses
- profit
- discounts
- charts
- period filter
- branch filter
- partial debt payments

Rules:

- inventory purchase is expense
- debt can be partially paid
- export deferred

Done when:

- orders feed income
- expenses feed cost
- charts use real data
- debt payments update balances

## Stage 9: Staff

Goal: staff management and work statistics.

Shop Owner only.

Includes:

- staff users
- roles
- branch memberships
- active/inactive
- work stats
- order amount participation
- discounts applied

Done when:

- employee can login
- employee can belong to multiple branches
- Mechanic access is limited
- stats come from orders

## Stage 10: Library / AI

Goal: vehicle catalog and recommendations.

Includes:

- vehicle catalog
- fluid recommendations
- multiple recommended/alternative fluids
- AI recommendation request
- 10 USD monthly tenant AI budget
- saved AI response
- shop correction/override
- source badges
- Platform Owner review queue

Done when:

- recommendation can be read from DB
- AI response is cached/saved
- limit enforcement works
- override is visible to shop
- Platform Owner can review

## Stage 11: QR Public Page

Goal: public vehicle service page.

Includes:

- QR slug
- masked VIN
- service history
- next service
- no prices
- no customer PII
- scan count

Done when:

- QR route opens correct vehicle
- privacy rules are tested

## Stage 12: Platform Admin

Goal: SaaS owner panel.

Includes:

- tenants
- shops
- plans
- AI usage
- catalog submissions
- overrides
- duplicates/suspicious vehicle identities
- audit
- notifications

Done when:

- Platform Owner sees review queues
- can approve/reject/merge
- shop receives notification

## Completion Discipline

For every stage:

1. Define schema.
2. Add migrations.
3. Add API.
4. Add i18n keys for `az`, `ru`, `en`.
5. Build UI.
6. Add tests.
7. Run typecheck/lint/tests.
8. Manually verify.
9. Only then continue.
