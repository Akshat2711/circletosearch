import { useRef, useEffect, useState } from "react";
import { Camera, Info, Check, X, RefreshCw, Smartphone } from "lucide-react";

const Canvas = () => {
  // IMPORTANT: Replace with your Gemini API key
  // Get your key from https://ai.google.dev/tutorials/setup
  const GEMINI_API_KEY = "AIzaSyAbJZh6dYDd5D2oQhGPKeEiNwgIUVCv2u0"; 

  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [objectInfo, setObjectInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [error, setError] = useState(null);
  
  // Camera state
  const [availableCameras, setAvailableCameras] = useState([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  
  // Store drawing coordinates
  const [drawingCoords, setDrawingCoords] = useState({
    startX: 0,
    startY: 0,
    endX: 0,
    endY: 0,
    hasDrawing: false
  });

  // Handle smooth twinkling effect by updating shadow blur and color
  const [glowIntensity, setGlowIntensity] = useState(15);
  const [glowDirection, setGlowDirection] = useState(1);

  // Function to enumerate available cameras
  const enumerateCameras = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setAvailableCameras(videoDevices);
      return videoDevices;
    } catch (error) {
      console.error("Error enumerating cameras:", error);
      return [];
    }
  };

  // Function to start video with a specific camera
  const startVideo = async (cameraIndex = 0) => {
    setIsCameraLoading(true);
    try {
      // Stop any existing stream
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }

      // Get available cameras if not already fetched
      let cameras = availableCameras;
      if (cameras.length === 0) {
        cameras = await enumerateCameras();
      }

      if (cameras.length === 0) {
        throw new Error("No cameras found");
      }

      // Ensure camera index is valid
      const validIndex = cameraIndex % cameras.length;
      setCurrentCameraIndex(validIndex);
      
      // Get camera ID
      const cameraId = cameras[validIndex].deviceId;
      
      // Start stream with selected camera
      const constraints = {
        video: {
          deviceId: { exact: cameraId }
        }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error("Error accessing webcam:", error);
      // Fallback to any available camera
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (fallbackError) {
        console.error("Failed to access any camera:", fallbackError);
      }
    } finally {
      setIsCameraLoading(false);
    }
  };

  // Initial camera setup
  useEffect(() => {
    const initCamera = async () => {
      await enumerateCameras();
      startVideo(0);
    };
    initCamera();
  }, []);

  // Function to switch to next camera
  const switchCamera = async () => {
    if (availableCameras.length <= 1) {
      // If only one or no camera, try to re-enumerate in case new ones were connected
      const cameras = await enumerateCameras();
      if (cameras.length <= 1) {
        setError("No additional cameras found");
        return;
      }
    }
    // Switch to next camera (with wrap-around)
    const nextCameraIndex = (currentCameraIndex + 1) % availableCameras.length;
    await startVideo(nextCameraIndex);
    
    // Clear any existing drawing
    clearDrawing();
  };

  useEffect(() => {
    // Animate the glow effect (smooth twinkling)
    const glowInterval = setInterval(() => {
      setGlowIntensity((prev) => {
        let newIntensity = prev + glowDirection;
        if (newIntensity >= 25 || newIntensity <= 10) {
          setGlowDirection(-glowDirection);
        }
        return newIntensity;
      });
    }, 100);

    return () => clearInterval(glowInterval);
  }, [glowDirection]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const startDrawing = (e) => {
    // Clear previous drawing
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Reset drawing coordinates
    setDrawingCoords({
      startX: e.nativeEvent.offsetX,
      startY: e.nativeEvent.offsetY,
      endX: e.nativeEvent.offsetX,
      endY: e.nativeEvent.offsetY,
      hasDrawing: true
    });
    
    setDrawing(true);
    ctx.shadowBlur = glowIntensity;
    ctx.shadowColor = "rgba(255, 255, 255, 0.4)";
    ctx.beginPath();
    ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
  };

  const draw = (e) => {
    if (!drawing) return;
    
    const ctx = canvasRef.current.getContext("2d");
    ctx.strokeStyle = "rgba(172, 172, 172, 0.4)";
    ctx.shadowBlur = glowIntensity;
    ctx.shadowColor = "rgba(255, 255, 255, 0.4)";
    ctx.lineWidth = 1;
    
    // Update end coordinates
    setDrawingCoords(prev => ({
      ...prev,
      endX: e.nativeEvent.offsetX,
      endY: e.nativeEvent.offsetY
    }));

    // Clear canvas to redraw
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    
    // Draw rectangle to represent selection area
    ctx.beginPath();
    const width = e.nativeEvent.offsetX - drawingCoords.startX;
    const height = e.nativeEvent.offsetY - drawingCoords.startY;
    ctx.rect(drawingCoords.startX, drawingCoords.startY, width, height);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setDrawing(false);
  };

  // Function to analyze object with Gemini API
  const analyzeObjectWithGemini = async () => {
    setIsLoading(true);
    setShowPanel(true);
    setError(null);
    
    try {
      // Check if API key is set
      if (GEMINI_API_KEY === "YOUR_GEMINI_API_KEY_HERE") {
        throw new Error("Please add your Gemini API key in the code");
      }
      
      // Check if user has drawn a selection
      if (!drawingCoords.hasDrawing) {
        throw new Error("Please draw around an object first");
      }
      
      // Create a temporary canvas to capture the current video frame
      const tempCanvas = document.createElement('canvas');
      const video = videoRef.current;
      
      if (!video || !video.videoWidth) {
        throw new Error("Video not ready");
      }
      
      // Calculate dimensions and position for cropping
      const x = Math.min(drawingCoords.startX, drawingCoords.endX);
      const y = Math.min(drawingCoords.startY, drawingCoords.endY);
      const width = Math.abs(drawingCoords.endX - drawingCoords.startX);
      const height = Math.abs(drawingCoords.endY - drawingCoords.startY);
      
      // Set minimum dimensions to avoid empty selections
      if (width < 20 || height < 20) {
        throw new Error("Selection area too small. Please draw a larger area.");
      }
      
      // Set canvas dimensions to match the selection size
      tempCanvas.width = width;
      tempCanvas.height = height;
      
      // Calculate scale factors between video and canvas coordinates
      const scaleX = video.videoWidth / canvasRef.current.width;
      const scaleY = video.videoHeight / canvasRef.current.height;
      
      const tempCtx = tempCanvas.getContext('2d');
      // Draw only the selected portion of the video to the temporary canvas
      tempCtx.drawImage(
        video, 
        x * scaleX, y * scaleY, width * scaleX, height * scaleY, // Source rectangle
        0, 0, width, height // Destination rectangle
      );
      
      // Convert canvas to base64 image
      const base64Image = tempCanvas.toDataURL('image/jpeg');
      
      // Prepare the request to Gemini Vision API
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: "Identify the main object in this image and provide the following information: 1) The object name, 2) A detailed description (2-3 sentences), 3) A confidence level between 0 and 1, 4) 2-3 categories the object belongs to. Format your response as a JSON object with keys: name, description, confidence, categories."
                  },
                  {
                    inline_data: {
                      mime_type: "image/jpeg",
                      data: base64Image.split(',')[1]
                    }
                  }
                ]
              }
            ],
            generation_config: {
              temperature: 0.4,
              top_p: 1,
              top_k: 32,
              max_output_tokens: 1024,
            }
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Gemini API error: ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      
      if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
        throw new Error("Invalid response format from Gemini API");
      }
      
      // Extract the text response and parse it as JSON
      const responseText = data.candidates[0].content.parts[0].text;
      
      // Try to extract JSON from the response text
      let jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || 
                      responseText.match(/\{[\s\S]*\}/);
      
      let parsedData;
      if (jsonMatch) {
        try {
          parsedData = JSON.parse(jsonMatch[0].replace(/```json\n|\n```/g, ''));
        } catch (e) {
          console.error("Error parsing JSON response:", e);
          throw new Error("Could not parse the JSON response from Gemini");
        }
      } else {
        // If no JSON found, create a simple object from the text response
        parsedData = {
          name: "Object",
          description: responseText.substring(0, 200) + "...",
          confidence: 0.7,
          categories: ["Detected Object"]
        };
      }
      
      setObjectInfo({
        name: parsedData.name || "Unknown Object",
        description: parsedData.description || "No description available",
        confidence: typeof parsedData.confidence === 'number' ? parsedData.confidence : 0.7,
        categories: Array.isArray(parsedData.categories) ? parsedData.categories : []
      });
      
    } catch (error) {
      console.error("Error analyzing image:", error);
      setError(error.message);
      setObjectInfo({
        name: "Analysis Failed",
        description: `Could not analyze the object. ${error.message}`,
        confidence: 0,
        categories: []
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Clear the drawing and reset
  const clearDrawing = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    setDrawingCoords({
      startX: 0,
      startY: 0,
      endX: 0,
      endY: 0,
      hasDrawing: false
    });
  };

  return (
    <div className="bg-gray-900" style={{ position: "relative", height: "100vh", width: "100vw", overflow: "hidden" }}>
      {/* Video container with gradient overlay */}
      <div style={{ 
        position: "absolute", 
        top: "3%",
        left: "5%",
        width: "90%",
        height: showPanel ? "67%" : "87%",
        borderRadius: "24px",
        overflow: "hidden",
        transition: "all 0.3s ease"
      }}>
        {/* Gradient overlay */}
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: "linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.4) 100%)",
          zIndex: 2,
          borderRadius: "24px"
        }} />
        
        {/* Camera switching button */}
        <button
          onClick={switchCamera}
          disabled={isCameraLoading || availableCameras.length <= 1}
          style={{
            position: "absolute",
            top: "15px",
            right: "15px",
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            color: "white",
            border: "none",
            borderRadius: "50%",
            width: "42px",
            height: "42px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            zIndex: 10,
            transition: "all 0.2s ease"
          }}
        >
          {isCameraLoading ? (
            <div style={{ 
              width: "20px", 
              height: "20px", 
              border: "2px solid rgba(255,255,255,0.2)", 
              borderTopColor: "white",
              borderRadius: "50%",
              animation: "spin 1s linear infinite"
            }} />
          ) : (
            <RefreshCw size={20} />
          )}
        </button>
        
        {/* Camera indicator */}
        <div style={{
          position: "absolute",
          top: "15px",
          left: "15px",
          backgroundColor: "rgba(0, 0, 0, 0.6)",
          color: "white",
          padding: "6px 12px",
          borderRadius: "20px",
          fontSize: "14px",
          fontWeight: "600",
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          <Smartphone size={16} />
          <span>Camera {currentCameraIndex + 1}/{availableCameras.length}</span>
        </div>
        
        {/* Camera Loading Indicator */}
        {isCameraLoading && (
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 5,
            borderRadius: "24px"
          }}>
            <div style={{ 
              width: "60px", 
              height: "60px", 
              border: "4px solid rgba(255,255,255,0.2)", 
              borderTopColor: "white",
              borderRadius: "50%",
              animation: "spin 1s linear infinite"
            }} />
          </div>
        )}
        
        {/* Fullscreen video */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      </div>
      
      {/* Canvas for drawing */}
      <canvas
        ref={canvasRef}
        width={window.innerWidth}
        height={window.innerHeight}
        style={{
          position: "absolute",
          top: "3%",
          left: "5%",
          backgroundColor: "transparent",
          zIndex: 5,
        }}
        
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
      />
      
      {/* Instructions Overlay */}
      {!drawingCoords.hasDrawing && !isCameraLoading && (
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          backgroundColor: "rgba(0, 0, 0, 0.6)",
          padding: "15px 30px",
          borderRadius: "12px",
          color: "white",
          fontSize: "16px",
          fontWeight: "500",
          zIndex: 10,
          textAlign: "center"
        }}>
          Draw a rectangle around the object you want to identify
        </div>
      )}
      
      {/* API Key Message */}
      {GEMINI_API_KEY === "YOUR_GEMINI_API_KEY_HERE" && (
        <div style={{
          position: "absolute",
          top: "10px",
          left: "50%",
          transform: "translateX(-50%)",
          backgroundColor: "rgba(254, 215, 170, 0.95)",
          color: "#9A3412",
          padding: "10px 20px",
          borderRadius: "8px",
          fontSize: "14px",
          fontWeight: "500",
          zIndex: 100,
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          <Info size={16} />
          <span>Please add your Gemini API key in the GEMINI_API_KEY variable at the top of the file</span>
        </div>
      )}
      
      {/* Button Container */}
      <div style={{
        position: "absolute",
        bottom: "20px",
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        gap: "15px",
        zIndex: 10
      }}>
        {/* Clear button */}
        {drawingCoords.hasDrawing && (
          <button
            style={{
              padding: "14px 28px",
              backgroundColor: "rgba(239, 68, 68, 0.8)", // Tailwind red-500 with transparency
              border: "none",
              borderRadius: "40px",
              color: "white",
              fontSize: "16px",
              fontWeight: "600",
              boxShadow: "0 10px 25px rgba(239, 68, 68, 0.3)",
              cursor: "pointer",
              transition: "all 0.3s ease",
              zIndex: 10,
              display: "flex",
              alignItems: "center",
              gap: "10px"
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = "rgba(220, 38, 38, 0.9)"; // Tailwind red-600
              e.target.style.transform = "translateY(-2px)";
              e.target.style.boxShadow = "0 14px 28px rgba(239, 68, 68, 0.4)";
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = "rgba(239, 68, 68, 0.8)";
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "0 10px 25px rgba(239, 68, 68, 0.3)";
            }}
            onClick={clearDrawing}
          >
            <X size={20} />
            <span>Clear</span>
          </button>
        )}
        
        {/* Search button with floating design */}
        <button
          style={{
            padding: "14px 32px",
            backgroundColor: "#3B82F6", // Tailwind blue-500
            border: "none",
            borderRadius: "40px",
            color: "white",
            fontSize: "16px",
            fontWeight: "600",
            boxShadow: "0 10px 25px rgba(59, 130, 246, 0.5)",
            cursor: "pointer",
            transition: "all 0.3s ease",
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            gap: "10px"
          }}
          onMouseOver={(e) => {
            e.target.style.backgroundColor = "#2563EB"; // Tailwind blue-600
            e.target.style.transform = "translateY(-2px)";
            e.target.style.boxShadow = "0 14px 28px rgba(59, 130, 246, 0.6)";
          }}
          onMouseOut={(e) => {
            e.target.style.backgroundColor = "#3B82F6"; // Tailwind blue-500
            e.target.style.transform = "translateY(0)";
            e.target.style.boxShadow = "0 10px 25px rgba(59, 130, 246, 0.5)";
          }}
          onClick={analyzeObjectWithGemini}
          disabled={isLoading || !drawingCoords.hasDrawing}
        >
          {isLoading ? "Analyzing..." : (
            <>
              <Camera size={20} />
              <span>Identify Object</span>
            </>
          )}
        </button>
      </div>
      
      {/* Modern Object Information Panel with glass morphism effect */}
      <div
        style={{
          position: "absolute",
          top: "73%",
          left: "5%",
          width: "90%",
          height: "20%",
          backgroundColor: "rgba(17, 24, 39, 0.85)", // Dark background with transparency
          backdropFilter: "blur(12px)", // Glass effect
          borderRadius: "24px",
          padding: "20px",
          color: "white",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)",
          transform: showPanel ? "translateY(0)" : "translateY(30px)",
          opacity: showPanel ? 1 : 0,
          transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column"
        }}
      >
        {objectInfo && !isLoading && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <Info size={20} color="#3B82F6" />
                <h3 style={{ margin: 0, fontSize: "22px", fontWeight: "700", color: "#F9FAFB" }}>{objectInfo.name}</h3>
              </div>
              <div style={{ 
                backgroundColor: objectInfo.confidence > 0.7 ? "rgba(16, 185, 129, 0.2)" : "rgba(251, 191, 36, 0.2)", 
                padding: "6px 12px", 
                borderRadius: "20px", 
                fontSize: "14px",
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}>
                {objectInfo.confidence > 0.7 ? <Check size={14} color="#10B981" /> : <X size={14} color="#F59E0B" />}
                <span style={{ color: objectInfo.confidence > 0.7 ? "#10B981" : "#F59E0B" }}>
                  {Math.round(objectInfo.confidence * 100)}% confidence
                </span>
              </div>
            </div>
            
            <p style={{ margin: "0 0 12px", fontSize: "15px", lineHeight: "1.6", color: "#E5E7EB", flex: 1, overflow: "auto" }}>
              {objectInfo.description}
            </p>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {objectInfo.categories && objectInfo.categories.length > 0 && (
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {objectInfo.categories.map((category, index) => (
                    <span
                      key={index}
                      style={{
                        backgroundColor: "rgba(59, 130, 246, 0.15)",
                        color: "#60A5FA",
                        padding: "4px 12px",
                        borderRadius: "16px",
                        fontSize: "13px",
                        fontWeight: "500"
                      }}
                    >
                      {category}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
        
        {isLoading && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%" }}>
            <div style={{ 
              width: "40px", 
              height: "40px", 
              border: "3px solid rgba(59, 130, 246, 0.1)", 
              borderRadius: "50%",
              borderTopColor: "#3B82F6",
              animation: "spin 1s infinite linear",
              marginBottom: "16px"
            }} />
            <style>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
              @keyframes pulse {
                0% { opacity: 0.6; }
                50% { opacity: 1; }
                100% { opacity: 0.6; }
              }
            `}</style>
            <p style={{ 
              margin: 0, 
              fontSize: "16px", 
              color: "#E5E7EB",
              animation: "pulse 1.5s infinite ease-in-out"
            }}>
              Analyzing with Gemini AI...
            </p>
          </div>
        )}
        
        {error && (
          <div style={{ 
            backgroundColor: "rgba(239, 68, 68, 0.1)", 
            color: "#F87171", 
            padding: "10px 15px",
            borderRadius: "8px", 
            fontSize: "14px",
            marginTop: "auto" 
          }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default Canvas;