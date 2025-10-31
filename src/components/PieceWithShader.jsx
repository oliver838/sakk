import React, { useRef, useEffect, useState } from "react";
import { motion, useAnimation } from "framer-motion";

export const PieceWithShader = ({
  piece,
  row,
  col,
  lastMove,
  squareSize,
  onClick,
  selected,
  isBeingHit,
  setIsAnimating,
}) => {
  const controls = useAnimation();
  const [isFlying, setIsFlying] = useState(false);
  const canvasRef = useRef(null);

  const baseColor = piece.color === "white" ? [1.0, 0.8, 1.0] : [0.5, 0.0, 0.5];
  const pieceTypeMap = {
    king: 5,
    queen: 4,
    rook: 3,
    bishop: 2,
    knight: 1,
    pawn: 0,
  };
  const typeIndex = pieceTypeMap[piece.type] ?? 0;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl2");
    if (!gl) return;

    const vertexShaderSource = `#version 300 es
    precision mediump float;
    in vec2 a_position;
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
    }`;

    const fragmentShaderSource = `#version 300 es
    precision highp float;
    out vec4 fragColor;

    uniform float u_time;
    uniform vec2 u_resolution;
    uniform vec3 u_color;
    uniform int u_type;

    // Random generator
    float rand(vec2 co){
      return fract(sin(dot(co.xy, vec2(12.9898,78.233))) * 43758.5453);
    }

    void main(){
      vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
      float t = u_time * 0.5;

      // Base glow
      float glow = exp(-length(uv) * 4.0);
      vec3 color = u_color * glow;

      // Type-specific intensity
      float intensity = float(u_type) / 5.0;

      // Lightning (for king and queen)
      if (u_type >= 4) {
        float lightning = step(0.95, rand(vec2(uv.x * 10.0, t)));
        color += vec3(1.0, 0.9, 0.5) * lightning * intensity;
      }

      // Dust particles (for pawns and knights)
      if (u_type <= 1) {
        for (int i = 0; i < 10; i++) {
          vec2 p = vec2(rand(vec2(float(i), t)), rand(vec2(float(i)*2.0, t)));
          float d = length(uv - p * 1.5 + vec2(0.2*sin(t), 0.1*cos(t)));
          color += vec3(0.8, 0.6, 0.9) * smoothstep(0.02, 0.0, d) * 0.4;
        }
      }

      // Shockwave (for rook, bishop)
      if (u_type == 2 || u_type == 3) {
        float wave = abs(sin(t*2.0)) * 0.5 + 0.5;
        float dist = abs(length(uv) - wave * 0.5);
        color += vec3(0.6, 0.4, 1.0) * smoothstep(0.02, 0.0, dist) * intensity;
      }

      fragColor = vec4(color, 1.0);
    }`;

    const createShader = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return shader;
    };

    const vertexShader = createShader(gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        -1, -1, 1, -1, -1, 1,
        -1, 1, 1, -1, 1, 1,
      ]),
      gl.STATIC_DRAW
    );

    gl.useProgram(program);
    const positionLoc = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(positionLoc);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

    const timeLoc = gl.getUniformLocation(program, "u_time");
    const resLoc = gl.getUniformLocation(program, "u_resolution");
    const colorLoc = gl.getUniformLocation(program, "u_color");
    const typeLoc = gl.getUniformLocation(program, "u_type");

    const start = performance.now();

    const render = () => {
      const time = (performance.now() - start) / 1000;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(timeLoc, time);
      gl.uniform2f(resLoc, canvas.width, canvas.height);
      gl.uniform3fv(colorLoc, baseColor);
      gl.uniform1i(typeLoc, typeIndex);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      requestAnimationFrame(render);
    };
    render();
  }, [piece.type, baseColor, typeIndex]);

  useEffect(() => {
    if (!lastMove) return;

    const isCurrentPiece = lastMove.pieceId === piece.id;
    if (isCurrentPiece) {
      setIsAnimating(true);
      const fromX = lastMove.fromCol * squareSize;
      const fromY = lastMove.fromRow * squareSize;
      const toX = lastMove.toCol * squareSize;
      const toY = lastMove.toRow * squareSize;

      setIsFlying(true);
      controls
        .start({
          x: [fromX, toX],
          y: [fromY, toY],
          scale: [1, 1.1, 1],
          transition: { duration: 0.8, ease: "easeInOut" },
        })
        .then(() => {
          setIsFlying(false);
          setIsAnimating(false);
        });
    }
  }, [lastMove, controls, squareSize, setIsAnimating, piece.id]);

  const initialX = col * squareSize;
  const initialY = row * squareSize;

  return (
    <motion.div
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      animate={controls}
      initial={{ x: initialX, y: initialY }}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: squareSize,
        height: squareSize,
        cursor: "pointer",
        zIndex: isFlying ? 10 : 5,
      }}
    >
      <canvas
        ref={canvasRef}
        width={squareSize}
        height={squareSize}
        style={{ position: "absolute", top: 0, left: 0, borderRadius: "50%" }}
      />
      <div
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontSize: squareSize * 0.8,
          color: piece.color === "white" ? "#fff" : "#a0a",
          textShadow: "0 0 10px #fff, 0 0 20px #f0f",
        }}
      >
        {piece.symbol}
      </div>
    </motion.div>
  );
};