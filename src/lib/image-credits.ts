// Attribution for dossier hero images sourced from Wikimedia Commons.
// The CC BY / CC BY-SA licenses require crediting the author; the detail page
// renders a small credit line beneath the hero using this map (keyed by slug).
// CC0 is public-domain — credit is courtesy, not required.

export interface ImageCredit {
  artist: string;
  license: string;
  licenseUrl: string;
  source: string;
}

export const HERO_IMAGE_CREDITS: Record<string, ImageCredit> = {
  "jeff-the-killer": {
    artist: "LuxAmber",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    source: "https://commons.wikimedia.org/wiki/File:Jeff_the_Killer.jpg",
  },
  "smile-dog": {
    artist: "Thought Catalog",
    license: "CC BY 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0",
    source: "https://commons.wikimedia.org/wiki/File:Smile_Dog.png",
  },
  herobrine: {
    artist: "Fridelit (Wiki.gg)",
    license: "CC0",
    licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
    source: "https://commons.wikimedia.org/wiki/File:Herobrine02.png",
  },
  "the-rake": {
    artist: "PolePoz",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    source: "https://commons.wikimedia.org/wiki/File:TheRake2022.png",
  },
  "slender-man": {
    artist: "LuxAmber",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    source: "https://commons.wikimedia.org/wiki/File:Тонкий_человек.jpg",
  },
  "kuchisake-onna": {
    artist: "Tanapat",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    source: "https://commons.wikimedia.org/wiki/File:Ehon-Sayoshigure_Kuchisake_onna.jpg",
  },
};

export function heroImageCredit(slug: string): ImageCredit | null {
  return HERO_IMAGE_CREDITS[slug] ?? null;
}
