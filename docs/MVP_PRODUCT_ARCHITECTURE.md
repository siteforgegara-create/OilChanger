# OilChanger v2 MVP Product Architecture

## Purpose

OilChanger v2 is a SaaS platform for oil-change shops and service branches. The product helps shops manage vehicles, customers, service queues, inventory, retail sales, staff activity, finance, vehicle service history, QR service pages, and a shared country-scoped vehicle recommendation library.

The rebuild starts from a clean architecture. The old `C:\home\OilChanger` project is a reference only.

## Core Principles

- Build one page/module at a time.
- Do not move to the next page until the current page has DB, API, UI, i18n, access control, tests, and manual verification.
- Vehicle history belongs to the vehicle, not to the current owner.
- Customer PII belongs only to the shop/tenant that collected it.
- Cross-shop vehicle history is country-scoped and PII-free.
- Money is stored in minor units, for example `125.75 AZN` as `12575`.
- Inventory stock changes only through stock movements.
- All user-facing strings use DB-backed i18n keys for `az`, `ru`, and `en`.
- Audit sensitive changes: prices, discounts, VIN/plate edits, completed orders, stock corrections, debts, and expenses.

## Languages

Supported languages:

- `az` Azerbaijani
- `ru` Russian
- `en` English

Language switcher is required on:

- public landing
- login
- register
- authenticated app header
- QR public page

Rules:

- Guest locale is stored in cookie.
- Authenticated user locale is stored in `User.locale`.
- Shop can have a default locale.
- Technical strings such as `VIN`, `API`, `5W-30`, `AZN` are marked technical and are not translated.

## UI Foundation

Fonts:

- UI/body: Manrope
- Technical data: IBM Plex Mono

Use IBM Plex Mono for:

- VIN
- license plate
- prices
- mileage
- oil codes/specifications

Design direction:

- light theme by default
- dense operational SaaS layout
- no decorative hero inside the app
- no hardcoded component colors
- CSS tokens for colors
- stable tables, filters, drawers, status badges, and compact cards

Authenticated layout:

- left sidebar
- top header
- main content
- right drawer for details/actions

Menu:

- Главная
- Обслуживание
- Клиенты/Авто
- Склад
- Финансы
- Персонал
- Библиотека
- Настройки

## Roles

### Platform Owner

SaaS owner.

Can:

- manage tenants and shops
- manage plans
- review vehicle catalog submissions
- review AI recommendations and shop overrides
- see who added/changed shared vehicle data
- manage global/country vehicle library
- send notifications to shops

Should not see customer PII by default.

### Shop Owner

Business owner.

Can:

- manage all own branches
- manage staff
- view finances
- view expenses/profit/debts/discounts
- manage inventory
- manage services/orders
- see customer phone and notify customer
- see staff statistics

### Branch Admin

Branch manager.

Can:

- manage assigned branch operational data
- edit own branch name/address
- create customers/vehicles/orders
- manage branch inventory
- add stock receipts

Cannot:

- manage staff
- view Finance page
- manage SaaS subscription

### Mechanic

Operational staff.

Can:

- see queue and active service orders
- see vehicle technical data/history
- select products/services
- see client-facing prices
- enter mileage
- complete service if permitted by flow
- create vehicle library entries and AI requests

Cannot:

- see customer phone
- see purchase prices
- see profit/expenses
- see Finance or Staff pages

## Plans

### Start

- 1 branch
- up to 2 employees
- inventory
- QR
- service orders
- customers/vehicles
- basic finance
- AI monthly budget: 10 USD per tenant

### Pro

- up to 5 branches
- up to 10 employees
- branch-level inventory
- branch-level finance filters
- charts
- staff statistics
- common country vehicle history
- AI monthly budget: 10 USD per tenant

### Premium

Shown in MVP as a plan card with "contact us" / request access.

- more than 5 branches
- more than 10 employees
- expanded analytics
- higher or add-on AI budget
- export later
- API later
- priority support
- custom terms

## Pages

### Public Landing

Purpose:

- explain SaaS value
- show plans
- provide Login and Sign up actions

Includes language switcher.

### Login

Standard email/password login. Google login can be added. Email verification and forgot password are deferred until after core testing.

### Register

Creates:

- owner user
- tenant
- first shop
- owner membership
- subscription

Fields:

- owner name
- email/password
- country
- plan
- service/shop name
- logo optional
- address
- map point centered on Azerbaijan for MVP

### QR Vehicle Page

Public page for vehicle service history.

Shows:

- make/model/year
- masked VIN
- masked plate if displayed
- mileage
- service history
- what was changed
- next service recommendation

Does not show:

