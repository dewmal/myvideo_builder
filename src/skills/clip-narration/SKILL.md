---
name: clip-narration
description: Generate narrated Remotion videos as short clips with scene-specific speech and assemble them on one shared timeline.
---

# Clip narration

Plan the complete video as short scenes, usually 4 to 10 seconds each. Keep one spoken idea per scene, preserving any supplied narration verbatim. Use a consistent voice and visual style throughout.

Inside the exported component, after hooks, declare a literal JSON array using this exact marker:

```text
const NARRATION_CLIPS = [{"startSeconds":0,"endSeconds":6,"text":"The first scene's spoken words."},{"startSeconds":6,"endSeconds":12,"text":"The second scene's spoken words."}];
```

Use double-quoted JSON keys and strings; no expressions, comments or trailing commas inside the array. Start at zero, keep boundaries contiguous, and end at the requested composition duration. The application adopts the completed plan duration for both visuals and speech; never create a separate timing table for audio. Each scene must have nonempty spoken text; aim for roughly two words per second. Never include production directions in spoken text.

Build each visual scene in its own Remotion Sequence using the same startSeconds/endSeconds boundaries multiplied by fps and rounded to frames. Scene animation uses local Sequence frames. Assemble all scenes inside the one exported component. Keep shared styling consistent. Do not add Audio: the application synthesizes each text separately and attaches speech at its matching scene boundary.

When editing, update the manifest and visual boundaries together. Preserve the manifest during unrelated edits. Avoid overlapping spoken scenes; use visual fades inside scene boundaries.
