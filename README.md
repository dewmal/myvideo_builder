# Remotion Prompt to Motion Graphics

<p align="center">
  <a href="https://github.com/remotion-dev/logo">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://github.com/remotion-dev/logo/raw/main/animated-logo-banner-dark.apng">
      <img alt="Animated Remotion Logo" src="https://github.com/remotion-dev/logo/raw/main/animated-logo-banner-light.gif">
    </picture>
  </a>
</p>

AI-powered motion graphics generator that transforms natural language prompts into Remotion code.

## Architecture

```
User Prompt → Validation → Skill Detection → Code Generation → Sanitization → Live Preview
```

## How It Works

### 1. Validation

Before expensive model calls, a lightweight classifier determines if the prompt describes valid motion graphics content.

**Accepted**: animated text, data visualizations, UI animations, social media content, abstract motion graphics

**Rejected**: questions, conversational requests, non-visual tasks

### 2. Skill Detection

The system analyzes the prompt to identify which **skills** are relevant. Skills are modular knowledge units that provide domain-specific guidance to the code generation model.

There are two types of skills:

- **Guidance Skills** - Pattern libraries with best practices for specific domains (charts, typography, transitions, etc.)
- **Example Skills** - Complete working code references that demonstrate specific animation patterns

This approach keeps the base prompt lightweight while dynamically injecting only the relevant expertise for each request.

### 3. Code Generation

Uses a one-shot prompt with the base Remotion knowledge plus any detected skills. The generated code follows these principles:

- **Constants-first design** - All text, colors, and timing values are declared as editable constants at the top
- **Aesthetic defaults** - Guidance on visual polish, spacing, and animation feel
- **Crossfade patterns** - Smooth state transitions without layout jumps
- **Spring physics** - Natural, organic motion using Remotion's spring() function

### 4. Sanitization & Compilation

The response is cleaned (removing markdown wrappers and trailing commentary), then compiled in-browser using Babel. The compiled component renders directly in the Remotion Preview with all necessary APIs injected.

## Skills System

Skills enable contextual expertise without bloating every prompt. Located in `src/skills/`:

Narrated videos automatically load the [clip-narration skill](src/skills/clip-narration/SKILL.md).
It plans short visual scenes and their spoken copy together in a `NARRATION_CLIPS`
manifest. The app synthesizes each scene separately with one shared voice description,
then sequences its audio within the matching visual boundaries. Preview and export
use the same assembled timeline. Invalid or incomplete scene timing produces an error
instead of attaching unrelated speech. Manual narration remains available as one track.

For example: “Create a 24-second explainer about solar energy with narration,
using four short scenes.” Generated visuals are assembled as Remotion sequences;
separate video files are not rendered for each scene.

### Guidance Skills

| Skill              | Purpose                                                                                 |
| ------------------ | --------------------------------------------------------------------------------------- |
| **charts**         | Data visualization patterns - bar charts, pie charts, axis labels, staggered animations |
| **typography**     | Kinetic text - typewriter effects, word carousels, text highlights                      |
| **messaging**      | Chat UI - bubble layouts, WhatsApp/iMessage styling, staggered entrances                |
| **transitions**    | Scene changes - TransitionSeries, fade/slide/wipe effects                               |
| **sequencing**     | Timing control - Sequence, TransitionSeries, staggered delays                                     |
| **spring-physics** | Organic motion - spring configs, bounce effects, chained animations                     |
| **social-media**   | Platform-specific formats - aspect ratios, safe zones                                   |
| **3d**             | Three.js integration - 3D scenes, camera setup                                          |

### Example Skills (Code Snippets)

Example skills provide complete working references (histogram, chat messages, typewriter effects, etc.) that demonstrate these patterns in action. We think of them like implementation archetypes that can be used and adjusted for the user prompt.

## Usage Tips

**Prompting best practices:**

- Be specific about colors, timing, and layout ("green sent bubbles on the right, gray received on the left")
- Include data directly in the prompt for charts and visualizations
- Describe the animation feel you want ("bouncy spring entrance", "smooth fade", "staggered timing")

**Images:**

- Direct image uploads are not supported
- Reference images via URL - the generated code will use Remotion's `<Img>` component
- Example: _"Create a DVD screensaver animation of this image https://example.com/logo.png"_

**What works well:**

- Kinetic typography and text animations
- Data visualizations with animated entrances
- Chat/messaging UI mockups
- Social media content (Stories, Reels, TikTok)
- Logo animations and brand intros
- Abstract motion graphics

## Commands

**Install Dependencies**

```console
npm i --loglevel=error
```

**Start Preview**

```console
npm run dev
```

**Render video**

```console
npx remotion render
```

**Upgrade Remotion**

```console
npx remotion upgrade
```

## Local Qwen3-TTS narration

The editor uses Qwen's Python inference runtime through a small local HTTP service. It loads the VoiceDesign model once and keeps it resident for later narration requests. The first load downloads the complete model files, including configuration and tokenizer files, from Hugging Face. See the [official Qwen3-TTS usage guide](https://github.com/QwenLM/Qwen3-TTS#voice-design) and [VoiceDesign model files](https://huggingface.co/Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign/tree/main).

Install the Python 3.12 environment and official runtime with uv:

```bash
uv sync
```

Start the resident inference service in one terminal:

```bash
uv run python scripts/qwen_tts_server.py
```

The service listens on `http://127.0.0.1:8091`. Start the Next.js app in another terminal with `npm run dev`. Include a voiceover or narration request and its style/details in the same video prompt. The app drafts spoken copy from that request, then synthesizes it with Qwen after the animation code is ready. It preserves explicit quoted dialogue. You can also use **Narration** beside the render controls for manual audio generation or download. The preview starts muted, so unmute the Player controls to hear it. Voiceover audio is attached to **Render & Download**.

The inference service uses CUDA with bfloat16 when an NVIDIA CUDA GPU is available. Without CUDA it falls back to CPU in float32, which is portable but much slower. The model location can be overridden with `QWEN_TTS_MODEL` if you have downloaded the complete model directory elsewhere. `QWEN_TTS_HOST` and `QWEN_TTS_PORT` configure the local service; set `QWEN_TTS_BASE_URL` in `.env` if you change the port or run the service on another reachable machine.

## Render progress

Local narration requests allow up to 15 minutes for inference and audio transfer. Set `QWEN_TTS_TIMEOUT_SECONDS` to a smaller positive number (maximum 900) to fail sooner. Restart Next.js after changing environment settings. Hosting providers may enforce shorter request limits regardless of this setting. If generation times out, check the Python terminal before retrying: the service may still be processing the original request.

**Render & Download** renders locally using Remotion's Node.js renderer. AWS credentials and Lambda deployment are not required. Run the app with `npm run dev`, then use the export button. The first render may download Remotion's bundled browser.

The `/api/render` endpoint starts a background Node.js worker and the browser polls `/api/render/progress`. MP4 files and render logs are stored in `out/renders/<render-id>/`; downloads are served by `/api/render/<render-id>`. Narration is included when attached to the animation. Delete old render directories when you no longer need them.

Local rendering requires a persistent Node.js server with writable disk and permission to launch a browser; serverless hosting is not supported by this local render path. The original Lambda endpoints remain available for a separate AWS deployment.

## Docs

Get started with Remotion by reading the [fundamentals page](https://www.remotion.dev/docs/the-fundamentals).

## Help

We provide help on our [Discord server](https://discord.gg/6VzzNDwUwV).

## Issues

Found an issue with Remotion? [File an issue here](https://github.com/remotion-dev/remotion/issues/new).

## License

Note that for some entities a company license is needed. [Read the terms here](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md).
