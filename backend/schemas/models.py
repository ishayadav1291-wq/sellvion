from typing import Any, Literal, Optional
from typing_extensions import TypedDict
from pydantic import BaseModel, Field


# =============================================================================
# LangGraph Shared Typed State (7 Specialized Agents + Supervisor)
# =============================================================================

AgentRouteTarget = Literal[
    "customer_intelligence",
    "cod_risk_intelligence",
    "udhaar_management",
    "marketing_retention",
    "whatsapp_communication",
    "autonomy_policy",
    "analytics_roi",
    "complete",
]


class AgentStepTrace(BaseModel):
    agent_id: str
    agent_name: str
    step_order: int
    status: Literal["completed", "failed", "escalated", "skipped"]
    reason: str
    confidence: Optional[int] = None
    duration_ms: int = 0
    output: dict[str, Any] = Field(default_factory=dict)


class SellvionAgentState(TypedDict, total=False):
    workflow_id: str
    thread_id: str
    business_id: str
    user_id: Optional[str]
    mode: Literal["demo", "live"]
    language: str
    trigger_source: str
    workflow_type: Literal[
        "reactivation",
        "cod_protection",
        "udhaar_collection",
        "reorder_scan",
        "copilot_qa",
        "analytics_roi",
    ]
    user_query: Optional[str]
    target_customer_id: Optional[str]
    target_order_id: Optional[str]

    # Supervisor routing
    next_agent: str
    completed_agents: list[str]
    route_reason: str

    # Domain context assembled by specialized agents
    customer: Optional[dict[str, Any]]
    order: Optional[dict[str, Any]]
    customer_360_insight: dict[str, Any]
    cod_risk_result: dict[str, Any]
    udhaar_result: dict[str, Any]
    retention_strategy: dict[str, Any]
    draft_result: dict[str, Any]
    policy_result: dict[str, Any]
    roi_result: dict[str, Any]
    copilot_reply: Optional[str]

    # Action / Human-in-the-loop state
    action_type: Literal[
        "reorder_reminder",
        "cod_prepay",
        "cod_verify",
        "udhaar_reminder",
        "winback_offer",
    ]
    action_title: str
    potential_impact: str
    confidence: int
    approval_id: Optional[str]
    requires_approval: bool
    human_decision: Optional[dict[str, Any]]
    execution_result: dict[str, Any]

    # Execution & Error telemetry
    status: str
    current_step: str
    error_message: str
    deduplicated: bool
    traces: list[dict[str, Any]]
    final_message: str


# =============================================================================
# LangChain Structured Output Schemas
# =============================================================================

class SupervisorRouteDecision(BaseModel):
    primary_intent: Literal[
        "reactivation",
        "cod_protection",
        "udhaar_collection",
        "reorder_scan",
        "copilot_qa",
        "analytics_roi",
    ]
    initial_agent: AgentRouteTarget
    reasoning: str = Field(description="Concise rationale for selecting this route.")


class WhatsAppDraftOutput(BaseModel):
    message_text: str = Field(description="Respectful, concise WhatsApp message (2-3 sentences).")
    tone_used: str = Field(default="warm_hinglish")
    includes_cta: bool = Field(default=True)


class VoiceIntentOutput(BaseModel):
    intent: Literal[
        "show_udhaar",
        "show_cod_risk",
        "show_reorders",
        "show_orders",
        "prepare_reminders",
        "open_approvals",
        "unknown",
    ]
    targetTab: Literal[
        "dashboard",
        "udhaar",
        "cod-risk",
        "customers",
        "inbox",
        "agents",
        "orders",
    ]
    summary: str
    requiresConfirmation: bool = False
    suggestedWorkflow: Optional[
        Literal["reactivation", "cod_protection", "udhaar_collection"]
    ] = None


class RetentionCampaignOutput(BaseModel):
    strategy: Literal["reorder_reminder", "winback_offer", "vip_appreciation"]
    recommended_offer: str
    discount_pct: int = Field(ge=0, le=25)
    confidence: int = Field(ge=0, le=100)
    rationale: str


# =============================================================================
# FastAPI HTTP Request / Response Contracts (Frontend Compatibility)
# =============================================================================

class RunWorkflowRequest(BaseModel):
    workflowType: Literal[
        "reactivation",
        "cod_protection",
        "udhaar_collection",
        "reorder_scan",
    ] = "reactivation"
    targetCustomerId: Optional[str] = None
    targetOrderId: Optional[str] = None
    language: Optional[str] = None


class ApprovalEditRequest(BaseModel):
    suggestedMessage: str = Field(min_length=1)


class ApprovalDecisionRequest(BaseModel):
    decision: Literal["approve", "retry", "reject", "snooze", "schedule", "escalate"]
    reason: str = ""
    scheduledFor: str = ""
    overrideQuietHours: bool = True


class BulkApproveRequest(BaseModel):
    ids: list[str] = Field(min_length=1)


class DraftMessageRequest(BaseModel):
    customerName: str = "Customer"
    customerCity: str = ""
    productName: str = ""
    lastOrderDaysAgo: int = 0
    recommendedAction: Optional[str] = None
    actionType: Optional[str] = None
    tone: str = "warm_hinglish"
    language: str = "hinglish"
    udhaarAmount: float = 0
    orderId: Optional[str] = None
    discountOffer: str = ""


class CopilotRequest(BaseModel):
    query: str = Field(min_length=1)
    language: str = "en"
    merchantContext: Optional[dict[str, Any]] = None


class VoiceCommandRequest(BaseModel):
    transcript: str = Field(min_length=1)


class CodScoreRequest(BaseModel):
    isFirstTimeBuyer: bool = False
    pincode: str = ""
    address: str = ""
    amount: float = 0
    priorRtoCount: int = 0


class AgenticAnalyzeRequest(BaseModel):
    query: str = Field(min_length=1)
    workflowType: Optional[
        Literal[
            "reactivation",
            "cod_protection",
            "udhaar_collection",
            "reorder_scan",
            "copilot_qa",
            "analytics_roi",
        ]
    ] = None
    customerId: Optional[str] = None
    orderId: Optional[str] = None
    language: str = "en"
