require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');

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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Analyze scene with GPT-4 Vision
async function analyzeScene(imagePath) {
  try {
    // Read image and convert to base64
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    const mimeType = imagePath.endsWith('.png') ? 'image/png' : 'image/jpeg';

    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const visionDeployment = process.env.AZURE_OPENAI_VISION_DEPLOYMENT || 'gpt-5.2-chat';
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION;
    const url = `${endpoint}/openai/deployments/${visionDeployment}/chat/completions?api-version=${apiVersion}`;

    const payload = {
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this 3D rendered interior scene in detail. Identify:

1. **Specific furniture items and brands** (e.g., "Sonos Arc Ultra soundbar", "Herman Miller Aeron chair")
2. **Appliances and their brands** (e.g., "Wolf range", "Sub-Zero refrigerator")
3. **Flooring materials** (e.g., "European white oak hardwood", "Carrara marble tile")
4. **Wall finishes and colors** (e.g., "matte gray paint", "exposed brick")
5. **Lighting fixtures** (e.g., "pendant lights", "recessed LED lighting")
6. **Decorative items** (e.g., plants, artwork, rugs)
7. **Architectural features** (e.g., "coffered ceiling", "crown molding")

Be as specific as possible with brands, materials, and styles. Format your response as a detailed list of identified objects and materials.`
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: 1000,
      temperature: 0.3
    };

    console.log('Analyzing scene with GPT-4 Vision...');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.AZURE_OPENAI_API_KEY
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Vision API Error:', errorText);
      throw new Error(`Vision API request failed: ${response.status}`);
    }

    const result = await response.json();
    const analysis = result.choices[0].message.content;

    console.log('Scene analysis complete');
    console.log('Identified objects:', analysis.substring(0, 200) + '...');

    return analysis;
  } catch (error) {
    console.error('Error analyzing scene:', error);
    return null;
  }
}

// Analyze image endpoint
app.post('/api/analyze', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    console.log('Analyzing image:', req.file.filename);

    const imagePath = path.join(__dirname, '..', 'uploads', req.file.filename);

    // Analyze the scene
    const analysis = await analyzeScene(imagePath);

    if (!analysis) {
      return res.status(500).json({
        error: 'Failed to analyze scene',
        analysis: 'Unable to identify objects in the scene.'
      });
    }

    res.json({
      success: true,
      analysis: analysis,
      filename: req.file.filename
    });

  } catch (error) {
    console.error('Error in analyze endpoint:', error);

    // Clean up uploaded file on error
    if (req.file) {
      const imagePath = path.join(__dirname, '..', 'uploads', req.file.filename);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    res.status(500).json({
      error: 'Failed to analyze image',
      details: error.message
    });
  }
});

// Transform image endpoint
app.post('/api/transform', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    console.log('Processing image:', req.file.filename);

    const imagePath = path.join(__dirname, '..', 'uploads', req.file.filename);

    // Get custom instructions and scene analysis from request body
    const customInstructions = req.body.instructions || '';
    const sceneAnalysis = req.body.sceneAnalysis || '';

    // Build prompt for transforming render to photorealistic
    let prompt = `Transform this 3D rendered room into a photorealistic photograph.
Maintain the exact same layout, furniture placement, camera angle, and composition.
Add realistic lighting, textures, materials, shadows, and subtle imperfections that make it look like a real photograph.
Enhance surfaces with realistic materials: wood grain, fabric textures, metal reflections, glass transparency, etc.
Keep the same color scheme but make it look naturally lit and photographed with a high-quality camera.`;

    // Include scene analysis for accuracy
    if (sceneAnalysis.trim()) {
      prompt += `\n\nIdentified objects and materials in the scene:\n${sceneAnalysis.trim()}\n\nEnsure these specific items and materials are rendered with photorealistic accuracy in the output.`;
      console.log('Using scene analysis for transformation');
    }

    // Append custom instructions if provided
    if (customInstructions.trim()) {
      prompt += `\n\nAdditional instructions: ${customInstructions.trim()}`;
      console.log('Custom instructions:', customInstructions.trim());
    }

    console.log('Calling Azure OpenAI GPT-Image-1.5...');

    // Prepare form data for image-to-image API
    const formData = new FormData();
    formData.append('image[]', fs.createReadStream(imagePath));
    formData.append('prompt', prompt);
    formData.append('model', process.env.AZURE_OPENAI_IMAGE_MODEL || 'gpt-image-1.5');
    formData.append('size', '1024x1024');
    formData.append('quality', 'high');
    formData.append('n', '1');

    // Build the Azure OpenAI endpoint URL
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const deploymentName = process.env.AZURE_OPENAI_IMAGE_DEPLOYMENT || 'gpt-image-1.5';
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-02-01';
    const url = `${endpoint}/openai/deployments/${deploymentName}/images/edits?api-version=${apiVersion}`;

    console.log('Endpoint:', url);

    // Make the API request
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'api-key': process.env.AZURE_OPENAI_API_KEY,
        ...formData.getHeaders()
      },
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', errorText);
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.data || result.data.length === 0) {
      throw new Error('No image generated');
    }

    // GPT-Image-1.5 returns base64-encoded images
    const base64Image = result.data[0].b64_json;
    const imageUrl = `data:image/png;base64,${base64Image}`;

    console.log('Image generated successfully');

    // Clean up uploaded file
    fs.unlinkSync(imagePath);

    res.json({
      success: true,
      imageUrl: imageUrl,
      revisedPrompt: result.data[0].revised_prompt || prompt
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