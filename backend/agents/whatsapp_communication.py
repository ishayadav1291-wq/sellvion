from __future__ import annotations

import time
from typing import Any, Optional

from backend.llm.provider import llm_provider
from backend.prompts.templates import WHATSAPP_MESSAGE_PROMPT
from backend.schemas.models import SellvionAgentState, WhatsAppDraftOutput


def build_deterministic_whatsapp_draft(
    *,
    customer_name: str,
    product_name: str = "",
    last_order_days_ago: int = 0,
    action_type: str = "reorder_reminder",
    language: str = "hinglish",
    udhaar_amount: float = 0,
    order_id: Optional[str] = None,
) -> str:
    name = customer_name or "ji"
    if language == "hi":
        if action_type == "udhaar_reminder":
            return f"नमस्ते {name} जी! आपका ₹{int(round(udhaar_amount or 0)):,} का बकाया भुगतान लंबित है। कृपया सुविधा अनुसार भुगतान कर दें। धन्यवाद!"
        if action_type in ("cod_prepay", "cod_verify"):
            return f"नमस्ते {name} जी! आपका ऑर्डर {order_id or ''} भेजने के लिए तैयार है। कृपया डिलीवरी पता कन्फर्म करें।"
        return f"नमस्ते {name} जी! आपका पसंदीदा {product_name or 'सामान'} लगभग समाप्त हो रहा होगा। क्या हम नया पैक भेजें?"

    if action_type == "cod_prepay":
        return f"Namaste {name} ji! 🙏 Your order {order_id or ''} is packed. Please confirm your full house/flat address, or reply if you would like a UPI prepayment link."
    if action_type == "cod_verify":
        return f'Namaste {name} ji! 🙏 Before we dispatch order {order_id or ""}, please reply "CONFIRM" with your house/flat number so delivery is smooth.'
    if action_type == "udhaar_reminder":
        return f"Namaste {name} ji! 🙏 Friendly reminder that ₹{int(round(udhaar_amount or 0)):,} is pending on your khata account. Please clear when convenient. Thank you!"
    if action_type == "winback_offer":
        return f"Namaste {name} ji! 🌿 We missed you at our store. Fresh stock of {product_name or 'your favorite items'} is in — reply YES to reorder anytime."
    return f"Namaste {name} ji! 🙏 Hope you are doing well. Your {product_name or 'regular order'} (~{last_order_days_ago or 28} days ago) may be running low. Should we dispatch a fresh pack?"


async def generate_whatsapp_message(
    *,
    customer_name: str,
    customer_city: str = "",
    product_name: str = "",
    last_order_days_ago: int = 0,
    action_type: str = "reorder_reminder",
    tone: str = "warm_hinglish",
    language: str = "hinglish",
    udhaar_amount: float = 0,
    order_id: Optional[str] = None,
    discount_text: str = "",
) -> dict[str, Any]:
    fallback = build_deterministic_whatsapp_draft(
        customer_name=customer_name,
        product_name=product_name,
        last_order_days_ago=last_order_days_ago,
        action_type=action_type,
        language=language,
        udhaar_amount=udhaar_amount,
        order_id=order_id,
    )

    if not llm_provider.is_configured:
        return {
            "draft": fallback,
            "model": "template-engine",
            "isAiGenerated": False,
            "note": "Gemini API key not configured; used deterministic template.",
        }

    language_label = (
        "Simple Hindi (Devanagari)"
        if language == "hi"
        else "Simple, warm Indian English"
        if language == "en"
        else "Natural conversational Hinglish (polite Hindi + English mix)"
    )

    structured, model_used = await llm_provider.invoke_prompt_structured(
        WHATSAPP_MESSAGE_PROMPT,
        WhatsAppDraftOutput,
        {
            "language_label": language_label,
            "customer_name": customer_name,
            "customer_city": customer_city or "India",
            "action_type": action_type,
            "product_name": product_name or "Recent purchase",
            "last_order_days_ago": last_order_days_ago,
            "order_id": order_id or "N/A",
            "udhaar_label": f"₹{int(round(udhaar_amount)):,}" if udhaar_amount else "None",
            "tone": tone or "warm_polite",
            "discount_text": discount_text or "None",
        },
    )
    if structured and structured.message_text.strip():
        return {
            "draft": structured.message_text.strip(),
            "model": model_used,
            "isAiGenerated": True,
        }

    raw_text, text_model = await llm_provider.invoke_prompt_text(
        WHATSAPP_MESSAGE_PROMPT,
        {
            "language_label": language_label,
            "customer_name": customer_name,
            "customer_city": customer_city or "India",
            "action_type": action_type,
            "product_name": product_name or "Recent purchase",
            "last_order_days_ago": last_order_days_ago,
            "order_id": order_id or "N/A",
            "udhaar_label": f"₹{int(round(udhaar_amount)):,}" if udhaar_amount else "None",
            "tone": tone or "warm_polite",
            "discount_text": discount_text or "None",
        },
    )
    if raw_text:
        return {"draft": raw_text, "model": text_model, "isAiGenerated": True}

    return {
        "draft": fallback,
        "model": "template-engine",
        "isAiGenerated": False,
        "note": "Fallback used after Gemini timeout or quota error.",
    }


async def run_whatsapp_communication_agent(state: SellvionAgentState) -> dict[str, Any]:
    """Agent 2: Generates personalized Hinglish/Hindi/English WhatsApp drafts via LangChain + Gemini."""
    started = time.perf_counter()
    customer = state.get("customer") or {}
    order = state.get("order") or {}
    action_type = state.get("action_type", "reorder_reminder")
    language = state.get("language") or str(customer.get("preferred_language") or "hinglish")
    retention = state.get("retention_strategy") or {}

    draft_res = await generate_whatsapp_message(
        customer_name=str(customer.get("name", "Customer")),
        customer_city=str(customer.get("city", "")),
        product_name=str(customer.get("last_product_ordered", "")),
        last_order_days_ago=int(customer.get("days_since_last_order", 0) or 0),
        action_type=action_type,
        language=language,
        udhaar_amount=float(customer.get("outstanding_udhaar", 0) or 0),
        order_id=str(order["order_number"]) if order.get("order_number") else None,
        discount_text=str(retention.get("recommended_offer", "")),
    )

    duration_ms = max(12, int((time.perf_counter() - started) * 1000))
    completed = list(state.get("completed_agents") or [])
    completed.append("whatsapp_communication")
    traces = list(state.get("traces") or [])
    traces.append(
        {
            "agent_id": "whatsapp_communication",
            "agent_name": "WhatsApp Communication Agent",
            "step_order": len(traces) + 1,
            "status": "completed",
            "reason": f"Drafted personalized message via {draft_res['model']}.",
            "confidence": state.get("confidence", 88),
            "duration_ms": duration_ms,
            "output": {"model": draft_res["model"], "draft": draft_res["draft"]},
        }
    )

    return {
        "draft_result": draft_res,
        "completed_agents": completed,
        "traces": traces,
        "current_step": "act",
        "next_agent": "autonomy_policy",
    }
