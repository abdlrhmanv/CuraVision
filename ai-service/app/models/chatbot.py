from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: str = Field(..., pattern="^(user|assistant)$")
    content: str


class ChatbotRequest(BaseModel):
    report_text: str = Field(..., min_length=1, description="Doctor-approved MRI report text")
    patient_question: str = Field(..., min_length=1, max_length=1000)
    chat_history: list[ChatMessage] = Field(default_factory=list)


class ChatbotResponse(BaseModel):
    answer: str
    sources: list[str]
