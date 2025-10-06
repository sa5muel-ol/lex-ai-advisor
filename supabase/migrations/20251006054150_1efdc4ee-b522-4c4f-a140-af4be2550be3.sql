-- Enable pgvector extension for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- Create enum for document status
CREATE TYPE document_status AS ENUM ('processing', 'indexed', 'failed');

-- Create enum for PII detection status
CREATE TYPE pii_status AS ENUM ('pending', 'detected', 'redacted', 'clean');

-- Legal documents table
CREATE TABLE legal_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  status document_status DEFAULT 'processing',
  pii_status pii_status DEFAULT 'pending',
  extracted_text TEXT,
  summary TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE legal_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies for legal_documents
CREATE POLICY "Users can view their own documents"
  ON legal_documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own documents"
  ON legal_documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents"
  ON legal_documents FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents"
  ON legal_documents FOR DELETE
  USING (auth.uid() = user_id);

-- Document chunks table for semantic search
CREATE TABLE document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES legal_documents(id) ON DELETE CASCADE,
  chunk_text TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  page_number INTEGER,
  embedding vector(768),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

-- RLS policies for document_chunks
CREATE POLICY "Users can view chunks of their documents"
  ON document_chunks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM legal_documents
      WHERE legal_documents.id = document_chunks.document_id
      AND legal_documents.user_id = auth.uid()
    )
  );

-- Create index for vector similarity search
CREATE INDEX ON document_chunks USING ivfflat (embedding vector_cosine_ops);

-- Create index for document lookups
CREATE INDEX idx_document_chunks_document_id ON document_chunks(document_id);

-- Legal strategies table
CREATE TABLE legal_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES legal_documents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  strategy_type TEXT NOT NULL,
  strategy_text TEXT NOT NULL,
  supporting_citations JSONB DEFAULT '[]',
  confidence_score DECIMAL(3,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE legal_strategies ENABLE ROW LEVEL SECURITY;

-- RLS policies for legal_strategies
CREATE POLICY "Users can view their own strategies"
  ON legal_strategies FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own strategies"
  ON legal_strategies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Similar cases table
CREATE TABLE similar_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_document_id UUID REFERENCES legal_documents(id) ON DELETE CASCADE,
  matched_document_id UUID REFERENCES legal_documents(id) ON DELETE CASCADE,
  similarity_score DECIMAL(5,4) NOT NULL,
  matching_chunks JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE similar_cases ENABLE ROW LEVEL SECURITY;

-- RLS policies for similar_cases
CREATE POLICY "Users can view similarity matches for their documents"
  ON similar_cases FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM legal_documents
      WHERE legal_documents.id = similar_cases.source_document_id
      AND legal_documents.user_id = auth.uid()
    )
  );

-- Search history table
CREATE TABLE search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  query_text TEXT NOT NULL,
  result_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for search_history
CREATE POLICY "Users can view their own search history"
  ON search_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own searches"
  ON search_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create storage bucket for legal documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('legal-documents', 'legal-documents', false);

-- Storage policies
CREATE POLICY "Users can upload their own documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'legal-documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'legal-documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'legal-documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for legal_documents
CREATE TRIGGER update_legal_documents_updated_at
  BEFORE UPDATE ON legal_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();