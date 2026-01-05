require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { OpenAIClient, AzureKeyCredential } = require('@azure/openai');

const app = express();
const PORT = process.env.PORT || 5000;

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Initialize Azure OpenAI client
const client = new OpenAIClient(
  process.env.AZURE_OPENAI_ENDPOINT,
  new AzureKeyCredential(process.env.AZURE_OPENAI_API_KEY)
);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Transform image endpoint
app.post('/api/transform', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    console.log('Processing image:', req.file.filename);

    // Read the uploaded image as base64
    const imagePath = path.join(__dirname, '..', 'uploads', req.file.filename);
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    const imageUrl = `data:${req.file.mimetype};base64,${base64Image}`;

    // Use DALL-E 3 for image generation with the uploaded image as reference
    const prompt = `Transform this 3D rendered room into a photorealistic image.
    Maintain the exact same layout, furniture placement, camera angle, and composition.
    Add realistic lighting, textures, materials, shadows, and subtle imperfections that make it look like a real photograph.
    Enhance surfaces with realistic materials: wood grain, fabric textures, metal reflections, etc.
    Keep the same color scheme but make it look naturally lit and photographed with a high-quality camera.`;

    console.log('Calling Azure OpenAI DALL-E...');

    const deploymentName = process.env.AZURE_OPENAI_DALLE_DEPLOYMENT || 'dall-e-3';

    const result = await client.getImages(deploymentName, prompt, {
      n: 1,
      size: '1024x1024',
      quality: 'hd',
      style: 'natural'
    });

    if (!result.data || result.data.length === 0) {
      throw new Error('No image generated');
    }

    const generatedImageUrl = result.data[0].url;
    const revisedPrompt = result.data[0].revisedPrompt;

    console.log('Image generated successfully');

    // Clean up uploaded file
    fs.unlinkSync(imagePath);

    res.json({
      success: true,
      imageUrl: generatedImageUrl,
      revisedPrompt: revisedPrompt
    });

  } catch (error) {
    console.error('Error transforming image:', error);

    // Clean up uploaded file on error
    if (req.file) {
      const imagePath = path.join(__dirname, '..', 'uploads', req.file.filename);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    res.status(500).json({
      error: 'Failed to transform image',
      details: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Azure OpenAI Endpoint: ${process.env.AZURE_OPENAI_ENDPOINT ? 'Configured' : 'NOT CONFIGURED'}`);
});
