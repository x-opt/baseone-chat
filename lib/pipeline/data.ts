import type { FeedItem, PipelineItem, QueryResult, Workstream } from "./types";

export const PHASES = [
  { key: "profiling", short: "Profile" },
  { key: "schema", short: "Schema" },
  { key: "planning", short: "Plan" },
  { key: "validation", short: "Validate" },
  { key: "transform", short: "Transform" },
  { key: "verification", short: "Verify" },
];

export const INIT_WORKSTREAMS: Workstream[] = [
  {
    id: "ws-1",
    title: "Stripe Transactions → Revenue Analytics",
    source: "stripe_payments.transactions",
    target: "analytics.revenue_facts",
    phaseIndex: 0,
    phaseStatus: "working",
    created: "2 hours ago",
    description:
      "Transform raw Stripe payment events into a clean revenue analytics model.",
    files: [
      {
        name: "stripe_to_revenue.sql",
        type: "sql",
        active: true,
        content: `-- Stripe Transactions → Revenue Analytics
-- Source: stripe_payments.transactions → analytics.revenue_facts

WITH filtered AS (
    SELECT
        t.id AS transaction_id,
        t.amount,
        t.currency,
        t.customer_id,
        t.payment_method_type,
        t.created AS transaction_timestamp,
        DATE(t.created) AS transaction_date,
        JSON_EXTRACT_SCALAR(t.metadata, '$.order_id') AS order_id,
        JSON_EXTRACT_SCALAR(t.metadata, '$.product_category') AS category,
        JSON_EXTRACT_SCALAR(t.metadata, '$.channel') AS channel
    FROM stripe_payments.transactions t
    WHERE t.status = 'succeeded'
),

currency_normalized AS (
    SELECT
        f.*,
        f.amount / 100.0 AS amount_original,
        CASE
            WHEN f.currency = 'usd' THEN f.amount / 100.0
            ELSE (f.amount / 100.0) * fx.rate_to_usd
        END AS amount_usd
    FROM filtered f
    LEFT JOIN fx_rates.daily_close fx
        ON f.currency = fx.currency_code
        AND f.transaction_date = fx.rate_date
),

classified AS (
    SELECT
        cn.*,
        CASE
            WHEN cn.payment_method_type IN ('card','card_present') THEN 'Card'
            WHEN cn.payment_method_type = 'bank_transfer' THEN 'Bank Transfer'
            WHEN cn.payment_method_type IN ('apple_pay','google_pay') THEN 'Digital Wallet'
            ELSE 'Other'
        END AS payment_method_category,
        COALESCE(cn.customer_id, CONCAT('guest_', cn.transaction_id)) AS cust_id
    FROM currency_normalized cn
)

SELECT
    transaction_id, transaction_date, transaction_timestamp,
    cust_id AS customer_id, order_id, category, channel,
    amount_original, currency, amount_usd,
    payment_method_type, payment_method_category
FROM classified;`,
      },
      {
        name: "staging_payments.sql",
        type: "sql",
        content: `-- Staging: Clean raw payment data
SELECT
    id,
    amount,
    currency,
    status,
    customer_id,
    payment_method_type,
    created,
    metadata
FROM stripe_payments.transactions
WHERE status != 'canceled'
    AND created >= '2023-11-01';`,
      },
      {
        name: "tests.sql",
        type: "sql",
        content: `-- Data quality tests

-- Test: No duplicate transaction IDs
SELECT transaction_id, COUNT(*) AS cnt
FROM analytics.revenue_facts
GROUP BY 1 HAVING cnt > 1;
-- Expected: 0 rows

-- Test: All amounts positive
SELECT COUNT(*) AS negative_amounts
FROM analytics.revenue_facts
WHERE amount_usd < 0;
-- Expected: 0

-- Test: No null customer IDs
SELECT COUNT(*) AS null_customers
FROM analytics.revenue_facts
WHERE customer_id IS NULL;
-- Expected: 0`,
      },
      {
        name: "README.md",
        type: "md",
        content: `# Stripe → Revenue Analytics

## Overview
Transforms raw Stripe payment events into a denormalized revenue analytics fact table.

## Pipeline
1. staging_payments.sql — Clean and filter raw data
2. stripe_to_revenue.sql — Main transformation with currency normalization
3. tests.sql — Data quality checks

## Notes
- PII (receipt_email) excluded from all queries
- Guest checkouts assigned synthetic customer_id with prefix guest_
- Exchange rates from fx_rates.daily_close`,
      },
    ],
    profiling: {
      columns: [
        {
          name: "id",
          type: "VARCHAR",
          category: "Identifier",
          nullPct: 0,
          unique: 142837,
          sample: "txn_3MqK...",
        },
        {
          name: "amount",
          type: "INTEGER",
          category: "Numerical",
          nullPct: 0,
          unique: null,
          sample: "2500",
        },
        {
          name: "currency",
          type: "VARCHAR",
          category: "Categorical",
          nullPct: 0,
          unique: 12,
          sample: "usd",
        },
        {
          name: "status",
          type: "VARCHAR",
          category: "Categorical",
          nullPct: 0,
          unique: 4,
          sample: "succeeded",
        },
        {
          name: "customer_id",
          type: "VARCHAR",
          category: "Identifier",
          nullPct: 2.1,
          unique: 89412,
          sample: "cus_Nk2...",
        },
        {
          name: "receipt_email",
          type: "VARCHAR",
          category: "PII - Email",
          nullPct: 18.4,
          unique: 76221,
          sample: "████████",
        },
      ],
      progress: 72,
      findings: [
        {
          type: "pii",
          message: "PII detected: receipt_email — excluded from LLM context.",
          severity: "high",
        },
        {
          type: "info",
          message: "12 distinct currencies. Normalization required.",
          severity: "medium",
        },
      ],
    },
  },
  {
    id: "ws-2",
    title: "NPS Survey → Feedback Warehouse",
    source: "surveys.nps_responses_raw",
    target: "warehouse.customer_feedback",
    phaseIndex: 1,
    phaseStatus: "awaiting_input",
    created: "5 hours ago",
    description:
      "Structure NPS survey exports into queryable feedback warehouse.",
    files: [
      {
        name: "nps_transform.py",
        type: "python",
        active: true,
        content: `# NPS Survey → Customer Feedback Warehouse
import pandas as pd
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from uuid import uuid4
from datetime import datetime

def classify_nps(score):
    if score >= 9: return "Promoter"
    if score >= 7: return "Passive"
    return "Detractor"

def transform(source_df, customer_master):
    df = (source_df
        .sort_values("submitted_at", ascending=False)
        .drop_duplicates(subset=["user_id","survey_date"], keep="first")
        .copy())

    df = df[df["nps_score"].between(0, 10)]
    df["nps_category"] = df["nps_score"].apply(classify_nps)

    analyzer = SentimentIntensityAnalyzer()
    df["sentiment"] = df["open_response"].apply(
        lambda x: analyzer.polarity_scores(x)["compound"]
        if x and x.strip() else None
    )

    df = df.merge(
        customer_master[["customer_id","segment"]],
        left_on="user_id", right_on="customer_id", how="left"
    )

    return pd.DataFrame({
        "feedback_id": [str(uuid4()) for _ in range(len(df))],
        "customer_id": df["user_id"].values,
        "survey_date": pd.to_datetime(df["survey_date"]).dt.date,
        "nps_score": df["nps_score"].values,
        "nps_category": df["nps_category"].values,
        "response_text": df["open_response"].values,
        "sentiment_score": df["sentiment"].round(4).values,
        "customer_segment": df["segment"].values,
        "processed_at": datetime.utcnow(),
    })`,
      },
      {
        name: "schema.sql",
        type: "sql",
        content: `CREATE TABLE warehouse.customer_feedback (
    feedback_id UUID NOT NULL,
    customer_id VARCHAR(64) NOT NULL,
    survey_date DATE NOT NULL,
    nps_score SMALLINT NOT NULL,
    nps_category VARCHAR(16) NOT NULL,
    response_text TEXT,
    sentiment_score FLOAT,
    customer_segment VARCHAR(32),
    processed_at TIMESTAMP NOT NULL
);`,
      },
    ],
    schema: {
      proposed: [
        {
          name: "feedback_id",
          type: "UUID",
          nullable: false,
          description: "Unique identifier",
        },
        {
          name: "customer_id",
          type: "VARCHAR(64)",
          nullable: false,
          description: "Linked customer ID",
        },
        {
          name: "survey_date",
          type: "DATE",
          nullable: false,
          description: "Date submitted",
        },
        {
          name: "nps_score",
          type: "SMALLINT",
          nullable: false,
          description: "Raw NPS score (0-10)",
        },
        {
          name: "nps_category",
          type: "VARCHAR(16)",
          nullable: false,
          description: "Promoter/Passive/Detractor",
        },
        {
          name: "response_text",
          type: "TEXT",
          nullable: true,
          description: "Open-ended response",
        },
        {
          name: "sentiment_score",
          type: "FLOAT",
          nullable: true,
          description: "Sentiment (-1.0 to 1.0)",
        },
        {
          name: "customer_segment",
          type: "VARCHAR(32)",
          nullable: true,
          description: "From customer master",
        },
        {
          name: "processed_at",
          type: "TIMESTAMP",
          nullable: false,
          description: "Transform timestamp",
        },
      ],
      reasoning:
        "Star-schema-friendly flat table. Derived columns enable direct BI queries.",
    },
  },
  {
    id: "ws-3",
    title: "Shopify Orders → Financial Reporting",
    source: "shopify_prod.orders",
    target: "finance.order_line_items_fact",
    phaseIndex: 3,
    phaseStatus: "awaiting_input",
    created: "1 day ago",
    description: "Flatten nested Shopify orders into line-item fact table.",
    files: [
      {
        name: "shopify_to_lineitems.sql",
        type: "sql",
        active: true,
        content: `-- Shopify Orders → Line Items Fact
WITH exploded AS (
    SELECT
        o.id AS order_id, o.created_at AS order_date,
        o.financial_status, o.currency,
        o.total_discounts AS order_discount,
        li.id AS line_item_id, li.title AS product_title,
        li.quantity, li.price AS unit_price,
        li.total_discount AS line_discount
    FROM shopify_prod.orders o,
    UNNEST(o.line_items) AS li
),

with_discount AS (
    SELECT e.*,
        e.line_discount + (
            (e.unit_price * e.quantity) /
            NULLIF(SUM(e.unit_price * e.quantity)
                OVER (PARTITION BY e.order_id), 0)
        ) * e.order_discount AS discount_amount
    FROM exploded e
),

with_tax AS (
    SELECT d.*, COALESCE(t.tax_amount, 0) AS tax_amount
    FROM with_discount d
    LEFT JOIN shopify_prod.order_line_taxes t
        ON d.order_id = t.order_id
        AND d.line_item_id = t.line_item_id
)

SELECT
    CONCAT('ORD-', order_id) AS order_id,
    CONCAT('LI-', line_item_id) AS line_item_id,
    product_title, quantity, unit_price,
    ROUND(discount_amount, 2) AS discount_amount,
    tax_amount,
    ROUND((unit_price*quantity) - discount_amount + tax_amount, 2) AS line_total,
    currency, DATE(order_date) AS order_date,
    CASE
        WHEN financial_status IN ('paid','partially_refunded') THEN TRUE
        ELSE FALSE
    END AS revenue_recognized
FROM with_tax;`,
      },
      {
        name: "tests.sql",
        type: "sql",
        content: `-- Validation queries
SELECT COUNT(*) AS row_diff
FROM (
    SELECT COUNT(*) AS src FROM shopify_prod.orders o, UNNEST(o.line_items)
    UNION ALL
    SELECT COUNT(*) FROM finance.order_line_items_fact
);

SELECT COUNT(*) AS null_orders
FROM finance.order_line_items_fact
WHERE order_id IS NULL;`,
      },
    ],
    validation: {
      sampleSize: 500,
      totalRows: 84219,
      sample: [
        {
          order_id: "ORD-10421",
          line_item: "LI-29881",
          product: "Wireless Charger",
          qty: 2,
          price: 39.99,
          discount: 8.0,
          tax: 5.92,
          total: 77.9,
          rev: true,
        },
        {
          order_id: "ORD-10421",
          line_item: "LI-29882",
          product: "USB-C Cable",
          qty: 3,
          price: 12.99,
          discount: 0,
          tax: 3.21,
          total: 42.18,
          rev: true,
        },
        {
          order_id: "ORD-10422",
          line_item: "LI-29883",
          product: "Laptop Stand",
          qty: 1,
          price: 89.99,
          discount: 13.5,
          tax: 6.12,
          total: 82.61,
          rev: true,
        },
        {
          order_id: "ORD-10423",
          line_item: "LI-29884",
          product: "Desk Mat XL",
          qty: 1,
          price: 34.99,
          discount: 0,
          tax: 2.8,
          total: 37.79,
          rev: false,
        },
      ],
      checks: [
        { label: "Row count", status: "pass", detail: "500 / 500 ✓" },
        { label: "Line totals", status: "pass", detail: "Arithmetic checks pass ✓" },
        { label: "No null IDs", status: "pass", detail: "0 nulls ✓" },
        {
          label: "Revenue flag",
          status: "warn",
          detail: "12 refunded → false — confirm",
        },
      ],
    },
  },
  {
    id: "ws-4",
    title: "Zendesk Tickets → Support Analytics",
    source: "zendesk_api.tickets",
    target: "analytics.support_tickets_fact",
    phaseIndex: 5,
    phaseStatus: "complete",
    created: "2 days ago",
    description: "Zendesk tickets into structured support analytics.",
    files: [
      {
        name: "zendesk_transform.sql",
        type: "sql",
        active: true,
        content: `-- Zendesk → Support Analytics
WITH base AS (
    SELECT
        t.id AS ticket_id, t.created_at, t.solved_at,
        t.priority, t.status,
        t.assignee_id AS assigned_agent_id, t.tags,
        CASE WHEN t.solved_at IS NOT NULL
            THEN business_hours_diff(t.created_at, t.solved_at, 'America/New_York')
            ELSE NULL
        END AS resolution_hours
    FROM zendesk_api.tickets t
),

classified AS (
    SELECT b.*,
        CASE
            WHEN tags ILIKE ANY ('%billing%','%invoice%') THEN 'Billing'
            WHEN tags ILIKE ANY ('%login%','%password%') THEN 'Account Access'
            WHEN tags ILIKE ANY ('%bug%','%error%') THEN 'Product Bug'
            WHEN tags ILIKE ANY ('%feature%','%request%') THEN 'Feature Request'
            WHEN tags ILIKE ANY ('%setup%','%onboard%') THEN 'Onboarding'
            WHEN tags ILIKE ANY ('%api%','%webhook%') THEN 'Integration'
            WHEN tags ILIKE ANY ('%slow%','%timeout%') THEN 'Performance'
            ELSE 'Other'
        END AS primary_topic
    FROM base b
)

SELECT * FROM classified;`,
      },
    ],
    verification: {
      queries: [
        {
          title: "Row Count",
          sql: "SELECT COUNT(*) FROM zendesk_api.tickets;",
          result: { count: 23847 },
          status: "pass",
        },
        {
          title: "Null Check",
          sql: "SELECT SUM(CASE WHEN ticket_id IS NULL THEN 1 ELSE 0 END) AS nulls\nFROM analytics.support_tickets_fact;",
          result: { nulls: 0 },
          status: "pass",
        },
        {
          title: "Topic Coverage",
          sql: "SELECT primary_topic, COUNT(*) AS cnt\nFROM analytics.support_tickets_fact\nGROUP BY 1 ORDER BY cnt DESC;",
          result: [
            { topic: "Billing", cnt: 5247 },
            { topic: "Account Access", cnt: 4103 },
            { topic: "Product Bug", cnt: 3891 },
            { topic: "Feature Request", cnt: 3214 },
            { topic: "Onboarding", cnt: 2876 },
            { topic: "Integration", cnt: 2341 },
            { topic: "Performance", cnt: 1289 },
            { topic: "Other", cnt: 886 },
          ],
          status: "pass",
        },
      ],
    },
  },
];

