import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
const PORT = 3001;

// Enable CORS for all routes
app.use(cors({
  origin: [
    'http://localhost:8080',
    'http://127.0.0.1:8080',
    'https://juristinsight.samuelninsiima.com',
    'http://juristinsight.samuelninsiima.com'
  ],
  credentials: true
}));

// Parse JSON bodies
app.use(express.json());

// Download endpoint that bypasses CORS
app.post('/download', async (req, res) => {
  try {
    const { url, apiKey } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    console.log(`Downloading: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LexAI-Advisor/1.0)',
        ...(apiKey && { 'Authorization': `Token ${apiKey}` })
      }
    });

    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }

    const buffer = await response.buffer();
    
    res.set({
      'Content-Type': response.headers.get('content-type') || 'application/pdf',
      'Content-Length': buffer.length.toString()
    });
    
    res.send(buffer);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GCS file download endpoint that bypasses CORS
app.post('/gcs-download', async (req, res) => {
  try {
    const { filePath, bucketName } = req.body;
    
    if (!filePath) {
      return res.status(400).json({ error: 'filePath is required' });
    }

    const bucket = bucketName || 'lex-legal-documents-bucket';
    
    // Get API key from environment
    const apiKey = process.env.VITE_GOOGLE_CLOUD_API_KEY;
    
    // Use GCS REST API with API key authentication
    let gcsUrl = `https://storage.googleapis.com/storage/v1/b/${bucket}/o/${encodeURIComponent(filePath)}?alt=media`;
    
    if (apiKey) {
      gcsUrl += `&key=${apiKey}`;
    }
    
    console.log(`Downloading GCS file: ${gcsUrl}`);
    
    const response = await fetch(gcsUrl);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`GCS download failed: ${response.status} ${response.statusText} - ${errorText}`);
      throw new Error(`GCS download failed: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    
    // Determine content type based on file extension
    const fileName = filePath.split('/').pop();
    const fileExtension = fileName.split('.').pop().toLowerCase();
    let contentType = 'application/pdf'; // default
    
    if (fileExtension === 'txt') {
      contentType = 'text/plain';
    } else if (fileExtension === 'pdf') {
      contentType = 'application/pdf';
    } else if (fileExtension === 'html') {
      contentType = 'text/html';
    }
    
    res.set({
      'Content-Type': contentType,
      'Content-Length': buffer.byteLength.toString(),
      'Content-Disposition': `inline; filename="${fileName}"`
    });
    
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error('GCS download error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Download proxy server running on http://localhost:${PORT}`);
  console.log('Available endpoints:');
  console.log('  - POST /download -> Download documents bypassing CORS');
  console.log('  - POST /gcs-download -> Download GCS files bypassing CORS');
});
