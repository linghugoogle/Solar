# Pale Blue Dot

> *"Look again at that dot. That's here. That's home. That's us."*
> — Carl Sagan

An immersive, highly performant 3D simulation of our Solar System, built with Three.js.

Designed not just as a technical demonstration, but as a philosophical experience. This project abandons arcade-like physics and crowded UIs in favor of scientific reverence. It employs logarithmic distance scaling to truly capture the overwhelming vastness, emptiness, and serene silence of deep space.

## Features

- **Profound Scale**: Distances and planetary radii are mathematically scaled to emphasize the immense void between celestial bodies.
- **Dynamic Starfield**: A custom-built 3D particle system featuring 5,000 uniquely generated stars with real-world color temperatures and depth parallax.
- **Cinematic Tracking**: Click any planet to trigger a GSAP-powered cinematic camera flight across the void. The camera will seamlessly lock onto the moving body while preserving your custom orbital perspective.
- **Serene Mechanics**: Orbital and rotational speeds are drastically reduced to convey the majestic, slow-moving reality of celestial mechanics.
- **Minimalist Aesthetic**: A pristine, distraction-free UI utilizing the sophisticated [Datatype](https://github.com/franktisellano/datatype) variable font.

## Technology Stack

- **[Three.js](https://threejs.org/)**: WebGL 3D rendering engine.
- **[GSAP](https://gsap.com/)**: Industry-standard animation library for buttery-smooth camera interpolations.
- **[Vite](https://vitejs.dev/)**: Next-generation frontend tooling for instant server starts and lightning-fast HMR.
- **TypeScript**: Strictly typed JavaScript for robust architecture.

## Installation & Usage

1. **Clone the repository**

   ```bash
   git clone https://github.com/linghugoogle/Solar
   cd Solar
   ```
2. **Install dependencies**

   ```bash
   npm install
   ```
3. **Ignite the universe**

   ```bash
   npm run dev
   ```

   *The cosmos will be available at `http://localhost:5173/`*
4. **Build for production**

   ```bash
   npm run build
   ```

## Controls

- **Left Click + Drag**: Orbit the camera around the current focal point.
- **Right Click + Drag**: Pan the camera through space.
- **Scroll Wheel**: Zoom in and out of the void.
- **Left Click (Planet)**: Engage auto-pilot to fly to and orbit the selected celestial body.
- **Left Click (Empty Space)**: Return focus to the Sun.

## License

This project is open-source and available under the [MIT License](LICENSE).

---

*Created to remind us of our place in the universe.*
