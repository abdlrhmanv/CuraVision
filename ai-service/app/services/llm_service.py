from groq import Groq

from app.core.config import settings

_client: Groq | None = None


def _get_client() -> Groq:
    global _client
    if _client is None:
        _client = Groq(api_key=settings.groq_api_key)
    return _client


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

RESPONSE STYLE:
- Use simple, non-technical language whenever possible.
- Keep responses concise (2–4 short paragraphs maximum).
- Be warm, calm, and reassuring in tone.
"""


def generate_response(
    report_text: str,
    patient_question: str,
    retrieved_context: list[dict],
    chat_history: list[dict],
) -> str:
    """
    Build the full prompt and call Groq to get a chatbot reply.

    :param report_text: The doctor-approved report text for this patient.
    :param patient_question: The patient's latest message.
    :param retrieved_context: RAG hits from the medical glossary.
    :param chat_history: Previous turns [{role: "user"|"assistant", content: str}].
    :returns: The assistant's reply as a plain string.
    """
    client = _get_client()

    # Build context block from RAG hits
    rag_block = ""
    if retrieved_context:
        rag_lines = "\n".join(
            f"- {hit['term']}: {hit['text'].split(': ', 1)[-1]}"
            for hit in retrieved_context
        )
        rag_block = f"\n\nRELEVANT MEDICAL KNOWLEDGE:\n{rag_lines}"

    # Build the user-facing system message with injected context
    context_message = (
        f"PATIENT'S APPROVED MRI REPORT:\n{report_text}"
        f"{rag_block}"
    )

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "system", "content": context_message},
        *chat_history,
        {"role": "user", "content": patient_question},
    ]

    response = client.chat.completions.create(
        model=settings.groq_model,
        messages=messages,
        temperature=0.3,      # Low temperature → more consistent, factual replies
        max_tokens=512,
    )

    return response.choices[0].message.content.strip()
