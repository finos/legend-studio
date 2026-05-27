# Trader Profile — UI Developer API Guide

> **Context for Copilot:** This guide describes the `GET /products` endpoint on the Vendor Data Marketplace backend. The endpoint already serves two product types — **Vendor Profile** and **Service Pricing**. A third type, **Trader Profile**, has been added server-side. This document describes only what has changed and what is new. The existing `vendor_profiles` and `service_pricing` behaviour is unchanged.

---

## Endpoint

```
GET /products
```

All parameters are query-string parameters. The endpoint is shared across landing page, SEE_ALL, and search interactions for all three product types.

---

## Query Parameters

| Parameter            | Type            | Required | Default | Description                                                                                                 |
| -------------------- | --------------- | -------- | ------- | ----------------------------------------------------------------------------------------------------------- |
| `kerberos`           | `string`        | Yes      | —       | Authenticated user's kerberos identifier                                                                    |
| `product_type`       | `string`        | No       | `ALL`   | One of: `VENDOR_PROFILE`, `SERVICE_PRICING`, `TRADER_PROFILE`, `ALL`                                        |
| `preferred_products` | `boolean`       | No       | `false` | `true` = landing page mode (6 items per type, no pagination)                                                |
| `search`             | `string`        | No       | —       | Free-text search. Searches `profile_name` for Trader Profiles. Automatically disables `preferred_products`. |
| `page_number`        | `integer ≥ 1`   | No       | `1`     | Page number for SEE_ALL pagination                                                                          |
| `page_size`          | `integer 1–100` | No       | `12`    | Items per page for SEE_ALL pagination                                                                       |

> **Note:** `page_number` and `page_size` are ignored when `preferred_products=true`.

---

## Use Cases & Example Requests

### 1. Landing Page — All Three Types (6 items each)

Fetch 6 Vendor Profiles, 6 Service Pricing items, and 6 Trader Profiles in a single call.

```
GET /products?kerberos=jsmith&preferred_products=true
```

> `product_type` defaults to `ALL` when omitted.

---

### 2. Landing Page — Trader Profiles Only (6 items)

```
GET /products?kerberos=jsmith&product_type=TRADER_PROFILE&preferred_products=true
```

---

### 3. SEE_ALL — Trader Profiles with Pagination

```
GET /products?kerberos=jsmith&product_type=TRADER_PROFILE&page_number=1&page_size=12
GET /products?kerberos=jsmith&product_type=TRADER_PROFILE&page_number=2&page_size=12
```

> **Pagination note:** `total_count` in the response is the count of **distinct Trader Profiles** (not individual items within them). Use this for calculating total pages.

---

### 4. Search — Trader Profiles Only

```
GET /products?kerberos=jsmith&product_type=TRADER_PROFILE&search=FE+CPM
```

---

### 5. Search — Across All Types Simultaneously

```
GET /products?kerberos=jsmith&search=Bloomberg
```

Each product type searches its own relevant fields:

- Vendor Profile & Service Pricing: `productName` and `providerName`
- Trader Profile: `profile_name`

---

### 6. SEE_ALL — All Types with Pagination

```
GET /products?kerberos=jsmith&product_type=ALL&page_number=1&page_size=12
```

All three arrays are paginated with the same `page_size` window.

---

## Response Shapes

### `product_type=ALL` (Landing Page or SEE_ALL)

This is the primary response shape. All three arrays are always present.

```jsonc
{
  "hrid": "800399016",

  "vendor_profiles": [
    {
      "id": 295,
      "productName": "Informagm.com (World)",
      "providerName": "Informa Global Markets",
      "description": "Informagm.com (World)",
      "category": "Vendor Profile",
      "model": "Informagm.com",
      "price": 0.0,
      "isOwned": false,
    },
  ],

  "service_pricing": [
    {
      "id": 210018651,
      "productName": "Caracas Stock Exchange L1",
      "providerName": "Bloomberg",
      "description": "Caracas Stock Exchange L1",
      "category": "Exchange",
      "model": null,
      "price": 31.75,
      "isOwned": false,
    },
  ],

  "trader_profile": [
    {
      "id": 1750,
      "productName": "FE CPM New Analyst",
      "providerName": "",
      "description": "FE CPM New Analyst",
      "category": "Trader Profile",
      "model": null,
      "price": 2132.5,
      "isOwned": false,
      "multiselect": false,
      "items": [
        {
          "id": 379,
          "productName": "Factset Workstation (Non-Advisory)",
          "providerName": "Factset Research System Inc.",
          "description": "Factset Workstation (Non-Advisory)",
          "category": "Vendor Profile",
          "model": null,
          "price": 2100.75,
          "isOwned": false,
        },
        {
          "id": 225076126,
          "productName": "New York Stock Exchange",
          "providerName": "Factset Research System Inc.",
          "description": "New York Stock Exchange",
          "category": "Exchange",
          "model": null,
          "price": 31.75,
          "isOwned": false,
        },
      ],
    },
  ],

  "vendor_profiles_total_count": 6,
  "service_pricing_total_count": 6,
  "trader_profile_total_count": 6,
  "total_count": 18,
}
```

---

### `product_type=TRADER_PROFILE` (SEE_ALL or Search)

When a single type is requested, all three arrays are still present but the other two are empty. Only `total_count` is returned (no per-type count fields).