export const INIT_FEED: FeedItem[] = [
  {
    id: "f-1",
    workstreamId: "ws-2",
    wsTitle: "NPS Survey → Feedback Warehouse",
    type: "schema_approval",
    critical: true,
    title: "Schema design ready for review",
    description: "11 columns including derived sentiment and topic fields.",
    timestamp: "12 min ago",
    resolved: false,
  },
  {
    id: "f-2",
    workstreamId: "ws-3",
    wsTitle: "Shopify → Financial Reporting",
    type: "validation_approval",
    critical: true,
    title: "Sample validation — review results",
    description: "4/5 checks passed, 1 warning on revenue recognition.",
    timestamp: "38 min ago",
    resolved: false,
  },
  {
    id: "f-3",
    workstreamId: "ws-1",
    wsTitle: "Stripe → Revenue Analytics",
    type: "pii_detection",
    critical: false,
    title: "PII detected in source data",
    description: "receipt_email excluded from LLM context.",
    timestamp: "1 hr ago",
    resolved: false,
    autoProceeds: true,
    autoTimer: "Auto-proceeding in 2 hours",
  },
  {
    id: "f-4",
    workstreamId: "ws-4",
    wsTitle: "Zendesk → Support Analytics",
    type: "verification_complete",
    critical: false,
    title: "All verification queries passing",
    description: "5/5 pass. 23,847 rows. Full topic coverage.",
    timestamp: "3 hr ago",
    resolved: false,
  },
  {
    id: "f-5",
    workstreamId: "ws-1",
    wsTitle: "Stripe → Revenue Analytics",
    type: "context_question",
    critical: false,
    title: "Currency handling question",
    description: "Normalize to USD, or keep original + add usd_amount?",
    timestamp: "1 hr ago",
    resolved: false,
    autoProceeds: true,
    autoTimer: "Defaulting to usd_amount in 4 hrs",
    options: ["Normalize to USD", "Keep + usd_amount"],
  },
];

