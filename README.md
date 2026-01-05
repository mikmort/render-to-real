# Render to Real

Transform 3D rendered room images into photorealistic images using Azure OpenAI DALL-E.

## Features

- Drag and drop interface for easy image upload
- AI-powered transformation using Azure OpenAI DALL-E 3
- Side-by-side comparison of original render and photorealistic result
- Download transformed images
- Secure backend API to protect your Azure credentials
- Modern, responsive UI

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Azure OpenAI account with DALL-E 3 deployment

## Setup Instructions

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/render-to-real.git
cd render-to-real
```

### 2. Install dependencies

Install root dependencies:
```bash
npm install
```

Install client dependencies:
```bash
cd client
npm install
cd ..
```

### 3. Configure Azure OpenAI

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit the `.env` file with your Azure OpenAI credentials:

```
AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com/
AZURE_OPENAI_API_KEY=your-api-key-here
AZURE_OPENAI_DALLE_DEPLOYMENT=dall-e-3
PORT=5000
```

#### Getting Azure OpenAI Credentials:

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to your Azure OpenAI resource
3. Go to "Keys and Endpoint" section
4. Copy your endpoint URL and API key
5. Ensure you have a DALL-E 3 model deployment

### 4. Run the application

Development mode (runs both server and client):
```bash
npm run dev
```

Or run separately:

Server only:
```bash
npm run server
```

Client only:
```bash
cd client && npm start
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## Usage

1. Open the app in your browser at http://localhost:3000
2. Drag and drop a 3D rendered room image or click to browse
3. Click "Transform to Photorealistic"
4. Wait for the AI to process (typically 10-30 seconds)
5. View the photorealistic result side-by-side with the original
6. Download the transformed image if desired

## Project Structure

```
render-to-real/
├── client/                 # React frontend
│   ├── public/
│   └── src/
│       ├── App.js         # Main app component
│       ├── App.css        # Styling
│       └── index.js       # Entry point
├── server/                # Express backend
│   └── index.js          # API server with Azure OpenAI integration
├── uploads/              # Temporary upload directory
├── .env.example          # Environment variables template
├── .gitignore           # Git ignore rules
├── package.json         # Root dependencies
└── README.md            # This file
```

## API Endpoints

### POST /api/transform

Transforms a 3D rendered image into a photorealistic version.

**Request:**
- Method: POST
- Content-Type: multipart/form-data
- Body: image file

**Response:**
```json
{
  "success": true,
  "imageUrl": "https://...",
  "revisedPrompt": "..."
}
```

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "message": "Server is running"
}
```

## Technologies Used

- **Frontend:**
  - React
  - CSS3 with modern gradients and animations
  - Fetch API for HTTP requests

- **Backend:**
  - Node.js
  - Express.js
  - Multer for file uploads
  - Azure OpenAI SDK

- **AI:**
  - Azure OpenAI DALL-E 3

## Tips for Best Results

- Use high-quality 3D renders with clear details
- Images with good lighting and composition work best
- The AI maintains the layout and structure of the original render
- Results may vary based on the complexity of the scene

## Troubleshooting

**Error: "Failed to transform image"**
- Check that your Azure OpenAI credentials are correct in `.env`
- Ensure your DALL-E 3 deployment name matches the configuration
- Verify your Azure subscription has available quota

**Server not starting:**
- Make sure port 5000 is not in use
- Check that all dependencies are installed
- Verify your `.env` file exists and has valid values

**Client not connecting to server:**
- Ensure the backend is running on port 5000
- Check for CORS issues in browser console
- Verify the API URL in App.js matches your server port

## Security Notes

- Never commit your `.env` file to version control
- The `.gitignore` file is configured to exclude sensitive files
- API keys are kept server-side for security
- Uploaded images are automatically deleted after processing

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
