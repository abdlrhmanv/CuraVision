def evaluate_response(question: str, answer: str, context: list[dict]) -> dict:
    context_text = " ".join([c["text"].lower() for c in context])
    answer_text = answer.lower()
    
    # Extract meaningful words (remove stopwords, keep medical terms)
    stopwords = {"a", "an", "the", "is", "are", "was", "were", "this", "that", "it"}
    answer_words = [w for w in answer_text.split() 
                   if w not in stopwords and len(w) > 2]  # Now catches 3+ chars
    
    grounded = any(
        word in context_text
        for word in answer_words
    )
    
    relevance = len(answer.strip()) > 30 and not any(
        phrase in answer_text 
        for phrase in ["i don't know", "i cannot", "i'm not sure"]
    )
    
    return {
        "grounded": grounded,
        "relevance": relevance,
        "context_count": len(context),
    }