export const PIPELINES: PipelineItem[] = [
  {
    id: "pl-1",
    name: "Zendesk → Support Analytics",
    schedule: "Daily 6:00 AM ET",
    lastRun: "Today 6:00 AM",
    lastStatus: "success",
    nextRun: "Tomorrow 6:00 AM",
    rows: 23847,
    wsId: "ws-4",
    freshness: "2 hrs ago",
  },
  {
    id: "pl-2",
    name: "Salesforce Contacts → CRM Warehouse",
    schedule: "Every 4 hours",
    lastRun: "Today 2:00 PM",
    lastStatus: "success",
    nextRun: "Today 6:00 PM",
    rows: 156432,
    wsId: null,
    freshness: "14 min ago",
  },
  {
    id: "pl-3",
    name: "GA4 Events → Product Analytics",
    schedule: "Hourly",
    lastRun: "Today 3:00 PM",
    lastStatus: "failed",
    nextRun: "Today 4:00 PM",
    rows: 2841093,
    wsId: null,
    freshness: "1 hr ago",
  },
  {
    id: "pl-4",
    name: "HubSpot Deals → Revenue Pipeline",
    schedule: "Daily 7:00 AM ET",
    lastRun: "Today 7:00 AM",
    lastStatus: "success",
    nextRun: "Tomorrow 7:00 AM",
    rows: 8429,
    wsId: null,
    freshness: "8 hrs ago",
  },
];

export const SCRATCH_RESULTS: QueryResult = {
  columns: [
    "transaction_id",
    "currency",
    "amount_usd",
    "payment_method",
    "transaction_date",
  ],
  rows: [
    ["txn_3MqK8a2e", "usd", 125.0, "card", "2024-11-15"],
    ["txn_3MqK9b3f", "eur", 89.42, "card", "2024-11-15"],
    ["txn_3MqKAc4g", "gbp", 210.5, "bank_transfer", "2024-11-15"],
    ["txn_3MqKBd5h", "usd", 45.0, "apple_pay", "2024-11-15"],
    ["txn_3MqKCe6i", "usd", 1250.0, "card", "2024-11-15"],
    ["txn_3MqKDf7j", "jpy", 33.21, "card", "2024-11-14"],
    ["txn_3MqKEg8k", "usd", 78.99, "google_pay", "2024-11-14"],
    ["txn_3MqKFh9l", "cad", 156.33, "card", "2024-11-14"],
    ["txn_3MqKGi0m", "usd", 499.0, "bank_transfer", "2024-11-14"],
    ["txn_3MqKHj1n", "eur", 62.18, "card", "2024-11-14"],
  ],
  rowCount: 142837,
  elapsed: "1.2s",
};
