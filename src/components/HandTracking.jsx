import React, { useRef, useEffect, useState } from "react";
import { Hands } from "@mediapipe/hands";
import { Camera } from "@mediapipe/camera_utils";

const HandDrawing = () => {
  const videoRef = useRef(null);
  const canvasVideoRef = useRef(null);
  const canvasDrawRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  let prevX = null, prevY = null;

  useEffect(() => {
    const videoElement = videoRef.current;
    const canvasVideo = canvasVideoRef.current;
    const canvasDraw = canvasDrawRef.current;
    const ctxVideo = canvasVideo.getContext("2d");
    const ctxDraw = canvasDraw.getContext("2d");

    const hands = new Hands({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    hands.onResults((results) => {
      ctxVideo.save();

      // Mirror effect for video
      ctxVideo.translate(canvasVideo.width, 0);
      ctxVideo.scale(-1, 1);

      // Clear previous frame and draw the new video frame
      ctxVideo.clearRect(0, 0, canvasVideo.width, canvasVideo.height);
      ctxVideo.drawImage(
        results.image,
        0,
        0,
        canvasVideo.width,
        canvasVideo.height
      );

      ctxVideo.restore();

      if (results.multiHandLandmarks) {
        results.multiHandLandmarks.forEach((landmarks) => {
          const x = canvasDraw.width - (landmarks[8].x * canvasDraw.width);

          const y = landmarks[8].y * canvasDraw.height;

          // Draw red dot at index finger tip
          ctxVideo.fillStyle = "red";
          ctxVideo.beginPath();
          ctxVideo.arc(x, y, 5, 0, 2 * Math.PI);
          ctxVideo.fill();

          // Persistent drawing logic (on second canvas)
          if (isDrawing) {
            ctxDraw.strokeStyle = "blue";
            ctxDraw.lineWidth = 5;
            ctxDraw.lineCap = "round";

            if (prevX !== null && prevY !== null) {
              ctxDraw.beginPath();
              ctxDraw.moveTo(prevX, prevY);
              ctxDraw.lineTo(x, y);
              ctxDraw.stroke();
            }

            prevX = x;
            prevY = y;
          } else {
            prevX = null;
            prevY = null;
          }
        });
      }
    });

    const camera = new Camera(videoElement, {
      onFrame: async () => {
        await hands.send({ image: videoElement });
      },
      width: 640,
      height: 480,
    });

    camera.start();

    return () => {
      hands.close();
    };
  }, [isDrawing]);

  return (
    <div style={{ position: "relative", width: "640px", height: "480px" }}>
      {/* Hidden video element */}
      <video ref={videoRef} autoPlay playsInline style={{ display: "none" }} />

      {/* Video Canvas (Updates Every Frame) */}
      <canvas
        ref={canvasVideoRef}
        width={640}
        height={480}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          zIndex: 1,
        }}
      />

      {/* Drawing Canvas (Persistent) */}
      <canvas
        ref={canvasDrawRef}
        width={640}
        height={480}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          zIndex: 2,
          pointerEvents: "none",
        }}
      />

      {/* Start/Stop Drawing Button */}
      <button
        onClick={() => setIsDrawing(!isDrawing)}
        style={{
          position: "absolute",
          zIndex: 3,
          bottom: 10,
          left: "50%",
          transform: "translateX(-50%)",
          padding: "10px 20px",
          background: isDrawing ? "red" : "green",
          color: "white",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
        }}
      >
        {isDrawing ? "Stop Drawing" : "Start Drawing"}
      </button>
    </div>
  );
};

export default HandDrawing;
