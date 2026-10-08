// Fullscreen triangle for the background. The three vertices sit outside the view and cover the
// whole clip square, so the shader needs no camera, no matrices and no index buffer. Three.js puts
// the `position` attribute declaration and the GLSL 3.00 version line in front of this source.
void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
