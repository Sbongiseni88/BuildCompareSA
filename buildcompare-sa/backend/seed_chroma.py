import chromadb
from chromadb.utils import embedding_functions
import uuid

# Initialize ChromaDB (Persistent)
# We store it in a local folder 'chroma_db'
client = chromadb.PersistentClient(path="./chroma_db")

# Use a standard lightweight embedding model
# If sentence_transformers is not installed, this might fail, so we wrap it or assume requirements are met.
try:
    sentence_transformer_ef = embedding_functions.SentenceTransformerEmbeddingFunction(model_name="all-MiniLM-L6-v2")
except Exception as e:
    print(f"Warning: SentenceTransformer not found, using default. {e}")
    sentence_transformer_ef = None # Chroma default

def seed_database():
    print("Recreating collection 'buildcompare_knowledge'...")
    try:
        client.delete_collection(name="buildcompare_knowledge")
    except ValueError:
        pass # Collection didn't exist

    collection = client.create_collection(
        name="buildcompare_knowledge", 
        embedding_function=sentence_transformer_ef
    )

    # 1. Building Standards Data (SANS 10400 Simplified)
    documents_standards = [
        "NHBRC requires 32.5N cement for bricklaying mortar and plastering.",
        "For structural concrete (foundations, slabs), NHBRC recommends 42.5N cement to reach 25MPa strength.",
        "A standard single garage is approximately 3m x 6m (18m2).",
        "A standard double garage is approximately 6m x 6m (36m2).",
        "Damp Proof Course (DPC) must be laid under all walls to prevent rising damp.",
        "Roof trusses must be tied down with hoop iron straps embedded in the brickwork.",
        "Window glazing in bathrooms must be obscure and safety glass (SANS 10400-N).",
        "Minimum ceiling height for habitable rooms is 2.4 meters.",
        "External walls usually require a double brick skin (220mm) or verified cavity wall.",
        "Foundation trenches for single storey house are typically 600mm wide and 600mm deep."
    ]
    ids_standards = [f"std-{uuid.uuid4()}" for _ in documents_standards]
    metadatas_standards = [{"category": "standard", "source": "SANS 10400"} for _ in documents_standards]

    # 2. Material Catalog Data (Mocked from mockData.ts)
    documents_materials = [
        "Corobrik Clay Face Brick (NFP). Price approx R3.50. Good for external facing.",
        "AfriSam All Purpose Cement 50kg (32.5N). Price approx R110. General use.",
        "PPC Surebuild Cement 42.5N. Price approx R115. Structural strength.",
        "Merensky Meranti Timber 38x114. Structural timber for roof brandering or support.",
        "ArcelorMittal Y10 Rebar. High tensile steel for concrete reinforcement.",
        "Dulux Weatherguard Exterior Paint. 20L bucket covers approx 160-180m2 per coat.",
        "Plascon Double Velvet. Interior premium paint, washable.",
        "Macsteel Ref 193 Mesh. Reinforcing mesh for concrete floor slabs.",
        "Marley PVC 110mm Pipe. Sewer and waste water drainage.",
        "Makro IBR Roof Sheeting 0.47mm. Metal roofing profile."
    ]
    ids_materials = [f"mat-{uuid.uuid4()}" for _ in documents_materials]
    metadatas_materials = [{"category": "material", "source": "Store Catalog"} for _ in documents_materials]

    # Add to collection
    print(f"Adding {len(documents_standards)} standards and {len(documents_materials)} materials...")
    
    collection.add(
        documents=documents_standards + documents_materials,
        metadatas=metadatas_standards + metadatas_materials,
        ids=ids_standards + ids_materials
    )

    print("Seeding complete. Database ready.")

if __name__ == "__main__":
    seed_database()
