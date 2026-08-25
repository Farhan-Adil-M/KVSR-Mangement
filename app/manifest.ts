import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KVSR Management",
    short_name: "KVSR",
    description: "Dr. K.V. Subba Reddy Institute of Technology - College Management System",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#021B43",
    orientation: "portrait-primary",
    scope: "/",
    icons: [
      {
        src: "/College_logo.jpg",
        sizes: "512x512",
        type: "image/jpeg",
        purpose: "maskable",
      },
    ],
  };
}
