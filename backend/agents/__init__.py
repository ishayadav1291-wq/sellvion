"""SELLVION 7 Specialized AI Agents + Supervisor Router."""

SPECIALIZED_AGENT_CATALOG = [
    {
        "id": "customer_intelligence",
        "name": "Customer Intelligence Agent",
        "role": "Builds Customer 360 profiles, behavioural segmentation, and semantic memory from orders & payments.",
        "permissionScope": "Read business customers, orders, payments & semantic memory",
    },
    {
        "id": "whatsapp_communication",
        "name": "WhatsApp Communication Agent",
        "role": "Generates personalized Hinglish, Hindi, and English WhatsApp messages via Gemini Flash.",
        "permissionScope": "Draft messages only (cannot dispatch directly)",
    },
    {
        "id": "cod_risk_intelligence",
        "name": "COD Risk Intelligence Agent",
        "role": "Scores COD return-to-origin (RTO) risk, flags incomplete addresses, and recommends UPI conversion.",
        "permissionScope": "Score orders and classify delivery risk",
    },
    {
        "id": "udhaar_management",
        "name": "Udhaar Management Agent",
        "role": "Tracks customer credit ledger balances, calculates overdue windows, and prepares polite payment nudges.",
        "permissionScope": "Read udhaar ledger and payment history",
    },
    {
        "id": "marketing_retention",
        "name": "Marketing & Retention Agent",
        "role": "Predicts repeat-purchase windows, designs win-back campaigns, and selects bounded offers.",
        "permissionScope": "Recommend retention campaigns within discount caps",
    },
    {
        "id": "autonomy_policy",
        "name": "Autonomy & Policy Agent",
        "role": "Enforces consent, STOP opt-outs, 9 PM-9 AM IST quiet hours, frequency caps, and Human-in-the-Loop checkpoints.",
        "permissionScope": "Enforce safety guardrails and block non-compliant dispatches",
    },
    {
        "id": "analytics_roi",
        "name": "Analytics & ROI Agent",
        "role": "Measures holdout vs engaged A/B revenue lift, attribution, and post-execution verification.",
        "permissionScope": "Analyze revenue lift, holdout cohorts, and verify outcomes",
    },
]
