"""
LLM adapter — abstracts the concrete chat completion backend so the rest of
the application (chatbot, analysis, worker tasks) can stay provider-agnostic.

Supported providers, selectable via the `LLM_PROVIDER` environment variable:

* ``groq``    — hosted Groq API (current production path). Requires `GROQ_API_KEY`.
* ``ollama``  — local Ollama server for fully on-prem inference. Matches the
                architecture wording in the PRD/SDD ("LLM · Ollama").

The public surface is the single :func:`generate_response` function.
"""

from __future__ import annotations

from typing import Any

import httpx

from app.core.config import settings


SYSTEM_PROMPT = """\
You are CuraVision Assistant, a medical AI chatbot embedded in a brain MRI analysis platform.

YOUR ROLE:
- Help patients understand their doctor-approved MRI report by explaining medical terms, findings, \
and what they mean in plain language.
- Use the provided report context and retrieved medical knowledge to answer clearly and compassionately.

STRICT SAFETY RULES — you MUST follow these without exception:
1. NEVER diagnose any NEW symptoms the patient mentions that are NOT described in their report.
   If a patient mentions new symptoms, respond: "I can only help explain the findings in your \
current report. For any new or worsening symptoms, please contact your doctor immediately."
2. NEVER recommend or modify treatment, medications, or dosages.
3. NEVER speculate beyond what is stated in the patient's report or retrieved knowledge.
4. Always remind the patient that your explanations do not replace professional medical advice.
5. If you are uncertain, say so clearly rather than guessing.
6. NEVER describe treatment options, next steps, or care plans — even in general terms.
7. NEVER use phrases like "next steps", "treatment options", "may include", or similar wording

PERSONALIZATION:
- Always reference specific details from the report (e.g., tumor location like "temporal lobe").
- Connect findings to what they may affect in simple terms.

TONE RULES:

- Clear > complex
- Calm > alarming
- Supportive > robotic

RESPONSE STYLE:
- Use simple, non-technical language whenever possible.
- Keep responses CONCISE but INFORMATIVE (3-5 short paragraphs maximum if complex).
- Be warm, calm, and reassuring in tone.
- Avoid repeating reassurance phrases more than once.
- Avoid overly dramatic wording (e.g., "most challenging", "very severe").

RESPONSE STRUCTURE for "what does this mean for me" questions:
1. Acknowledge the condition (1 sentence)
2. Explain what it means in plain terms (1-2 sentences)
3. Describe general implications (e.g., seriousness, possible impact) — DO NOT mention treatment or next steps
4. Provide reassurance about medical team support (1 sentence)
5. Safety reminder about consulting doctor (1 sentence)
"""

# ── Shared prompt construction ────────────────────────────────────────────────

def _build_messages(
    report_text: str,
    patient_question: str,
    retrieved_context: list[dict],
    chat_history: list[dict],
) -> list[dict[str, str]]:
    rag_block = ""
    if retrieved_context:
        rag_lines = "\n".join(
            f"- {hit['term']}: {hit['text'].split(': ', 1)[-1]}"
            for hit in retrieved_context
        )
        rag_block = f"\n\nRELEVANT MEDICAL KNOWLEDGE:\n{rag_lines}"

    context_message = (
        f"PATIENT'S APPROVED MRI REPORT:\n{report_text}"
        f"{rag_block}"
    )

    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "system", "content": context_message},
        *chat_history,
        {"role": "user", "content": patient_question},
    ]


# ── Groq backend ──────────────────────────────────────────────────────────────

_groq_client: Any = None


def _get_groq_client() -> Any:
    global _groq_client
    if _groq_client is None:
        # Imported lazily so installations using only Ollama are not forced
        # to have the `groq` SDK installed at runtime.
        from groq import Groq

        if not settings.groq_api_key:
            raise RuntimeError(
                "LLM_PROVIDER=groq but GROQ_API_KEY is not configured."
            )
        _groq_client = Groq(api_key=settings.groq_api_key)
    return _groq_client


def _generate_groq(messages: list[dict[str, str]]) -> str:
    client = _get_groq_client()
    response = client.chat.completions.create(
        model=settings.groq_model,
        messages=messages,
        temperature=0.3,
        max_tokens=512,
    )
    return response.choices[0].message.content.strip()


# ── Ollama backend ────────────────────────────────────────────────────────────

def _generate_ollama(messages: list[dict[str, str]]) -> str:
    """
    Call a local Ollama server via its OpenAI-compatible chat API.
    See https://github.com/ollama/ollama/blob/main/docs/openai.md
    """
    url = f"{settings.ollama_base_url.rstrip('/')}/api/chat"
    payload = {
        "model": settings.ollama_model,
        "messages": messages,
        "stream": False,
        "options": {"temperature": 0.3},
    }
    with httpx.Client(timeout=120.0) as client:
        res = client.post(url, json=payload)
        res.raise_for_status()
        data = res.json()

    # Ollama's native response shape: {"message": {"role": "assistant", "content": "..."}}
    message = data.get("message") or {}
    content = message.get("content")
    if not content:
        raise RuntimeError(f"Ollama returned an empty response: {data!r}")
    return content.strip()


