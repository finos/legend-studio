# Legend Query — User Guide

This guide is for people **using** Legend Query to build and run queries. It
assumes no knowledge of Legend's internals — you don't need to know PURE, SQL,
or how the underlying models are built.

If you are looking for how Legend Query works internally, see the
[technical documentation](../../packages/legend-application-query/docs/data-space-analytics-and-entry-points.md)
instead.

---

## 1. What Legend Query is

Legend Query lets you ask questions of curated datasets and get answers back as
a table, without writing any query language.

The essential idea: someone has already done the hard work of modelling the
data — defining what a `Trade` or a `Product` is, where its fields come from,
and how to reach the underlying database. Your job is to pick what you want and
add conditions. Legend translates that into a real query and runs it.

A few terms you will see throughout:

| Term                  | What it means to you                                                                                                                |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Class**             | A business concept you can query — `Person`, `Trade`, `Account`.                                                                    |
| **Property**          | A field on a class — `Person.firstName`, `Trade.settlementDate`.                                                                    |
| **Execution context** | A named choice of "which data, from where". Switching it usually means switching environment (e.g. dev vs prod) or dataset variant. |
| **Mapping**           | The rules connecting business concepts to physical data. You rarely pick one directly.                                              |
| **Runtime**           | The connection used to actually run the query. Usually chosen for you.                                                              |
| **Query**             | A saved question. It has a name, an owner, and a link you can share.                                                                |

---

## 2. Starting a query

Open Legend Query and you land on the **setup page**. It offers a few ways in:

| Action                               | What it does                                                        |
| ------------------------------------ | ------------------------------------------------------------------- |
| **Open an existing query**           | Find and open a query you or a colleague saved.                     |
| **Create query from data space**     | Start from a curated dataset. **This is the usual starting point.** |
| **Update an existing service query** | Edit the query behind a deployed service.                           |
| **Productionize an existing query**  | Turn a saved query into a deployed service.                         |

Click **Show advanced actions** to also see:

| Action                                | What it does                                         |
| ------------------------------------- | ---------------------------------------------------- |
| **Create new query on a mapping**     | Start from a raw mapping + runtime. For power users. |
| **Clone an existing service query**   | Copy a service's query as a starting point.          |
| **Open service query from a project** | Browse a project's services and open one.            |

> **Not everything starts here.** Data products and ingest definitions are
> opened by **link** — from Legend Marketplace, Legend Studio, or a URL a
> colleague sent you. They do not appear on the setup page. See §3.2 and §3.3.

Whichever route you take, you end up in the same **query editor**.

---

## 3. The five ways to query

Legend Query can query five different kinds of thing. They differ in _what you
pick at the start_; once you are in the editor, building the query works the
same way in all of them (§4).

### 3.1 Data spaces

**What it is.** A curated, documented dataset published by a team — the classes
worth querying, packaged with documentation, diagrams, and often some ready-made
example queries.

**When to use it.** Nearly always, if one exists for your data. It is the most
guided experience and the one most likely to have someone maintaining it.

**How to start.** Setup page → **Create query from data space**, or open a data
space link directly.

**What you pick.**

| Field                 | Notes                                                                                                                                  |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Data space**        | Search by name. Click the magnifying glass for **advanced search**, which lets you browse and filter across all available data spaces. |
| **Execution context** | Usually pre-filled with the default. Change it to switch dataset variant or environment.                                               |
| **Runtime**           | Usually pre-filled and hidden. Shown only when there is a real choice.                                                                 |

**Extras you get with data spaces:**

- **About Data Space** (in the editor menu) — documentation, support contacts,
  and a link to the full definition.
- **Curated Template Queries** — pre-built example queries. Loading one gives
  you a working query to modify rather than a blank slate. Well worth checking
  before building from scratch.
- **Copy link** — copies a URL that reopens this exact setup, for sharing.

**Switching data space mid-query** is allowed when creating a new query. If you
opened a _saved_ query, switching is blocked — open a new query instead, so the
saved one keeps working.

