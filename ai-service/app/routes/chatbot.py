from fastapi import APIRouter, HTTPException

from app.models.chatbot import ChatbotRequest, ChatbotResponse
from app.services import rag_service, llm_service

router = APIRouter()


@router.post("/chatbot", response_model=ChatbotResponse)
async def chatbot(request: ChatbotRequest) -> ChatbotResponse:
    """
    RAG-powered chatbot endpoint.

    1. Retrieve relevant medical glossary entries for the patient's question.
    2. Pass them, along with the patient's report and conversation history, to the LLM.
    3. Return the answer and source citations.
    """
    try:
        # Step 1 — RAG retrieval
        hits = rag_service.retrieve(request.patient_question, n_results=3)

        # Step 2 — LLM generation
        history = [{"role": msg.role, "content": msg.content} for msg in request.chat_history]
        answer = llm_service.generate_response(
            report_text=request.report_text,
            patient_question=request.patient_question,
            retrieved_context=hits,
            chat_history=history,
        )

        # Step 3 — Build source citations
        sources = [f"Medical Glossary: {hit['term']}" for hit in hits] if hits else []

        return ChatbotResponse(answer=answer, sources=sources)

    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
