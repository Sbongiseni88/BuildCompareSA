import os
from typing import List, Optional
from dotenv import load_dotenv
from groq import Groq
import chromadb
from chromadb.utils import embedding_functions

# Load environment variables
load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
CHROMA_PATH = "./chroma_db"


class GroqRAGService:
    """
    RAG Service using ChromaDB for context retrieval and Groq Cloud for LLM generation.
    Uses Llama 3.1 8B Instant model for fast responses.
    """
    
    def __init__(self):
        self.groq_client: Optional[Groq] = None
        self.collection = None
        self.model_name = "llama-3.1-8b-instant"
        self._initialize()
    
    def _initialize(self):
        # Initialize Groq client
        if GROQ_API_KEY:
            self.groq_client = Groq(api_key=GROQ_API_KEY)
        else:
            print("WARNING: GROQ_API_KEY not found in environment.")
        
        # Initialize ChromaDB
        try:
            chroma_client = chromadb.PersistentClient(path=CHROMA_PATH)
            sentence_transformer_ef = embedding_functions.SentenceTransformerEmbeddingFunction(
                model_name="all-MiniLM-L6-v2"
            )
            self.collection = chroma_client.get_collection(
                name="buildcompare_knowledge",
                embedding_function=sentence_transformer_ef
            )
        except Exception as e:
            print(f"WARNING: ChromaDB collection not found. Run seed_chroma.py first. Error: {e}")
            self.collection = None
    
    def retrieve_context(self, query: str, n_results: int = 3) -> List[str]:
        """Retrieve relevant context from ChromaDB."""
        if not self.collection:
            return []
        
        results = self.collection.query(
            query_texts=[query],
            n_results=n_results
        )
        
        documents = results['documents'][0] if results['documents'] else []
        return documents
    
    def generate_response(self, query: str, context: List[str]) -> str:
        """Generate a response using Groq Llama 3.1."""
        if not self.groq_client:
            return "Error: Groq API key not configured."
        
        context_block = "\n".join([f"- {doc}" for doc in context])
        
        system_prompt = """You are an expert South African construction assistant for BuildCompare SA.
You help contractors with material selection, quantity calculations, and advice based on SANS 10400 building regulations.
Answer concisely and practically. Use ZAR for all prices. Reference SA-specific brands when possible."""

        user_prompt = f"""Based on this context from our knowledge base:
{context_block}

User question: {query}

Provide a helpful, practical answer:"""

        try:
            chat_completion = self.groq_client.chat.completions.create(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                model=self.model_name,
                temperature=0.7,
                max_tokens=1024,
            )
            return chat_completion.choices[0].message.content
        except Exception as e:
            return f"Error generating response: {str(e)}"
    
    def query(self, user_query: str, n_context_results: int = 3) -> dict:
        """
        Full RAG pipeline: retrieve context -> generate response.
        """
        context = self.retrieve_context(user_query, n_context_results)
        response = self.generate_response(user_query, context)
        
        return {
            "query": user_query,
            "context_retrieved": context,
            "llm_response": response,
            "model_used": self.model_name
        }
    
    def generate_boq(self, specs: dict) -> dict:
        """
        Generate a structured Bill of Quantities (BoQ) from project specifications.
        """
        if not self.groq_client:
            return {"error": "Groq API key not configured"}
            
        system_prompt = """You are an expert Quantity Surveyor AI for BuildCompare SA.
Your task is to convert project specifications into a detailed Bill of Quantities (BoQ).
You must output ONLY valid JSON.
The JSON structure must be a list of objects under the key "materials".
Each material object must have:
- "name": string (e.g. "PPC Surebuild Cement 42.5N")
- "category": string (one of: cement, bricks, steel, timber, plumbing, electrical, paint, roofing, tiles, hardware, labor, other)
- "quantity": number (integer or float)
- "unit": string (e.g. bags, m3, units, rolls, m2)
- "brand": string (optional, suggest a common SA brand like PPC, Corobrik, etc.)

Estimate quantities conservatively including 10% waste.
"""
        
        user_prompt = f"""Generate a BoQ for the following project specifications:
        
Foundation: {specs.get('foundation', 'Standard strip footings')}
Structure: {specs.get('structure', 'Double skin brick walls')}
Roofing: {specs.get('roofing', 'Concrete roof tiles')}
Finishing: {specs.get('finishing', 'Standard plaster and paint')}

Provide a comprehensive list of materials needed."""

        try:
            chat_completion = self.groq_client.chat.completions.create(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                model=self.model_name,
                temperature=0.2, # Low temperature for consistent JSON
                max_tokens=2048,
                response_format={"type": "json_object"}
            )
            return chat_completion.choices[0].message.content
        except Exception as e:
            # Fallback for error handling
            print(f"BoQ Generation Error: {e}")
            return '{"materials": []}'


# Singleton instance
groq_rag_service = GroqRAGService()
