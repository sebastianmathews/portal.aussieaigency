import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Aussie AI Agency — Dashboard",
    short_name: "Aussie AI App",
    description:
      "Manage your AI receptionist, view calls, and track leads from your Aussie AI Agency dashboard.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0A1628",
    theme_color: "#0A1628",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
