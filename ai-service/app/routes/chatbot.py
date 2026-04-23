from fastapi import APIRouter, HTTPException
import uuid

from ..models.chatbot import ChatbotRequest, ChatbotResponse
from ..services import rag_service, llm_service, eval_service
from ..core.logger import get_logger

router = APIRouter()
logger = get_logger("chatbot")


def build_query(request: ChatbotRequest) -> str:
    """
    Build a better retrieval query by combining chat history
    with the current question (for follow-ups like 'Is that dangerous?')
    """
    # Extract anatomical locations from chat history
    locations = ["frontal", "temporal", "parietal", "occipital", "cerebellum"]
    found_locations = []
    
    # Check chat history 
    for msg in request.chat_history:
        if msg.role == "user":
            for loc in locations:
                if loc in msg.content.lower():
                    found_locations.append(loc)
    
    last_user_msgs = [m.content for m in request.chat_history if m.role == "user"]
    
    query_parts = []
    if found_locations:
        query_parts.append(" ".join(found_locations))
    
    if last_user_msgs:
        query_parts.append(last_user_msgs[-1])
    
    query_parts.append(request.patient_question)
    
    # If no history, just return the current question
    if not request.chat_history:
        return request.patient_question
    
    return " ".join(query_parts)

@router.post("/chatbot", response_model=ChatbotResponse)
async def chatbot(request: ChatbotRequest) -> ChatbotResponse:
    request_id = str(uuid.uuid4())

    try:
        # Log incoming request
        logger.info(f"[{request_id}] Incoming question: {request.patient_question}")

        # Step 1 — Build retrieval query
        query = build_query(request)
        logger.info(f"[{request_id}] Retrieval query: {query}")

        # Step 2 — Retrieve context (RAG)
        hits = rag_service.retrieve(query, n_results=3)
        logger.info(f"[{request_id}] Retrieved terms: {[h['term'] for h in hits]}")

        # Step 3 — Prepare chat history for LLM
        history = [
            {"role": msg.role, "content": msg.content}
            for msg in request.chat_history
        ]

        # Step 4 — Generate response
        answer = llm_service.generate_response(
            report_text=request.report_text,
            patient_question=request.patient_question,
            retrieved_context=hits,
            chat_history=history,
        )

        logger.info(f"[{request_id}] Answer generated (len={len(answer)})")

        # Step 5 — Evaluate response quality
        evaluation = eval_service.evaluate_response(
            question=request.patient_question,
            answer=answer,
            context=hits,
        )

        logger.info(f"[{request_id}] Evaluation: {evaluation}")

        # Step 6 — Build sources list
        sources = [
            f"Medical Glossary: {hit['term']}"
            for hit in hits
        ] if hits else []

        # Final response
        return ChatbotResponse(
            answer=answer,
            sources=sources,
        )

    except Exception as exc:
        logger.error(f"[{request_id}] Error: {str(exc)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))