- customer name
- phone/email
- prices
- discounts
- staff
- foreign shop name

### Главная

Operational today screen.

Shows:

- branch filter/all branches for Shop Owner
- queued orders
- in progress
- scheduled
- completed today
- warnings: low stock, negative stock, due-soon vehicles, debts for today's clients

Does not show profit/expenses.

### Обслуживание

Central workflow:

1. Search vehicle by plate/VIN/make/model.
2. Add to queue by explicit button.
3. Start service.
4. Select products/services.
5. Assign staff.
6. Enter mileage.
7. Enter payment/discount/debt before completion.
8. Complete order.

Completion:

- saves service record
- creates stock OUT movements
- creates QR if vehicle has none
- calculates next service
- updates staff stats through order links
- records payment/debt

Rules:

- Service can complete without customer.
- Debt requires customer.
- VIN is recommended but not required.
- Missing VIN shows warning only.

### Клиенты/Авто

Vehicle-first search and management.

Search by:

- plate
- VIN
- make
- model
- customer name
- phone

Rules:

- Vehicle can exist without customer.
- Customer can have multiple vehicles.
- Vehicle history remains with vehicle even if owner changes.
- Mechanic cannot see phone.
- Shop Owner can notify customer.
- Cross-shop history is PII-free.

### Склад

Inventory management per branch.

Sections:

- products
- stock
- stock receipt
- stock movements
- low/negative stock

Product data:

- category
- name
- brand
- viscosity/spec optional
- base unit
- purchase price
- sale price
- service price
- optional suggested discount

Rules:

- supplier is deferred
- branch transfer is deferred
- stock can go negative with warning
- stock receipt automatically creates finance expense
- mechanic sees product and client price, not purchase price

### Финансы

Shop Owner only.

Shows:

- charged
- paid
- debt
- expenses
- profit
- discounts
- charts
- filters by period and branch

Rules:

- debt can be partially paid
- inventory purchases are expenses
- export is deferred

### Персонал

Shop Owner only.

Shows:

- staff list
- roles
- branch access
- work statistics
- order amounts per staff participation
- discounts applied

Staff are real users with login. A staff member can belong to multiple branches.

### Библиотека

Vehicle catalog and fluid recommendations.

Shows:

- make/model/year/generation/engine
- engine oil recommendations
- transmission oil recommendations
- power steering fluid recommendations
- multiple valid fluids
- source badges: AI, platform approved, shop override, pending review, rejected

AI:

- available to all staff
- 10 USD/month per tenant
- response saved to DB
- shop can correct AI response
- Platform Owner can approve/reject corrections
- shop receives in-app and email notification on rejection

### Настройки

Business settings.

Includes:

- tenant profile
- one shared logo per tenant
- branches
- address/map
- language/theme
- current plan
- limits
- AI usage

Permissions:

- Shop Owner full access
- Branch Admin can edit assigned branch name/address
- Mechanic no access

### Platform Admin

SaaS admin for Platform Owner.

Includes:

- tenants
- shops
- plans
- AI usage
- vehicle catalog submissions
- overrides
- duplicate/suspicious vehicle identities
- audit
- notifications

## Core Database Domains

### Identity / Auth

- User
- Membership

### Tenant / Shop

- Tenant
- Shop
- Subscription

### Vehicle

- VehicleIdentity
- VehiclePlateHistory
- CustomerVehicle
- VehicleQR

### Customer

- Customer
- CustomerDebt
- CustomerDebtPayment

### Orders / Service

- Order
- OrderLine
- OrderStaff
- Payment
- Discount
- ServiceRecord
- MileageRecord

### Inventory

- Product
- InventoryStock
- StockMovement
- ServiceCatalogItem

### Finance

- Expense
- ExpenseCategory

### Library / AI

- VehicleCatalog
- VehicleCatalogRecommendation
- VehicleCatalogOverride
- AiRecommendation
- AiUsage
- Notification

### Audit / i18n

- AuditLog
- Language
- TranslationKey
- Translation

## Key Data Rules

- `VehicleIdentity` is the shared country-level vehicle.
- VIN is stronger than plate.
- Plate can change; keep plate history.
- Vehicle can be created without VIN but UI recommends VIN.
- Cross-shop vehicle history is visible only within the same country and without PII.
- Customer belongs to shop/tenant and is never visible to other shops.
- Service history belongs to vehicle identity.
- Retail order can be created without customer.
- Service order can be completed without customer.
- Debt requires customer.
- QR belongs to vehicle identity.
- Prices never appear on QR public page.
- Negative stock is allowed with warning and reported to owner.
- All price/discount/stock/VIN/plate/order edits are audited.