### 3.2 Data products

**What it is.** A published data asset with defined **access points** — the
specific, entitled ways you are allowed to read it.

**When to use it.** When you have been given a data product link, typically from
Legend Marketplace after requesting access.

**How to start.** Open the link. There is no setup-page entry.

**What you pick.** Mostly nothing — the link already identifies the product and
the access point. You will see:

| Field            | Notes                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------- |
| **Data product** | Pre-filled. Can be changed when creating a new query.                                 |
| **Execution id** | Which access point you are querying through.                                          |
| **Runtime**      | For model-access and Lakehouse access, a runtime is configured for you automatically. |

There are three kinds of access point, and you may notice the difference:

| Kind             | What it means for you                                                        |
| ---------------- | ---------------------------------------------------------------------------- |
| **Native**       | Query the product's own model directly, like a data space.                   |
| **Model access** | Query through a defined access group. A Lakehouse runtime is set up for you. |
| **Lakehouse**    | Query a specific Lakehouse access point. Runtime is set up for you.          |

For the latter two, **Lakehouse Runtime Configuration** in the settings menu
(the ⋮ icon in the setup panel) lets you inspect or adjust the warehouse and
environment being used.

**About Data Product** in the editor menu shows the product's documentation.

**Sample queries.** Some data products ship example queries, reachable by link,
that open pre-populated — the data product equivalent of template queries.

### 3.3 Ingest definitions

**What it is.** A pipeline that lands data into the Lakehouse. Querying one lets
you look directly at what a pipeline has produced.

**When to use it.** For checking pipeline output — validating a load, inspecting
what actually arrived, debugging a data issue.

**How to start.** Open an ingest link, typically from Legend Studio.

**What you pick.**

| Field                 | Notes                                                                                             |
| --------------------- | ------------------------------------------------------------------------------------------------- |
| **Ingest definition** | Pre-filled from the link. The dropdown lists every ingest in the same project, so you can switch. |
| **Data set**          | Which dataset within that ingest to query.                                                        |

A Lakehouse runtime is created for you; you do not choose one. Settings for it
are available under the ⋮ menu, same as data products.

**Note:** switching ingest definition resets your query — the new ingest has
different datasets and columns.

### 3.4 Mapping and runtime

**What it is.** The unguided route: pick a mapping and a runtime yourself, with
no curation in between.

**When to use it.** When no data space or data product covers what you need, or
when you are testing a mapping you are developing. If you are not sure whether
you should be using this, you probably shouldn't.

**How to start.** Setup page → **Show advanced actions** → **Create new query on
a mapping**.

**What you pick.**

| Field       | Notes                                              |
| ----------- | -------------------------------------------------- |
| **Mapping** | Choose from every mapping in the project.          |
| **Runtime** | Choose from runtimes compatible with that mapping. |

Both selections are reflected in the URL, so this setup is shareable too.

Because there is no curated layer, you see everything the mapping exposes —
including parts nobody intended as a query surface. Expect less documentation
and no template queries.

### 3.5 Services

**What it is.** A deployed, named query with a stable API that applications call.

**When to use it.**

- **Clone an existing service query** — use a service's logic as a starting
  point for your own query, without touching the service.
- **Open service query from a project** — browse a project's services and open
  one to inspect or edit.
- **Update an existing service query** — change what a deployed service actually
  does.
- **Productionize an existing query** — promote one of your saved queries into a
  new service.

**What you pick.**

| Field                 | Notes                                                   |
| --------------------- | ------------------------------------------------------- |
| **Service**           | Which service to load.                                  |
| **Execution context** | Only for multi-execution services — pick which variant. |

> **Take care with "Update an existing service query."** A service is live
> infrastructure with real callers. Changing it changes what those callers get.
> If you only want to explore, use **Clone** instead.

---

## 4. Building a query

The editor is the same regardless of how you got here.

