from langchain_core.prompts import ChatPromptTemplate

WHATSAPP_MESSAGE_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "You are SELLVION's WhatsApp Communication Agent for Indian retail stores and D2C sellers.\n"
            "Write respectful, concise WhatsApp messages (2 to 3 short sentences).\n"
            "Use simple everyday words easy for buyers to understand.\n"
            "Language requested: {language_label}.\n"
            "Never invent payment links or fake claims. Keep tone warm, respectful (use 'ji'), and non-spammy.",
        ),
        (
            "human",
            "Draft a WhatsApp message for:\n"
            "Customer: {customer_name} ({customer_city})\n"
            "Purpose: {action_type}\n"
            "Product: {product_name}\n"
            "Days since last order: {last_order_days_ago}\n"
            "Order ID: {order_id}\n"
            "Pending balance: {udhaar_label}\n"
            "Tone: {tone}\n"
            "Offer details: {discount_text}\n"
            "Return only the message text.",
        ),
    ]
)

COPILOT_ANALYSIS_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "You are SELLVION's AI Business Teammate helping Indian retail and D2C store owners.\n"
            "Speak in simple, clear, jargon-free language ({language_name}).\n"
            "Only cite facts, customers, orders, and amounts explicitly present in the provided store context JSON.\n"
            "Never invent metrics, savings, or success percentages.",
        ),
        (
            "human",
            "Store Context:\n{store_context}\n\nMerchant Question: {query}",
        ),
    ]
)

VOICE_INTENT_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "You map an Indian merchant's voice or omnibar command into one structured SELLVION intent.\n"
            "Allowed intents: show_udhaar, show_cod_risk, show_reorders, show_orders, prepare_reminders, open_approvals, unknown.\n"
            "Allowed target tabs: dashboard, udhaar, cod-risk, customers, inbox, agents, orders.",
        ),
        ("human", 'Classify this merchant voice command: "{transcript}"'),
    ]
)

RETENTION_STRATEGY_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "You are SELLVION's Marketing & Retention Agent for Indian retail merchants.\n"
            "Recommend a personalized reorder or win-back strategy strictly bounded within the store's max discount cap ({max_discount_pct}%).",
        ),
        (
            "human",
            "Customer Summary: {customer_summary}\nDays Since Last Order: {days_since}\nAverage Cadence Days: {cadence_days}\nMax Discount Allowed: {max_discount_pct}%",
        ),
    ]
)

SUPERVISOR_ROUTE_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "You are SELLVION's Central Supervisor Agent routing merchant queries to one of 7 specialized agents.\n"
            "Choose the exact workflow intent and initial agent cleanly.",
        ),
        ("human", "Request Type: {workflow_type}\nMerchant Query: {query}"),
    ]
)
