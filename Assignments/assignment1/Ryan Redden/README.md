# Ryan Redden - Assignment 1

**Live page:** [https://sjsu-cadre-classes.github.io/SJSU_Art_101_S26_01/Assignments/assignment1/Ryan%20Redden/index.html](https://sjsu-cadre-classes.github.io/SJSU_Art_101_S26_01/Assignments/assignment1/Ryan%20Redden/index.html)

---

## Poetics: ASCII as Digital Memory

This project uses ASCII not as a technical fallback but as a **poetic constraint**: a way to represent “digital memory” and presence that echoes *Solaris* and 1970s Soviet sci‑fi—low contrast, slow, and heavy on the “data” aesthetic.

**Why ASCII for memory?**

- **Reduction.** Memory is never a perfect copy; it’s a reduced, sampled version of experience. ASCII turns continuous tone and form into a finite set of characters. The sphere and the ocean are both “remembered” by the interface in this reduced alphabet—like consciousness compressing experience into symbols.

- **The terminal as subconscious.** The fixed terminal in the corner types cryptic, Solaris-style lines (“The ocean is probing your subconscious…”, “Memory detected: Reconstruction in progress.”). The monospace, phosphor-green text reads as a **station log** or **internal report**: the system describing its own state and the visitor’s presence. ASCII here is the language of the system’s “memory” of the user.

- **Calm vs. disturbed character sets.** Smooth characters (`. :-+*=`) map to calm interaction; noisy ones (`@#W$8%`) to higher mouse velocity. The **character set itself** becomes an emotional state. Memory is not only content but texture—and the shift from smooth to violent glyphs is that texture changing under stress.

- **Hover and morph.** Holding the cursor over the sphere for more than three seconds triggers a slow, noise-based morph of the geometry. The sphere “remembers” prolonged contact and deforms—**presence is written into the shape**. ASCII is the surface we see; the morph is the underlying “memory” of interaction made visible.

- **The ocean.** The background is a slowly shifting field of generative ASCII noise—a **protoplasmic ocean** of possible symbols. It doesn’t describe one thing; it suggests a medium (memory, data, subconscious) in which the central object floats and with which the visitor is implicitly in contact.

Overall: ASCII is used as the **alphabet of a sentient interface**—one that samples, compresses, and responds to the user, and that represents that relationship as a kind of digital memory: partial, symbolic, and mood-driven.

---

## Local development

This project uses ES modules (`type="module"`). To avoid CORS errors, run a local server from this folder:

**Option 1 – serve**
```bash
npm install
npm start
```
Then open http://localhost:3000 (or the port shown) and visit `index.html`, `page2.html`, or `page3.html`.

**Option 2 – Vite**
```bash
npm install
npm run dev
```
Then open the URL shown (e.g. http://localhost:5173).