```
┌─────────────┬──────────────────────────┬──────────────┐
│  Explorer   │  filter                  │  parameters  │
│  (classes,  ├──────────────────────────┤  constants   │
│  properties)│  projection / graph fetch │             │
│             ├──────────────────────────┤              │
│             │  post-filter             │              │
├─────────────┴──────────────────────────┴──────────────┤
│  results                                              │
└───────────────────────────────────────────────────────┘
```

### 4.1 Explorer — choosing what to look at

The left panel shows the classes you can query and their properties. Pick a
class, then expand it to see its fields; expand a property that points at
another class to traverse the relationship.

**Greyed-out properties are not mapped** — the model defines them but this
mapping has no data for them. Hovering says _"Property is not mapped"_. They are
hidden by default; **Show Unmapped Properties** in the explorer menu reveals
them. You cannot query them.

Other explorer options:

- **Humanize Property Name** — display `firstName` as "First Name".
- **Highlight already used properties** — show which fields are already in your
  query.
- **Preview Data** (on a property) — a quick peek at sample values without
  building a full query.

Two icons worth recognising:

- ⚡ **Derived property** — calculated, and may need you to supply parameters.
- ⚠ **Multiple values** — this property can return many values per row, which
  can multiply your row count ("row explosion"). Not an error, but be aware.

There is also a **property search** for finding a field by name when the tree is
large.

### 4.2 Choosing columns

Drag properties from the explorer into the middle panel. There are two modes,
switchable from the advanced menu:

- **Tabular Data Structure** (default) — a flat table of rows and columns. What
  most people want.
- **Graph Fetch** — nested, structured output that preserves relationships.
  Useful when feeding another system rather than reading results yourself.

In tabular mode you can:

- Rename columns.
- **Aggregate** — count, sum, average, min, max, and more. Adding an aggregation
  turns the remaining columns into the grouping.
- Add **window functions** for running totals, rankings, and similar.
- Add **derivations** — computed columns.
- **Configure Query Options** — sorting, row limits, deduplication.

### 4.3 Filtering

Two filters, at different stages:

| Panel           | Applies                                                | Use it for                                                                         |
| --------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| **filter**      | _Before_ columns are selected, against the source data | Most conditions. Usually faster — it reduces data earlier.                         |
| **post-filter** | _After_ columns are computed                           | Conditions on aggregates and derived columns (e.g. "only groups with count > 10"). |

Build either by dragging a property in and choosing an operator. Combine
conditions with **and** / **or** groups, and nest groups for complex logic.

**Rule of thumb:** if you can express it in `filter`, do it there.

### 4.4 Parameters and constants

- **Parameters** make a query reusable — instead of hardcoding a date, declare a
  parameter and supply a value at run time. Saved queries can carry default
  values. Services expose parameters as API inputs.
- **Constants** are named values reused across a query, so you change them in
  one place.

Both panels are opened from the advanced menu (**Show Parameter(s)**, **Show
Constant(s)**).

### 4.5 Milestoning (time-versioned data)

Some classes are **milestoned** — they keep history, so a row is valid over a
date range. For these, Legend Query asks _when_ you want to see the data as of,
and you'll get date fields in the setup area.

Defaults are usually sensible ("now"). Change them to query the past. If you see
date parameters you didn't add, this is why.

---

## 5. Running and exporting

**Run Query** executes and shows results in the grid below.

- **Preview limit** caps rows returned to keep things responsive. It applies to
  the grid only — **exports ignore it**.
- **Stop** cancels a run in progress.
- Results can go stale if you edit the query afterwards; the panel warns you.

The dropdown next to Run Query offers:

| Action            | What it gives you                                    |
| ----------------- | ---------------------------------------------------- |
| **Generate Plan** | The execution plan — how Legend intends to run this. |
| **Debug**         | The plan with extra diagnostics.                     |
| **View Lineage**  | Where the data comes from, end to end.               |

**Export** downloads the full result set (CSV and other formats depending on
query type). Exports run in the background and are **not** subject to the
preview limit.

**Launch Legend DataCube** hands your query to DataCube for interactive pivoting
and slicing — useful once you have the right rows and want to explore them.

