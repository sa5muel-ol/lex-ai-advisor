#!/bin/bash

# Add sample legal documents to Elasticsearch
echo "Adding sample legal documents to Elasticsearch..."

# Sample legal document 1
curl -X POST "http://localhost:9200/legal_documents/_doc/1" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Contract Dispute Resolution Case",
    "content": "This case involves a contract dispute between two parties regarding payment terms and delivery schedules. The plaintiff alleges breach of contract while the defendant claims force majeure circumstances prevented performance.",
    "summary": "Contract dispute involving payment terms and delivery schedules with force majeure claims.",
    "case_type": "Contract Law",
    "court": "Superior Court",
    "date": "2024-01-15",
    "tags": ["contract", "dispute", "payment", "delivery"]
  }'

echo ""

# Sample legal document 2
curl -X POST "http://localhost:9200/legal_documents/_doc/2" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Employment Discrimination Lawsuit",
    "content": "An employee filed a discrimination lawsuit against their employer alleging wrongful termination based on age and gender. The case involves EEOC guidelines and state employment laws.",
    "summary": "Employment discrimination case involving age and gender-based wrongful termination.",
    "case_type": "Employment Law",
    "court": "District Court",
    "date": "2024-02-20",
    "tags": ["employment", "discrimination", "termination", "EEOC"]
  }'

echo ""

# Sample legal document 3
curl -X POST "http://localhost:9200/legal_documents/_doc/3" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Intellectual Property Infringement",
    "content": "A technology company is suing a competitor for patent infringement related to software algorithms. The case involves complex technical analysis and prior art considerations.",
    "summary": "Patent infringement case involving software algorithms and prior art analysis.",
    "case_type": "Intellectual Property",
    "court": "Federal Court",
    "date": "2024-03-10",
    "tags": ["patent", "infringement", "software", "technology"]
  }'

echo ""

# Sample legal document 4
curl -X POST "http://localhost:9200/legal_documents/_doc/4" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Personal Injury Settlement",
    "content": "A pedestrian was injured in a crosswalk accident involving a commercial vehicle. The case settled out of court for $500,000 after mediation and expert witness testimony.",
    "summary": "Personal injury case involving pedestrian accident with commercial vehicle, settled for $500,000.",
    "case_type": "Personal Injury",
    "court": "Circuit Court",
    "date": "2024-04-05",
    "tags": ["personal injury", "accident", "settlement", "mediation"]
  }'

echo ""

# Sample legal document 5
curl -X POST "http://localhost:9200/legal_documents/_doc/5" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Real Estate Transaction Dispute",
    "content": "A real estate transaction failed to close due to title issues and financing problems. The buyer is seeking return of earnest money while the seller claims breach of contract.",
    "summary": "Real estate transaction dispute involving title issues and financing problems.",
    "case_type": "Real Estate Law",
    "court": "Municipal Court",
    "date": "2024-05-12",
    "tags": ["real estate", "transaction", "title", "financing"]
  }'

echo ""
echo "Sample documents added successfully!"
echo "You can now test the search functionality."
