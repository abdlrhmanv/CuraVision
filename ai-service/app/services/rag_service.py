import json
from pathlib import Path

import chromadb
from chromadb.config import Settings as ChromaSettings

from app.core.config import settings


COLLECTION_NAME = "medical_glossary"
GLOSSARY_PATH = Path(__file__).parent.parent.parent / "data" / "medical_glossary.json"

# Singleton client + collection
_client = None
_collection = None


def _build_client():
    """Prefer the remote HTTP client when CHROMA_HOST is set; otherwise fall
    back to an in-process EphemeralClient. Either way the public API on the
    returned client is identical."""
    if settings.chroma_host:
        return chromadb.HttpClient(
            host=settings.chroma_host,
            port=settings.chroma_port,
            settings=ChromaSettings(anonymized_telemetry=False),
        )
    return chromadb.EphemeralClient(
        settings=ChromaSettings(anonymized_telemetry=False),
    )


def _get_collection():
    global _client, _collection

    if _collection is not None:
        return _collection

    _client = _build_client()
    _collection = _client.get_or_create_collection(
        name=COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},
    )

    if _collection.count() == 0:
        _seed_glossary(_collection)

    return _collection


def _seed_glossary(collection) -> None:
    """Load the medical glossary JSON and upsert every term into ChromaDB."""
    with open(GLOSSARY_PATH, encoding="utf-8") as f:
        glossary: list[dict] = json.load(f)

    documents = [f"{entry['term']}: {entry['definition']}" for entry in glossary]
    ids = [f"term_{i}" for i in range(len(glossary))]
    metadatas = [{"term": entry["term"]} for entry in glossary]

    collection.upsert(documents=documents, ids=ids, metadatas=metadatas)


def expand_query(query: str) -> str:
    """Expand query with related medical terms for better retrieval."""
    # Simple synonym mapping
    synonyms = {
        "inflammation": "edema swelling cerebritis",
        "dangerous": "severe serious malignant aggressive",
        "swelling": "edema inflammation",
        "brain": "cerebral intracranial",
        "tumor": "neoplasm mass lesion"
    }
    
    query_lower = query.lower()
    expanded_terms = [query]
    
    for term, expansion in synonyms.items():
        if term in query_lower:
            expanded_terms.append(expansion)
    
    return " ".join(expanded_terms)

def retrieve(query: str, n_results: int = 3) -> list[dict]:
    """Query the medical glossary with query expansion."""
    collection = _get_collection()
    
    # Expand query for better retrieval
    expanded_query = expand_query(query)
    
    results = collection.query(
        query_texts=[expanded_query], 
        n_results=min(n_results * 2, collection.count()),  
        include=["documents", "metadatas", "distances"],
    )

    # Cosine distance: 0 = identical, 2 = opposite. Accept reasonably close hits.
    max_distance = 1.5
    hits = []
    
    for doc, meta, distance in zip(
        results["documents"][0],
        results["metadatas"][0],
        results["distances"][0],
    ):
        if distance < max_distance:
            hits.append({
                "term": meta["term"],
                "text": doc,
                "score": 1 - distance,
            })
    
    hits = sorted(hits, key=lambda x: x["score"], reverse=True)[:n_results]
    return hits