Two more editor actions worth knowing:

- **Compile (F9)** — checks the query is valid without running it. Faster than a
  full run when you just want to know it's well-formed.
- **Undo / Redo** — available while the query is in form mode.

---

## 6. Saving, loading, and sharing

### Saving

- **Save** — for a new query, prompts for a name and description. For an
  existing one, shows a **diff of your changes** before overwriting.
- **Save As New Query** — always creates a new query, leaving the original
  untouched.

Names and descriptions can be AI-suggested from the query content, and you can
edit both later (double-click the query name to rename).

> Save is disabled until you have picked something to query. If you arrived at a
> blank editor without selecting a data space or data product, choose one first.

### Loading

**Open an existing query** searches by name or ID. You can see your own queries
and those shared by others. Each saved query keeps a **revision history**, so
you can view an earlier version, diff it against the current one, or revert.

### Sharing

- **Copy link** in the setup panel copies a URL that reproduces your current
  setup — the fastest way to point someone at the same starting point.
- A saved query has its own stable URL.
- **Query Info** shows full details including project coordinates and version.

### Promoting

- **Curated Template Query** — promote a saved data space query into a template
  others will see when they open that data space. Requires a saved query.
- **Productionize** — turn a saved query into a deployed service.

---

## 7. Text mode and unsupported queries

### Editing as text

The form covers most queries, but not everything. **Text mode** lets you edit
the query directly in PURE.

- The editor checks syntax as you type and reports parse errors inline.
- **You cannot close text mode with a syntax error** — fix it or discard.
- There is also a read-only **JSON view** showing the raw protocol, mostly for
  debugging.

### "This query is not supported"

Sometimes you open a query and get a text view instead of the normal form, with
a message that it isn't supported.

**What this means:** the query uses something the visual builder cannot
represent — a hand-written function, an unusual construction, or something added
after the form was built.

**What it does _not_ mean:** your query is broken or lost. It still runs, still
saves, and its logic is untouched. Legend Query deliberately **never rewrites a
query it cannot fully interpret** — you get the exact original back.

**What you can do:**

- Run, save, and share it as normal.
- Edit it as text.
- If you need the form, simplify the unsupported part — or copy the pieces you
  need into a fresh query.

The parameters panel usually keeps working even in this state.

---

## 8. Troubleshooting

**"The property I want is greyed out."**
It isn't mapped in this mapping — no data behind it. Try a different execution
context, or ask the data space owner. See §4.1.

**"I can't switch data space on a saved query."**
That's intentional: it would invalidate what was saved. Create a new query
instead.

**"My results have far more rows than expected."**
Look for a ⚠ multiple-values property in your query — traversing a
to-many relationship multiplies rows. Aggregating or filtering earlier usually
fixes it.

**"My export has more rows than the grid."**
Expected. The preview limit applies only to the grid.

**"Execution context X does not exist in data space Y."**
The data space changed and no longer has that context. Open it fresh from the
setup page to pick a current one.

**"The editor is slow to open."**
Large models take time. Data spaces and data products load a trimmed-down model
and are usually fastest; **Create new query on a mapping** loads everything and
is usually slowest.

**"Save is greyed out."**
Either you haven't selected something to query yet, or the query isn't currently
valid. Hover the **Run Query** button — it lists validation issues.

---

## 9. Which entry point should I use?

| If you want to…                            | Use                                          |
| ------------------------------------------ | -------------------------------------------- |
| Explore a curated, documented dataset      | **Data space**                               |
| Query something you were granted access to | **Data product** (via link)                  |
| Check what a pipeline loaded               | **Ingest definition** (via link)             |
| Reuse a deployed service's logic           | **Clone an existing service query**          |
| Change what a live service returns         | **Update an existing service query** ⚠      |
| Query a model with no curated layer        | **Create new query on a mapping** (advanced) |
| Continue earlier work                      | **Open an existing query**                   |

When in doubt, start with a data space. It is the best-documented path and the
easiest to get right.
