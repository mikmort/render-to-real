import React, { useState, useCallback } from 'react';
import './App.css';

function App() {
  const [dragActive, setDragActive] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [transformedImage, setTransformedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    setSelectedImage(file);
    setError(null);
    setTransformedImage(null);

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const transformImage = async () => {
    if (!selectedImage) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('image', selectedImage);

    try {
      const response = await fetch('http://localhost:5000/api/transform', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to transform image');
      }

      setTransformedImage(data.imageUrl);
    } catch (err) {
      setError(err.message);
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setSelectedImage(null);
    setPreviewUrl(null);
    setTransformedImage(null);
    setError(null);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Render to Real</h1>
        <p>Transform 3D rendered rooms into photorealistic images</p>
      </header>

      <main className="App-main">
        {!previewUrl ? (
          <div
            className={`drop-zone ${dragActive ? 'drag-active' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              id="file-input"
              accept="image/*"
              onChange={handleChange}
              style={{ display: 'none' }}
            />
            <label htmlFor="file-input" className="file-label">
              <div className="drop-zone-content">
                <svg className="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="drop-zone-text">
                  Drag and drop a 3D rendered room image here
                </p>
                <p className="drop-zone-subtext">or click to browse</p>
              </div>
            </label>
          </div>
        ) : (
          <div className="image-container">
            <div className="image-section">
              <h2>Original Render</h2>
              <div className="image-wrapper">
                <img src={previewUrl} alt="Original render" />
              </div>
            </div>

            {transformedImage && (
              <div className="image-section">
                <h2>Photorealistic Result</h2>
                <div className="image-wrapper">
                  <img src={transformedImage} alt="Transformed" />
                  <a
                    href={transformedImage}
                    download="photorealistic-room.png"
                    className="download-btn"
                  >
                    Download
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="error-message">
            <strong>Error:</strong> {error}
          </div>
        )}

        {previewUrl && (
          <div className="button-group">
            {!transformedImage && (
              <button
                className="btn btn-primary"
                onClick={transformImage}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    Transforming...
                  </>
                ) : (
                  'Transform to Photorealistic'
                )}
              </button>
            )}
            <button className="btn btn-secondary" onClick={reset}>
              Upload New Image
            </button>
          </div>
        )}
      </main>

      <footer className="App-footer">
        <p>Powered by Azure OpenAI DALL-E</p>
      </footer>
    </div>
  );
}

export default App;
