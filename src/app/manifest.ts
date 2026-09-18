import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AL-QISC — Al-Qur'an and Islamic Club",
    short_name: "AL-QISC",
    description: "The official Al-Qur'an and Islamic Club at Albukhary International University.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#34708d",
    icons: [
      { src: "/icon.png", sizes: "192x192", type: "image/png", purpose: "any" },
    ],
  };
}
