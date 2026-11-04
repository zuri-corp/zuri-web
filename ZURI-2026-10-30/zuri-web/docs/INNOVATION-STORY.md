# ZURI — Illustrated innovation story

19 October 2026. All eight artworks are AI-generated historical interpretations made with the built-in image-generation tool. They are decorative website assets, not archival photographs. Selected outputs are copied to public/artwork/history/.

## Visual direction

Landscape 16:9 website background illustration. Cohesive premium historical graphic-novel realism: almost photographic lighting and material detail with subtle painterly edges, cinematic scale, restrained natural colour, thoughtful composition, sophisticated realistic cartoon illustration, not children’s cartoons. No written text, lettering, logos, borders, montage or panels. Keep the focal subject center-right, leave softer dark atmospheric room on left for website copy. One scene only. 

## Final prompts

### Göbekli Tepe

Shared visual direction above, followed by:

Göbekli Tepe in southeastern Anatolia: recognizable circular dry-stone enclosures with monumental T-shaped limestone pillars, carved animal reliefs, low rocky hills and warm sunrise. Faithful appearance based on the archaeological site's surviving pillars, not Stonehenge and not fantasy pyramids. A few small prehistoric human figures beyond the stones; show human shared effort. No modern steel visitor canopy.

Asset: public/artwork/history/gobekli-tepe.png

### Learning to use fire

Shared visual direction above, followed by:

A prehistoric group carefully tending a small newly kindled fire at the mouth of a rock shelter at blue dusk. Focus on firelight reflected on thoughtful human faces, hands passing dry wood, knowledge shared across generations. Respectful realistic people with varied ages, natural hide garments, no caricature, no modern objects. An imagined moment of learning to harness fire, not a specific documented first discovery.

Asset: public/artwork/history/fire.png

### Taking to the water

Shared visual direction above, followed by:

Early human water travel: a small wooden coastal sailing boat and a simple dugout canoe on a luminous estuary at dawn, adults navigating and paddling together, shoreline settlements faintly visible. Natural wood, rope, modest linen-like cloth sail, credible human proportions, sea reflections. Focus on cooperation and opening a route across water. An evocative historical reconstruction, no precise invented date, no modern equipment.

Asset: public/artwork/history/water-travel.png

### Building the pyramids

Shared visual direction above, followed by:

A historically inspired reconstruction of ancient Egyptian pyramid building at Giza: an unfinished limestone pyramid with courses of blocks, teams of clothed skilled workers moving a stone block on a wooden sledge along a prepared earth ramp; water carrier and surveyor with rope. Golden early light and dusty atmosphere, Nile greenery distant. Human craft and organisation. No aliens, cranes, whips, violence, or fantasy machinery.

Asset: public/artwork/history/pyramid-builders.png

### Faith and sacrifice

Shared visual direction above, followed by:

A reverent non-graphic depiction of Jesus on the cross at Golgotha, viewed from a respectful middle distance, clothed in a simple linen loincloth, cross silhouetted against a quiet cloudy sky with a shaft of warm light. Jesus as a first-century Jewish man of the Levant. A few mourners at a distance. No blood, visible wounds, gore or sensationalism. Sacred, solemn and contemplative. Do not depict it as technological progress.

Asset: public/artwork/history/crucifixion.png

### Curiosity and discovery

Shared visual direction above, followed by:

An evocative illustration of young Isaac Newton sitting thoughtfully beneath an apple tree in an English garden inspired by Woolsthorpe Manor, seventeenth-century clothing, notebook in his lap, an apple resting in grass nearby, soft afternoon sunlight. Natural proportions, quiet curiosity, no apple hitting his head, no equations floating in sky. Acknowledged popular story as illustration, not documentary photography.

Asset: public/artwork/history/newton.png

### Courage and coordination

Shared visual direction above, followed by:

A sober illustrated reconstruction of D-Day Normandy Allied landing, 1944: view from inside an approaching landing craft over helmeted soldiers' backs toward a grey misty beach, distant landing craft and ships. Period-correct WWII equipment, overcast dawn, muted steel blues, respectful atmosphere emphasizing shared effort, risk and the human cost of war. No visible injuries, corpses, explosions near bodies, gore, triumphalist text or identifiable real individual's face.

Asset: public/artwork/history/d-day.png

### Reaching the Moon

Shared visual direction above, followed by:

Apollo 11 Moon landing, 1969: an astronaut in a historically recognizable white Apollo spacesuit on grey lunar regolith beside the gold-foil lunar module and a trail of bootprints, black sky and small Earth above horizon, sharply angled sunlight. Documentary-inspired scene composition but richly realistic illustrated painting, credible equipment, no impossible huge Earth, no stars in bright exposure, no extra fingers, no text or branding. Celebrate collective science.

Asset: public/artwork/history/moon-landing.png

## Historical reference points

- [UNESCO — Göbekli Tepe](https://whc.unesco.org/en/list/1572/): site identity and T-shaped pillars.
- [National Archives — D-Day](https://www.archives.gov/research/military/ww2/d-day): Normandy landings context.
- [NASA — Apollo 11](https://www.nasa.gov/mission/apollo-11/): lunar mission context.

The fire, water travel, pyramid construction and religious scenes are illustrative reconstructions. Newton’s apple-tree scene is a symbolic retelling.

## Interaction

The About hero crossfades every nine seconds. Eight named controls select a scene and pause autoplay. Pause/play is explicit. Autoplay stops when the tab is hidden and for reduced-motion preferences. The page headline now reads: The story of ZURI. A story of innovation. The existing corporate responsibility story and four commitments are retained.


## Verification

The production build, TypeScript and focused ESLint checks pass. All eight generated images were inspected and copied locally. Final browser QA was blocked by the browser URL policy while accessing the pre-existing failed-preview tab; no browser-policy workaround was attempted. The local production preview is running on port 3015.

Homepage update: Home and About now share src/lib/content/innovation-scenes.ts. The homepage replaces its four older artworks with all eight historical scenes, using an 80-second rotation with soft fades and its existing pause control and purple overlay.