```jsonc
{
  "hrid": "800399016",
  "vendor_profiles": [],
  "service_pricing": [],
  "trader_profile": [
    {
      "id": 1750,
      "productName": "FE CPM New Analyst",
      "providerName": "",
      "description": "FE CPM New Analyst",
      "category": "Trader Profile",
      "model": null,
      "price": 2132.5,
      "isOwned": false,
      "multiselect": false,
      "items": [
        /* ... */
      ],
    },
  ],
  "total_count": 47,
}
```

---

## Trader Profile Field Reference

### Envelope (the profile object itself)

| Field          | Type             | Description                                                     |
| -------------- | ---------------- | --------------------------------------------------------------- |
| `id`           | `number`         | Unique Trader Profile identifier (`PROFILE_ID` in DB)           |
| `productName`  | `string`         | Profile display name (e.g. `"FE CPM New Analyst"`)              |
| `providerName` | `string`         | Always `""` — Trader Profiles have no single provider           |
| `description`  | `string`         | Same as `productName`                                           |
| `category`     | `string`         | Always `"Trader Profile"`                                       |
| `model`        | `string \| null` | Profile model identifier, may be `null`                         |
| `price`        | `number`         | **Sum of all item prices** within this profile                  |
| `isOwned`      | `boolean`        | `true` only when **every item** in `items` is owned by the user |
| `multiselect`  | `boolean`        | See [multiselect behaviour](#multiselect-behaviour) below       |
| `items`        | `array`          | Ordered list of constituent products — see item fields below    |

### Item (each entry in `items`)

| Field          | Type      | Description                                                                                                                   |
| -------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `id`           | `number`  | Product identifier                                                                                                            |
| `productName`  | `string`  | Product display name                                                                                                          |
| `providerName` | `string`  | Provider/vendor name                                                                                                          |
| `description`  | `string`  | Product description                                                                                                           |
| `category`     | `string`  | Product category (e.g. `"Vendor Profile"`, `"Exchange"`, `"Access Fee"`, `"Basic Service"`, `"DACS - Internal Source"`, etc.) |
| `model`        | `null`    | Always `null` at the item level                                                                                               |
| `price`        | `number`  | Individual item price                                                                                                         |
| `isOwned`      | `boolean` | Whether this specific item is already in the user's inventory                                                                 |

---

## Multiselect Behaviour

The `multiselect` flag on a Trader Profile envelope indicates that the profile contains **multiple Vendor Profile options** and the user must choose one before adding to cart.

| `multiselect` | Meaning                                                       | UI behaviour                                 |
| ------------- | ------------------------------------------------------------- | -------------------------------------------- |
| `false`       | All items are fixed — no choice required                      | Show "Add to Cart" directly                  |
| `true`        | At least one Vendor Profile item must be selected by the user | Show a selection prompt before "Add to Cart" |

**Cart add logic (driven by `isOwned`):**

- When the user adds a Trader Profile to cart, **only items where `isOwned === false`** should be submitted.
- Items where `isOwned === true` are already provisioned and must be silently skipped.
- Never submit the profile envelope to the cart — only the individual `items` entries.

---

## `isOwned` Logic

| Scope                                       | `isOwned = true` when…                                                                   |
| ------------------------------------------- | ---------------------------------------------------------------------------------------- |
| **Profile envelope**                        | Every single item in `items` has `isOwned: true`                                         |
| **Item with `category = "Vendor Profile"`** | Matched by `(providerName, productName)` in user inventory, or by product `id`           |
| **Item with any other category**            | Matched by `(category, providerName, productName)` in user inventory, or by product `id` |

A profile with even one unowned item will always have `isOwned: false` on the envelope.

---

## Pagination Guide

Trader Profile pagination operates at the **profile level**, not the item level. A page of 12 means 12 distinct Trader Profiles, regardless of how many items each contains.

```
Total pages = Math.ceil(total_count / page_size)
```

Use `trader_profile_total_count` (from `ALL` responses) or `total_count` (from `TRADER_PROFILE`-only responses) for this calculation.

---

## Error Response

On any server error the endpoint returns:

```jsonc
// HTTP 500
{
  "detail": "Failed to fetch products",
}
```

---

## Comparison: What Is New vs. What Already Existed

| Aspect                     | Vendor Profile / Service Pricing (existing)                   | Trader Profile (new)                       |
| -------------------------- | ------------------------------------------------------------- | ------------------------------------------ |
| `product_type` value       | `VENDOR_PROFILE` / `SERVICE_PRICING`                          | `TRADER_PROFILE`                           |
| Response key               | `vendor_profiles` / `service_pricing`                         | `trader_profile`                           |
| Count key (ALL)            | `vendor_profiles_total_count` / `service_pricing_total_count` | `trader_profile_total_count`               |
| Item structure             | Flat object                                                   | Flat envelope with nested `items` array    |
| `multiselect` field        | Not present                                                   | Present on envelope only                   |
| `price` on envelope        | Direct DB value                                               | Sum of all item prices                     |
| `isOwned` on envelope      | Direct ownership check                                        | `true` only if all items owned             |
| `providerName` on envelope | Real provider name                                            | Always `""`                                |
| `category` on envelope     | e.g. `"Vendor Profile"`                                       | Always `"Trader Profile"`                  |
| Landing page query         | `preferred_products=true` (same param)                        | Same — included automatically in `ALL`     |
| Search field               | `productName`, `providerName`                                 | `profile_name` (profile-level search only) |