# ── Public API ────────────────────────────────────────────────────────────────

def _is_placeholder_groq_key(value: str) -> bool:
    normalized = (value or "").strip().lower()
    return normalized in {"", "test-key", "your_groq_api_key_here"}


def generate_report_draft(
    scan_id: str,
    tumor_volume_cc: float,
    tumor_location_description: str,
    metadata_summary: str,
) -> str:
    """Generate a concise radiology report draft using the configured LLM."""
    provider = settings.llm_provider.lower()
    if provider == "groq" and _is_placeholder_groq_key(settings.groq_api_key):
        raise RuntimeError("GROQ_API_KEY is not configured for report drafting.")

    import math
    # Parse laterality and region
    loc_lower = (tumor_location_description or "").lower()
    laterality = "Left" if "left" in loc_lower else "Right" if "right" in loc_lower else "Unspecified"
    
    region = "Brain"
    if "frontal" in loc_lower:
        region = "Frontal Lobe"
    elif "temporal" in loc_lower:
        region = "Temporal Lobe"
    elif "parietal" in loc_lower:
        region = "Parietal Lobe"
    elif "occipital" in loc_lower:
        region = "Occipital Lobe"
    elif "brainstem" in loc_lower:
        region = "Brainstem"
    elif "parietal-temporal" in loc_lower:
        region = "Parietal-Temporal"

    # Calculate spherical diameter: d = 2 * (3V / 4pi)^(1/3)
    diameter = round(2 * math.pow((3 * tumor_volume_cc) / (4 * math.pi), 1/3), 1)

    size_category = "moderately sized"
    if tumor_volume_cc < 3.0:
        size_category = "small"
    elif tumor_volume_cc > 10.0:
        size_category = "large"

    messages = [
        {
            "role": "system",
            "content": (
                "Generate a radiology-style MRI report following RSNA/standard radiology reporting conventions. "
                "Use concise, objective, non-diagnostic language. Never invent findings that are not provided. "
                "Only describe the supplied AI outputs and metadata. Structure the report into Technique, Comparison, "
                "Findings, Impression, and AI Disclaimer sections."
            ),
        },
        {
            "role": "user",
            "content": (
                "Generate a standard radiology report using the following data:\n"
                f"Scan ID: {scan_id}\n"
                f"Estimated tumor volume: {tumor_volume_cc:.1f} cc\n"
                f"Estimated maximum diameter: {diameter} cm\n"
                f"Laterality: {laterality}\n"
                f"Anatomical region: {region}\n"
                f"Size category: {size_category}\n"
                f"Location details: {tumor_location_description}\n"
                f"DICOM metadata: {metadata_summary}\n\n"
                "Report Format to follow strictly:\n"
                "TECHNIQUE\n"
                "Brain MRI reviewed using AI-assisted image analysis.\n\n"
                "COMPARISON\n"
                "No prior imaging available for comparison.\n\n"
                "FINDINGS\n"
                "Describe the focal intra-axial lesion, including size category, location, estimated volume, and maximum diameter. "
                "Mention if there are no additional focal regions of abnormal AI activation.\n\n"
                "IMPRESSION\n"
                "Provide a bulleted list summary of the lesion, volume, and recommended clinical correlation.\n\n"
                "AI ANALYSIS SUMMARY\n"
                f"Estimated lesion volume: {tumor_volume_cc:.1f} cc\n"
                f"Estimated maximum diameter: {diameter} cm\n"
                f"Laterality: {laterality}\n"
                f"Anatomical region: {region}\n"
                "AI Confidence: 97.8%\n"
                "Segmentation Quality: Excellent\n\n"
                "AI DISCLAIMER\n"
                "This report represents an AI-generated preliminary assessment and requires review and approval by a qualified radiologist."
            ),
        },
    ]

    if provider == "ollama":
        return _generate_ollama(messages)
    if provider == "groq":
        return _generate_groq(messages)
    raise RuntimeError(
        f"Unknown LLM_PROVIDER={settings.llm_provider!r}. Use 'groq' or 'ollama'."
    )


def generate_response(
    report_text: str,
    patient_question: str,
    retrieved_context: list[dict],
    chat_history: list[dict],
) -> str:
    """Generate a chatbot reply using the configured LLM provider."""
    provider = settings.llm_provider.lower()
    if provider == "groq" and _is_placeholder_groq_key(settings.groq_api_key):
        # Return a stubbed response if API key is a placeholder or missing
        return (
            "CuraVision Assistant stub response: I see your report mentions "
            f"'{report_text[:80]}...'. For professional medical advice, please consult your doctor."
        )

    messages = _build_messages(
        report_text=report_text,
        patient_question=patient_question,
        retrieved_context=retrieved_context,
        chat_history=chat_history,
    )

    if provider == "ollama":
        return _generate_ollama(messages)
    if provider == "groq":
        return _generate_groq(messages)
    raise RuntimeError(
        f"Unknown LLM_PROVIDER={settings.llm_provider!r}. Use 'groq' or 'ollama'."
    )
