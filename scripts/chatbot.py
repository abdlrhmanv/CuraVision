import os
import sys
import io
from pathlib import Path
from typing import Optional

# Fix Unicode encoding for Windows console
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_core.prompts import PromptTemplate
from groq import Groq
from dotenv import load_dotenv



load_dotenv()

MODEL_NAME = "llama-3.1-8b-instant"

client = Groq(
    api_key=os.getenv("GROQ_API_KEY"),
)

DOCS_DIR = Path("knowledge_base/")
CHROMA_DIR = Path("chroma_db/")


SYSTEM_PROMPT = """You are CuraVision Assistant, a medical information chatbot.
You help patients understand their brain MRI results and general tumor information.

STRICT RULES you must ALWAYS follow:
1. Only answer using the provided context below. Never use outside knowledge.
2. Never make a diagnosis or say "you have" any condition.
3. Never recommend specific treatments or medications.
4. If the answer is not in the context, say: "I don't have enough information on that. Please ask your doctor."
5. Always end with: "This information is educational only. Always consult your doctor."
6. Always cite which document your answer came from.

Context from verified medical literature:
{context}

Patient question: {question}

Answer (grounded, safe, cited):"""

PROMPT = PromptTemplate(
    template=SYSTEM_PROMPT,
    input_variables=["context", "question"]
)



def build_knowledge_base(docs_dir: Path = DOCS_DIR,
                          chroma_dir: Path = CHROMA_DIR,
                          force_rebuild: bool = False):
    """
    Load documents, chunk them, embed, and store in ChromaDB.
    Only runs if the DB doesn't exist yet or force_rebuild=True.
    """
    embeddings = HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2",
        model_kwargs={"device": "cpu"}  
    )

    if chroma_dir.exists() and not force_rebuild:
        print("Loading existing ChromaDB...")
        return Chroma(
            persist_directory=str(chroma_dir),
            embedding_function=embeddings
        )

    print("Building knowledge base from scratch...")
    docs = []


    for file in docs_dir.glob("**/*"):
        if file.suffix == ".pdf":
            loader = PyPDFLoader(str(file))
        elif file.suffix == ".txt":
            loader = TextLoader(str(file))
        else:
            continue
        docs.extend(loader.load())
        print(f"   Loaded: {file.name}")

    if not docs:
        raise ValueError(f"No documents found in {docs_dir}. Add PDFs first.")


    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50,
        separators=["\n\n", "\n", ".", " "]
    )
    chunks = splitter.split_documents(docs)
    print(f"Created {len(chunks)} chunks from {len(docs)} documents")


    vectorstore = Chroma.from_documents(
        documents=chunks,
        embedding=embeddings,
        persist_directory=str(chroma_dir)
    )
    vectorstore.persist()
    print(f"ChromaDB built and saved to {chroma_dir}")
    return vectorstore


def ask_groq(question, context):
    prompt = PROMPT.format(context=context, question=question)

    response = client.chat.completions.create(
        model=MODEL_NAME,
        messages=[
            {"role": "system", "content": "You are a safe medical assistant."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.1
    )

    return response.choices[0].message.content



REFUSAL_TRIGGERS = [
    "you have", "you are diagnosed", "you should take",
    "i recommend", "your tumor", "you need surgery",
    "take this medication", "you will", "definitely"
]

def safety_check(response: str) -> dict:
    """
    Post-generation safety filter.
    Flags any response that slips into diagnosis or treatment territory.
    """
    response_lower = response.lower()
    triggered = [t for t in REFUSAL_TRIGGERS if t in response_lower]

    if triggered:
        return {
            "safe": False,
            "flagged_phrases": triggered,
            "override_response": (
                "I'm not able to provide that specific information. "
                "Please discuss your results directly with your doctor, "
                "who can give you personalized medical advice.\n\n"
                "_This information is educational only. Always consult your doctor._"
            )
        }
    return {"safe": True}



def chat(question: str,
         vectorstore,
         chain=None,
         scan_context: Optional[dict] = None) -> dict:
    """
    Ask a question. Optionally inject the patient's scan result as context.

    scan_context example:
    {
        "predicted_class": "glioma",
        "confidence": 0.92,
        "clinical_note": "Glioma detected. Recommend neurologist referral."
    }
    """

    if scan_context:
        enriched_question = (
            f"My MRI scan result shows: {scan_context['predicted_class']} "
            f"(confidence: {scan_context['confidence']:.0%}). "
            f"Doctor note: {scan_context['clinical_note']}. "
            f"My question: {question}"
        )
    else:
        enriched_question = question


    docs = vectorstore.similarity_search(enriched_question, k=4)

    context = "\n\n".join([doc.page_content for doc in docs])

    answer = ask_groq(enriched_question, context)
    sources = docs



    safety = safety_check(answer)
    if not safety["safe"]:
        answer = safety["override_response"]


    citations = list({
        doc.metadata.get("source", "Unknown document")
        for doc in sources
    })

    return {
        "answer": answer,
        "sources": citations,
        "safe": safety["safe"],
        "retrieved_chunks": len(sources)
    }


if __name__ == "__main__":
    print("[+] Starting CuraVision Chatbot...")


    vectorstore = build_knowledge_base()

    while True:
        question = input("\nAsk a question (or type 'exit'): ")

        if question.lower() == "exit":
            break

        response = chat(question, vectorstore)

        print("\n[ANSWER]:")
        print(response["answer"])

        print("\n[SOURCES]:")
        print(response["sources"])
